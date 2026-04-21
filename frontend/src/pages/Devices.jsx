import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDevice, fetchDevices } from '../services/api';
import { EQUIPMENT_TYPES, SECTORS, STATUS_COLORS, STATUS_OPTIONS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';
import { normalizeSectorName, sortDevices } from '../utils/deviceHelpers';

const cardStyle = {
  background: 'linear-gradient(180deg, rgba(24,24,24,.96), rgba(12,12,12,.96))',
  borderRadius: 22,
  border: '1px solid var(--panel-border)',
  boxShadow: '0 24px 55px rgba(0,0,0,.28)',
};
const inputStyle = {
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,.08)',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#111',
  color: 'var(--text-primary)',
};
const buttonBase = {
  border: 'none',
  borderRadius: 12,
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
  <div style={{ ...cardStyle, padding: 20 }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: '#fff' }}>{value}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{helper}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: 'rgba(255,255,255,.08)', text: '#e5e7eb', border: 'rgba(255,255,255,.14)' };
  return <span style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{status}</span>;
};

const FilterChip = ({ active, label, count, onClick }) => (
  <button onClick={onClick} style={{ ...buttonBase, padding: '9px 14px', background: active ? 'linear-gradient(135deg,#f97316,#fb923c)' : '#161616', color: active ? '#111' : '#f8fafc', border: active ? 'none' : '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
    <span>{label}</span>
    <span style={{ minWidth: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(17,17,17,.14)' : 'rgba(249,115,22,.16)', color: active ? '#111' : '#fdba74', fontSize: 11 }}>{count}</span>
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
  const [selectedSectorPreview, setSelectedSectorPreview] = useState('all');
  const [equipmentQuickSearch, setEquipmentQuickSearch] = useState('');
  const [selectedQuickDeviceId, setSelectedQuickDeviceId] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const filters = { search: search || undefined, type: filterType !== 'all' ? filterType : undefined, status: filterStatus !== 'all' ? filterStatus : undefined, setor: filterSector !== 'all' ? filterSector : undefined };
      const [devicesResult, allDevicesResult] = await Promise.all([
        fetchDevices({ ...filters, page: currentPage, limit: 15 }),
        fetchDevices({ page: 1, limit: 1000 }),
      ]);
      setDevices(sortDevices(devicesResult.data || [], sortBy));
      setPagination(devicesResult.pagination || { total: 0, page: 1, totalPages: 1 });
      setBaseDevices(allDevicesResult.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterSector, currentPage, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(loadInventoryData, 250);
    return () => clearTimeout(timeout);
  }, [loadInventoryData]);

  useEffect(() => {
    const filtered = baseDevices.filter((item) => {
      const matchesSearch = !search || [item.nome_dispositivo, item.setor, item.numero_serie, item.marca, item.modelo, item.pessoa_atribuida].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'all' || item.tipo === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
    setAllDevices(sortDevices(filtered, sortBy));
  }, [baseDevices, search, filterType, filterStatus, sortBy]);

  const sectorTotals = useMemo(() => {
    const totals = allDevices.reduce((acc, device) => {
      const sector = normalizeSectorName(device.setor);
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});

    return [{ name: 'all', label: 'Todos', value: allDevices.length }].concat(
      [...SECTORS, 'Nao informado']
        .filter((value, index, list) => list.indexOf(value) === index)
        .map((name) => ({ name, label: name, value: totals[name] || 0 }))
        .filter((item) => item.value > 0)
    );
  }, [allDevices]);

  const derivedStats = useMemo(() => ({
    active: allDevices.filter((item) => item.status === 'Ativo').length,
    inactive: allDevices.filter((item) => item.status === 'Inativo').length,
    assigned: allDevices.filter((item) => item.tipo === 'Laptop' && String(item.pessoa_atribuida || '').trim()).length,
    sectorsVisible: new Set(allDevices.map((item) => normalizeSectorName(item.setor))).size,
  }), [allDevices]);

  const topSector = useMemo(() => sectorTotals.filter((item) => item.name !== 'all').sort((a, b) => b.value - a.value)[0], [sectorTotals]);

  const sectorPreviewDevices = useMemo(() => {
    const scoped = selectedSectorPreview === 'all' ? allDevices : allDevices.filter((device) => normalizeSectorName(device.setor) === selectedSectorPreview);
    return sortDevices(scoped, 'name').slice(0, 8);
  }, [allDevices, selectedSectorPreview]);

  const quickDeviceMatches = useMemo(() => {
    const term = equipmentQuickSearch.toLowerCase().trim();
    const scoped = term
      ? allDevices.filter((device) => [device.nome_dispositivo, device.numero_serie, device.marca, device.modelo].some((value) => String(value || '').toLowerCase().includes(term)))
      : allDevices;
    return sortDevices(scoped, 'name').slice(0, 12);
  }, [allDevices, equipmentQuickSearch]);

  const selectedQuickDevice = useMemo(() => allDevices.find((device) => device.id === selectedQuickDeviceId) || quickDeviceMatches[0] || null, [allDevices, quickDeviceMatches, selectedQuickDeviceId]);

  useEffect(() => {
    if (quickDeviceMatches.length > 0 && !quickDeviceMatches.some((device) => device.id === selectedQuickDeviceId)) {
      setSelectedQuickDeviceId(quickDeviceMatches[0].id);
    }
    if (quickDeviceMatches.length === 0) {
      setSelectedQuickDeviceId('');
    }
  }, [quickDeviceMatches, selectedQuickDeviceId]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadInventoryData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteDevice(deletingId);
      setDeletingId(null);
      loadInventoryData();
    } catch (err) {
      setError(err.message || 'Erro ao excluir equipamento');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 22 : 30, background: 'radial-gradient(circle at top right, rgba(249,115,22,.3), transparent 24%), linear-gradient(135deg,#090909 0%,#141414 54%,#241103 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Equipamentos</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 36, lineHeight: 1.06 }}>Controle operacional de equipamentos</h1>
            <p style={{ margin: 0, color: '#fed7aa', lineHeight: 1.7, fontSize: 14, maxWidth: 620 }}>Consulta, filtros e localizacao rapida da base para facilitar a operacao do dia a dia.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={() => downloadCsv(allDevices)} style={{ ...buttonBase, background: '#fff', color: '#111' }}>Exportar CSV</button>
            <button onClick={() => { setEditingDevice(null); setShowForm(true); }} style={{ ...buttonBase, background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#111' }}>Novo equipamento</button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard label="Base filtrada" value={pagination.total} helper="volume atual da consulta" />
        <KpiCard label="Ativos" value={derivedStats.active} helper="itens prontos para operacao" />
        <KpiCard label="Inativos" value={derivedStats.inactive} helper="equipamentos fora de operacao" />
        <KpiCard label="Laptops atribuidos" value={derivedStats.assigned} helper="rastreabilidade por responsavel" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Localizacao rapida por setor</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Ao clicar em um setor, veja rapidamente quais equipamentos estao alocados nele.</p>
            </div>
            {topSector && <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.18)' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#fdba74', textTransform: 'uppercase' }}>Maior concentracao</div><div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: '#fff' }}>{topSector.label}</div><div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{topSector.value} equipamento(s)</div></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {sectorTotals.map((sector) => <FilterChip key={sector.name} active={selectedSectorPreview === sector.name} label={sector.label} count={sector.value} onClick={() => { setSelectedSectorPreview(sector.name); setFilterSector(sector.name); setCurrentPage(1); }} />)}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {sectorPreviewDevices.length > 0 ? sectorPreviewDevices.map((device) => (
              <div key={device.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.06)', background: '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{device.nome_dispositivo}</div>
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
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Localizacao rapida por equipamento</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Busque um equipamento e visualize rapidamente seus principais dados operacionais.</p>
          </div>
          <input value={equipmentQuickSearch} onChange={(event) => setEquipmentQuickSearch(event.target.value)} placeholder="Buscar por nome, serie, marca ou modelo" style={{ ...inputStyle, width: '100%', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {quickDeviceMatches.map((device) => <FilterChip key={device.id} active={selectedQuickDevice?.id === device.id} label={device.nome_dispositivo} count={normalizeSectorName(device.setor).length > 10 ? '...' : normalizeSectorName(device.setor)} onClick={() => setSelectedQuickDeviceId(device.id)} />)}
          </div>
          {selectedQuickDevice ? (
            <div style={{ padding: 18, borderRadius: 16, background: '#111', border: '1px solid rgba(249,115,22,.16)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{selectedQuickDevice.nome_dispositivo}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{selectedQuickDevice.tipo} • {selectedQuickDevice.marca} {selectedQuickDevice.modelo}</div>
                </div>
                <StatusBadge status={selectedQuickDevice.status} />
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Setor</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: '#fff' }}>{normalizeSectorName(selectedQuickDevice.setor)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Serie</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: '#fff' }}>{selectedQuickDevice.numero_serie || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Responsavel</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: '#fff' }}>{selectedQuickDevice.pessoa_atribuida || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Ticket</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: '#fff' }}>{selectedQuickDevice.ticket || 'Sem ticket'}</div>
                </div>
              </div>
            </div>
          ) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum equipamento encontrado com esse filtro.</div>}
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Central de equipamentos</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Pesquisa mais completa, filtros e tabela pronta para a operacao do dia a dia.</p>
          </div>
          <div style={{ fontSize: 13, color: '#fdba74', fontWeight: 700 }}>{pagination.total} registro(s) encontrado(s)</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Buscar por nome, serie, setor, marca ou responsavel" style={inputStyle} />
          <select value={filterSector} onChange={(e) => { setFilterSector(e.target.value); setSelectedSectorPreview(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os setores</option>{SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os tipos</option>{EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os status</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>

        {(search || filterType !== 'all' || filterStatus !== 'all' || filterSector !== 'all') && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 16, background: '#111', border: '1px solid rgba(249,115,22,.12)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Filtros ativos para refinar a base e localizar mais rapido.</div>
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterSector('all'); setSelectedSectorPreview('all'); setSortBy('recent'); setCurrentPage(1); }} style={{ ...buttonBase, background: '#1c1c1c', color: '#fff', border: '1px solid rgba(255,255,255,.08)' }}>Limpar filtros</button>
          </div>
        )}

        {error && <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.28)', color: '#fecaca', fontSize: 13 }}>Erro: {error}</div>}

        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
          {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', background: '#111' }}>Carregando base operacional...</div> : devices.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', background: '#111' }}>Nenhum equipamento encontrado com os filtros atuais.</div> : (
            <div style={{ overflowX: 'auto', background: '#111' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
                <thead><tr style={{ background: '#191919' }}>{['Tipo de Equipamento', 'Categoria', 'Marca/Modelo', 'Serie', 'Setor', 'Status', 'Ticket', 'Responsavel', 'Acoes'].map((header) => <th key={header} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '.06em' }}>{header}</th>)}</tr></thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr key={device.id} style={{ background: index % 2 === 0 ? '#111' : '#151515', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                      <td style={{ padding: '14px 16px' }}><div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{device.nome_dispositivo}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>Cadastro: {device.data_cadastro || '-'}</div></td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#e5e7eb', whiteSpace: 'nowrap' }}>{(TYPE_ICONS[device.tipo] || 'ITEM')} {device.tipo}</td>
                      <td style={{ padding: '14px 16px' }}><div style={{ fontSize: 13, color: '#e5e7eb' }}>{device.marca}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.modelo}</div></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#f8fafc', fontFamily: 'monospace' }}>{device.numero_serie}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#e5e7eb' }}>{device.setor}</td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={device.status} /></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: device.ticket ? '#fdba74' : '#71717a', fontWeight: device.ticket ? 700 : 500 }}>{device.ticket || 'Sem ticket'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#e5e7eb' }}>{device.pessoa_atribuida || '-'}</td>
                      <td style={{ padding: '14px 16px' }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setEditingDevice(device); setShowForm(true); }} style={{ ...buttonBase, background: 'rgba(249,115,22,.12)', color: '#fdba74', padding: '8px 12px', border: '1px solid rgba(249,115,22,.18)' }}>Editar</button>
                        <button onClick={() => setDeletingId(device.id)} style={{ ...buttonBase, background: 'rgba(239,68,68,.12)', color: '#fca5a5', padding: '8px 12px', border: '1px solid rgba(239,68,68,.18)' }}>Excluir</button>
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
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)} style={{ ...buttonBase, background: '#1c1c1c', color: '#fff', opacity: currentPage <= 1 ? .45 : 1, flex: isMobile ? 1 : 'initial' }}>Anterior</button>
              <button disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((page) => page + 1)} style={{ ...buttonBase, background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#111', opacity: currentPage >= pagination.totalPages ? .45 : 1, flex: isMobile ? 1 : 'initial' }}>Proxima</button>
            </div>
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, padding: 22 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Resumo da consulta</h2>
        <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Indicadores diretos da base atualmente filtrada.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Setor selecionado</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{filterSector === 'all' ? 'Todos os setores' : filterSector}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Tipos visiveis</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{new Set(allDevices.map((item) => item.tipo).filter(Boolean)).size}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Setores visiveis</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{derivedStats.sectorsVisible}</div></div>
          <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Itens nesta pagina</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{devices.length}</div></div>
        </div>
      </section>

      {showForm && <DeviceForm device={editingDevice} onClose={handleFormClose} onSuccess={handleFormSuccess} />}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ ...cardStyle, padding: 28, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>Confirmar exclusao</h3>
            <p style={{ margin: '10px 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>Esta acao remove o equipamento da base. Use apenas quando o registro realmente nao precisar mais existir no inventario.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setDeletingId(null)} style={{ ...buttonBase, background: '#1c1c1c', color: '#fff' }}>Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} style={{ ...buttonBase, background: '#dc2626', color: '#fff', opacity: deleteLoading ? .6 : 1 }}>{deleteLoading ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
