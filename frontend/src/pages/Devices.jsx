import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDevice } from '../services/api';
import { getInventoryDevices, invalidateInventoryCache } from '../services/inventoryCache';
import { EQUIPMENT_TYPES, SECTORS, STATUS_COLORS, STATUS_OPTIONS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';
import { isMaintenanceStatus, normalizeSectorName, sortDevices } from '../utils/deviceHelpers';

const cardStyle = {
  background: 'var(--panel-bg)',
  borderRadius: 24,
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--shadow-md)',
  backdropFilter: 'blur(10px)',
};
const labelAccentColor = '#d97706';

const inputStyle = {
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.24)',
  fontSize: 14,
  fontFamily: 'inherit',
  background: 'rgba(255,255,255,0.9)',
  color: 'var(--text-primary)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset',
};

const buttonBase = {
  border: 'none',
  borderRadius: 14,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  padding: '10px 16px',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'name', label: 'Nome A-Z' },
  { value: 'sector', label: 'Setor A-Z' },
  { value: 'status', label: 'Status A-Z' },
];

const downloadCsv = (rows) => {
  const headers = [
    'Tipo de Equipamento',
    'Categoria',
    'Marca',
    'Modelo',
    'Numero de Serie',
    'Setor',
    'Status',
    'Ticket',
    'Pessoa Atribuida',
    'Data Cadastro',
  ];
  const csvLines = [
    headers.join(';'),
    ...rows.map((d) =>
      [
        d.nome_dispositivo,
        d.tipo,
        d.marca,
        d.modelo,
        d.numero_serie,
        d.setor,
        d.status,
        d.ticket,
        d.pessoa_atribuida,
        d.data_cadastro,
      ]
        .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(';')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventario-shopee-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const KpiCard = ({ label, value, helper }) => (
  <div style={{ ...cardStyle, padding: 22 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: labelAccentColor, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    <div style={{ marginTop: 12, fontSize: 30, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{helper}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f8fafc', text: '#334155', border: 'rgba(148,163,184,0.2)' };
  return <span style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{status}</span>;
};

const FilterChip = ({ active, label, count, onClick }) => (
  <button onClick={onClick} style={{ ...buttonBase, padding: '9px 14px', background: active ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.7)', color: active ? '#ffffff' : 'var(--text-secondary)', border: active ? 'none' : '1px solid rgba(148,163,184,0.22)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: active ? '0 12px 28px rgba(29,78,216,0.16)' : 'none' }}>
    <span>{label}</span>
    <span style={{ minWidth: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(219,234,254,0.9)', color: active ? '#ffffff' : 'var(--brand)', fontSize: 11 }}>{count}</span>
  </button>
);

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [baseDevices, setBaseDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSectorPreview, setSelectedSectorPreview] = useState('');
  const [equipmentQuickSearch, setEquipmentQuickSearch] = useState('');
  const [selectedQuickType, setSelectedQuickType] = useState('');
  const pageSize = 15;
  const showQuickLookup = false;
  const showConsultationSummary = false;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadInventoryData = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError('');
      const inventoryDevices = await getInventoryDevices(options);
      setBaseDevices(inventoryDevices);
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  useEffect(() => {
    const filtered = baseDevices.filter((item) => {
      const matchesSearch = !search || [item.nome_dispositivo, item.setor, item.numero_serie, item.marca, item.modelo, item.pessoa_atribuida].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'all' || item.tipo === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesSector = filterSector === 'all' || normalizeSectorName(item.setor) === filterSector;
      return matchesSearch && matchesType && matchesStatus && matchesSector;
    });
    const sortedDevices = sortDevices(filtered, sortBy);
    const total = sortedDevices.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;

    setAllDevices(sortedDevices);
    setDevices(sortedDevices.slice(startIndex, startIndex + pageSize));
    setPagination({ total, page: safePage, totalPages });
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [baseDevices, search, filterType, filterStatus, filterSector, sortBy, currentPage]);

  const sectorTotals = useMemo(() => {
    const totals = allDevices.reduce((acc, device) => {
      const sector = normalizeSectorName(device.setor);
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});

    return [...SECTORS, 'Nao informado']
      .filter((value, index, list) => list.indexOf(value) === index)
      .map((name) => ({ name, label: name, value: totals[name] || 0 }))
      .filter((item) => item.value > 0);
  }, [allDevices]);

  const derivedStats = useMemo(() => ({
    active: allDevices.filter((item) => item.status === 'Ativo').length,
    inactive: allDevices.filter((item) => item.status === 'Inativo').length,
    maintenance: allDevices.filter((item) => isMaintenanceStatus(item.status)).length,
    assigned: allDevices.filter((item) => item.tipo === 'Laptop' && String(item.pessoa_atribuida || '').trim()).length,
    sectorsVisible: new Set(allDevices.map((item) => normalizeSectorName(item.setor))).size,
  }), [allDevices]);

  const topSector = useMemo(() => [...sectorTotals].sort((a, b) => b.value - a.value)[0], [sectorTotals]);

  const sectorPreviewDevices = useMemo(() => {
    if (!selectedSectorPreview) return [];
    const scoped = allDevices.filter((device) => normalizeSectorName(device.setor) === selectedSectorPreview);
    return sortDevices(scoped, 'name').slice(0, 8);
  }, [allDevices, selectedSectorPreview]);

  const quickDeviceGroups = useMemo(() => {
    const term = equipmentQuickSearch.toLowerCase().trim();
    const scoped = term
      ? allDevices.filter((device) => [device.nome_dispositivo, device.numero_serie, device.marca, device.modelo].some((value) => String(value || '').toLowerCase().includes(term)))
      : allDevices;

    const grouped = scoped.reduce((acc, device) => {
      const type = device.nome_dispositivo || device.tipo || 'Nao informado';

      if (!acc[type]) {
        acc[type] = { type, count: 0, devices: [] };
      }

      acc[type].count += 1;
      acc[type].devices.push(device);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        devices: sortDevices(group.devices, 'name'),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [allDevices, equipmentQuickSearch]);

  const selectedQuickGroup = useMemo(() => quickDeviceGroups.find((group) => group.type === selectedQuickType) || quickDeviceGroups[0] || null, [quickDeviceGroups, selectedQuickType]);
  const selectedQuickDevice = useMemo(() => selectedQuickGroup?.devices?.[0] || null, [selectedQuickGroup]);

  useEffect(() => {
    if (quickDeviceGroups.length > 0 && !quickDeviceGroups.some((group) => group.type === selectedQuickType)) {
      setSelectedQuickType(quickDeviceGroups[0].type);
    }
    if (quickDeviceGroups.length === 0) {
      setSelectedQuickType('');
    }
  }, [quickDeviceGroups, selectedQuickType]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    invalidateInventoryCache();
    loadInventoryData({ force: true });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteDevice(deletingId);
      setDeletingId(null);
      invalidateInventoryCache();
      loadInventoryData({ force: true });
    } catch (err) {
      setError(err.message || 'Erro ao excluir equipamento');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 24 : 30, background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 48%, rgba(219,234,254,0.88) 100%)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: labelAccentColor, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Equipamentos</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 30 : 40, lineHeight: 1.04, letterSpacing: '-0.03em' }}>Controle operacional de equipamentos</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15, maxWidth: 620 }}>Consulta da base com filtros por setor, tipo e status para encontrar rapidamente a informacao que precisa.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={() => downloadCsv(allDevices)} style={{ ...buttonBase, background: '#ffffff', color: 'var(--text-primary)', border: '1px solid rgba(148,163,184,0.22)', boxShadow: 'var(--shadow-sm)' }}>Exportar CSV</button>
            <button onClick={() => { setEditingDevice(null); setShowForm(true); }} style={{ ...buttonBase, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#ffffff', boxShadow: '0 14px 30px rgba(29,78,216,0.18)' }}>Novo equipamento</button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard label="Base filtrada" value={pagination.total} helper="volume atual da consulta" />
        <KpiCard label="Ativos" value={derivedStats.active} helper="itens prontos para operacao" />
        <KpiCard label="Em manutencao" value={derivedStats.maintenance} helper="itens filtrados nessa condicao" />
        <KpiCard label="Inativos" value={derivedStats.inactive} helper="equipamentos fora de operacao" />
      </section>

      {showQuickLookup && <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Localizacao rapida por setor</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Ao clicar em um setor, abra ou feche os equipamentos alocados nele.</p>
            </div>
            {topSector && <div style={{ padding: '12px 14px', borderRadius: 16, background: '#fff7ed', border: '1px solid rgba(245,158,11,0.18)' }}><div style={{ fontSize: 11, fontWeight: 700, color: labelAccentColor, textTransform: 'uppercase' }}>Maior concentracao</div><div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{topSector.label}</div><div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{topSector.value} equipamento(s)</div></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {sectorTotals.map((sector) => <FilterChip key={sector.name} active={selectedSectorPreview === sector.name} label={sector.label} count={sector.value} onClick={() => { const nextSector = selectedSectorPreview === sector.name ? '' : sector.name; setSelectedSectorPreview(nextSector); setFilterSector(nextSector || 'all'); setCurrentPage(1); }} />)}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {!selectedSectorPreview ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Selecione um setor para abrir os equipamentos dele.</div> : sectorPreviewDevices.length > 0 ? sectorPreviewDevices.map((device) => (
              <div key={device.id} style={{ padding: '15px 16px', borderRadius: 16, border: '1px solid rgba(148,163,184,0.14)', background: 'var(--panel-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{device.nome_dispositivo}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo} • {device.numero_serie || 'Sem serie'}</div>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              </div>
            )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum equipamento encontrado para o setor selecionado.</div>}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Localizacao rapida por equipamento</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Busque por equipamento e veja os tipos disponiveis, sem repetir item por item.</p>
          </div>
          <input value={equipmentQuickSearch} onChange={(event) => setEquipmentQuickSearch(event.target.value)} placeholder="Buscar por nome, serie, marca ou modelo" style={{ ...inputStyle, width: '100%', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {quickDeviceGroups.map((group) => <FilterChip key={group.type} active={selectedQuickGroup?.type === group.type} label={group.type} count={group.count} onClick={() => setSelectedQuickType(group.type)} />)}
          </div>
          {selectedQuickDevice ? (
            <div style={{ padding: 20, borderRadius: 18, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedQuickDevice.nome_dispositivo}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{selectedQuickDevice.tipo} • {selectedQuickDevice.marca} {selectedQuickDevice.modelo}</div>
                </div>
                <StatusBadge status={selectedQuickDevice.status} />
              </div>
              <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 12, background: '#fff7ed', border: '1px solid rgba(245,158,11,0.14)', fontSize: 13, color: labelAccentColor }}>
                {selectedQuickGroup.count} equipamento(s) encontrado(s) para {selectedQuickGroup.type}
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: labelAccentColor, textTransform: 'uppercase' }}>Setor</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-primary)' }}>{normalizeSectorName(selectedQuickDevice.setor)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: labelAccentColor, textTransform: 'uppercase' }}>Serie</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-primary)' }}>{selectedQuickDevice.numero_serie || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: labelAccentColor, textTransform: 'uppercase' }}>Responsavel</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-primary)' }}>{selectedQuickDevice.pessoa_atribuida || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: labelAccentColor, textTransform: 'uppercase' }}>Ticket</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-primary)' }}>{selectedQuickDevice.ticket || 'Sem ticket'}</div>
                </div>
              </div>
            </div>
          ) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum equipamento encontrado com esse filtro.</div>}
        </div>
      </section>}

      <section style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Central de equipamentos</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Pesquisa mais completa, filtros e tabela pronta para a operacao do dia a dia.</p>
          </div>
          <div style={{ fontSize: 13, color: labelAccentColor, fontWeight: 700 }}>{pagination.total} registro(s) encontrado(s)</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Buscar por nome, serie, setor, marca ou responsavel" style={inputStyle} />
          <select value={filterSector} onChange={(e) => { const nextSector = e.target.value; setFilterSector(nextSector); setSelectedSectorPreview(nextSector === 'all' ? '' : nextSector); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os setores</option>{SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os tipos</option>{EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os status</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>

        {(search || filterType !== 'all' || filterStatus !== 'all' || filterSector !== 'all') && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid rgba(148,163,184,0.18)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Filtros ativos para refinar a base e localizar mais rapido.</div>
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterSector('all'); setSelectedSectorPreview(''); setSortBy('recent'); setCurrentPage(1); }} style={{ ...buttonBase, background: '#ffffff', color: 'var(--text-primary)', border: '1px solid rgba(148,163,184,0.22)' }}>Limpar filtros</button>
          </div>
        )}

        {error && <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c', fontSize: 13 }}>Erro: {error}</div>}

        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.18)' }}>
          {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>Carregando base operacional...</div> : devices.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>Nenhum equipamento encontrado com os filtros atuais.</div> : (
            <div style={{ overflowX: 'auto', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
                <thead><tr style={{ background: '#f8fafc' }}>{['Tipo de Equipamento', 'Categoria', 'Marca/Modelo', 'Serie', 'Setor', 'Status', 'Ticket', 'Responsavel', 'Acoes'].map((header) => <th key={header} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: labelAccentColor, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid rgba(148,163,184,0.18)' }}>{header}</th>)}</tr></thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr key={device.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#fbfdff', borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                      <td style={{ padding: '14px 16px' }}><div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{device.nome_dispositivo}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>Cadastro: {device.data_cadastro || '-'}</div></td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{(TYPE_ICONS[device.tipo] || 'ITEM')} {device.tipo}</td>
                      <td style={{ padding: '14px 16px' }}><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{device.marca}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.modelo}</div></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{device.numero_serie}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{device.setor}</td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={device.status} /></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: device.ticket ? '#b45309' : '#94a3b8', fontWeight: device.ticket ? 700 : 500 }}>{device.ticket || 'Sem ticket'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{device.pessoa_atribuida || '-'}</td>
                      <td style={{ padding: '14px 16px' }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setEditingDevice(device); setShowForm(true); }} style={{ ...buttonBase, background: '#eff6ff', color: 'var(--brand)', padding: '8px 12px', border: '1px solid rgba(59,130,246,0.16)' }}>Editar</button>
                        <button onClick={() => setDeletingId(device.id)} style={{ ...buttonBase, background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.16)' }}>Excluir</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pagina {pagination.page} de {pagination.totalPages}</div>
            <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)} style={{ ...buttonBase, background: '#ffffff', color: 'var(--text-primary)', border: '1px solid rgba(148,163,184,0.22)', opacity: currentPage <= 1 ? .45 : 1, flex: isMobile ? 1 : 'initial' }}>Anterior</button>
              <button disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((page) => page + 1)} style={{ ...buttonBase, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#ffffff', opacity: currentPage >= pagination.totalPages ? .45 : 1, flex: isMobile ? 1 : 'initial' }}>Proxima</button>
            </div>
          </div>
        )}
      </section>

      {showConsultationSummary && <section style={{ ...cardStyle, padding: 22 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Resumo da consulta</h2>
        <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Indicadores diretos da base atualmente filtrada.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}><div style={{ fontSize: 12, color: labelAccentColor, fontWeight: 700, textTransform: 'uppercase' }}>Setor selecionado</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{filterSector === 'all' ? 'Todos os setores' : filterSector}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}><div style={{ fontSize: 12, color: labelAccentColor, fontWeight: 700, textTransform: 'uppercase' }}>Tipos visiveis</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{new Set(allDevices.map((item) => item.tipo).filter(Boolean)).size}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}><div style={{ fontSize: 12, color: labelAccentColor, fontWeight: 700, textTransform: 'uppercase' }}>Setores visiveis</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{derivedStats.sectorsVisible}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}><div style={{ fontSize: 12, color: labelAccentColor, fontWeight: 700, textTransform: 'uppercase' }}>Itens nesta pagina</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{devices.length}</div></div>
        </div>
      </section>}

      {showForm && <DeviceForm device={editingDevice} onClose={handleFormClose} onSuccess={handleFormSuccess} />}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ ...cardStyle, padding: 28, maxWidth: 420, width: '100%', background: '#ffffff' }}>
            <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Confirmar exclusao</h3>
            <p style={{ margin: '10px 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>Esta acao remove o equipamento da base. Use apenas quando o registro realmente nao precisar mais existir no inventario.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setDeletingId(null)} style={{ ...buttonBase, background: '#ffffff', color: 'var(--text-primary)', border: '1px solid rgba(148,163,184,0.22)' }}>Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} style={{ ...buttonBase, background: '#dc2626', color: '#ffffff', opacity: deleteLoading ? .6 : 1 }}>{deleteLoading ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
