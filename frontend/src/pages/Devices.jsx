import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDevice, fetchDashboardStats, fetchDevices } from '../services/api';
import { EQUIPMENT_TYPES, SECTORS, SECTOR_ALIASES, STATUS_COLORS, STATUS_OPTIONS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';

const cardStyle = { background: 'linear-gradient(180deg, rgba(24,24,24,.96), rgba(12,12,12,.96))', borderRadius: 22, border: '1px solid var(--panel-border)', boxShadow: '0 24px 55px rgba(0,0,0,.28)' };
const inputStyle = { padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', fontSize: 14, fontFamily: 'inherit', background: '#111', color: 'var(--text-primary)' };
const buttonBase = { border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: '10px 16px' };
const SORT_OPTIONS = [{ value: 'recent', label: 'Mais recentes' }, { value: 'name', label: 'Nome A-Z' }, { value: 'sector', label: 'Setor A-Z' }, { value: 'status', label: 'Status A-Z' }];

const normalizeSectorName = (sector) => (!sector ? 'Nao informado' : SECTOR_ALIASES[sector] || sector);
const sortDevices = (items, sortBy) => {
  const sorted = [...items];
  if (sortBy === 'name') return sorted.sort((a, b) => (a.nome_dispositivo || '').localeCompare(b.nome_dispositivo || ''));
  if (sortBy === 'sector') return sorted.sort((a, b) => (a.setor || '').localeCompare(b.setor || ''));
  if (sortBy === 'status') return sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  return sorted.sort((a, b) => (b.data_cadastro || '').localeCompare(a.data_cadastro || ''));
};

const downloadCsv = (rows) => {
  const headers = ['Tipo de Equipamento', 'Categoria', 'Marca', 'Modelo', 'Numero de Serie', 'Setor', 'Status', 'Ticket', 'Pessoa Atribuida', 'Data Cadastro'];
  const csvLines = [headers.join(';'), ...rows.map((d) => [d.nome_dispositivo, d.tipo, d.marca, d.modelo, d.numero_serie, d.setor, d.status, d.ticket, d.pessoa_atribuida, d.data_cadastro].map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(';'))];
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

const SectorChip = ({ active, label, count, onClick }) => (
  <button onClick={onClick} style={{ ...buttonBase, padding: '9px 14px', background: active ? 'linear-gradient(135deg,#f97316,#fb923c)' : '#161616', color: active ? '#111' : '#f8fafc', border: active ? 'none' : '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
    <span>{label}</span>
    <span style={{ minWidth: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(17,17,17,.14)' : 'rgba(249,115,22,.16)', color: active ? '#111' : '#fdba74', fontSize: 11 }}>{count}</span>
  </button>
);

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [baseDevices, setBaseDevices] = useState([]);
  const [stats, setStats] = useState(null);
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
      const [devicesResult, dashboardResult, allDevicesResult] = await Promise.all([
        fetchDevices({ ...filters, page: currentPage, limit: 15 }),
        fetchDashboardStats(),
        fetchDevices({ page: 1, limit: 1000 }),
      ]);
      setDevices(sortDevices(devicesResult.data || [], sortBy));
      setPagination(devicesResult.pagination || { total: 0, page: 1, totalPages: 1 });
      setStats(dashboardResult.data);
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
      const matchesSearch = !search || [item.nome_dispositivo, item.setor, item.numero_serie, item.marca, item.modelo, item.pessoa_atribuida]
        .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'all' || item.tipo === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
    setAllDevices(sortDevices(filtered, sortBy));
  }, [baseDevices, search, filterType, filterStatus, sortBy]);

  const sectorTotals = useMemo(() => {
    const totals = allDevices.reduce((acc, d) => {
      const sector = normalizeSectorName(d.setor);
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});
    return [{ name: 'all', label: 'Todos', value: allDevices.length }].concat(
      [...SECTORS, 'Nao informado'].filter((v, i, a) => a.indexOf(v) === i).map((name) => ({ name, label: name, value: totals[name] || 0 })).filter((item) => item.value > 0)
    );
  }, [allDevices]);

  const derivedStats = useMemo(() => {
    const isMaintenance = (status) => status === 'Em manutenção' || status === 'Em manutenÃ§Ã£o';
    return {
      active: allDevices.filter((item) => item.status === 'Ativo').length,
      maintenance: allDevices.filter((item) => isMaintenance(item.status)).length,
      inactive: allDevices.filter((item) => item.status === 'Inativo').length,
      ticketed: allDevices.filter((item) => item.ticket?.trim()).length,
      assigned: allDevices.filter((item) => item.tipo === 'Laptop' && item.pessoa_atribuida?.trim()).length,
    };
  }, [allDevices]);

  const topSector = useMemo(() => sectorTotals.filter((item) => item.name !== 'all').sort((a, b) => b.value - a.value)[0], [sectorTotals]);
  const recentMaintenance = useMemo(() => allDevices.filter((item) => item.ticket?.trim() || item.status === 'Em manutenção' || item.status === 'Em manutenÃ§Ã£o').slice(0, 5), [allDevices]);

  const handleFormClose = () => { setShowForm(false); setEditingDevice(null); };
  const handleFormSuccess = () => { handleFormClose(); loadInventoryData(); };
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try { await deleteDevice(deletingId); setDeletingId(null); loadInventoryData(); }
    catch (err) { setError(err.message || 'Erro ao excluir equipamento'); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 22 : 30, background: 'radial-gradient(circle at top right, rgba(249,115,22,.3), transparent 24%), linear-gradient(135deg,#090909 0%,#141414 54%,#241103 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Equipamentos</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 36, lineHeight: 1.06 }}>Controle operacional de equipamentos</h1>
            <p style={{ margin: 0, color: '#fed7aa', lineHeight: 1.7, fontSize: 14, maxWidth: 620 }}>Consulta, filtros, acompanhamento de manutencao e acoes da base em um unico painel.</p>
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
        <KpiCard label="Em manutencao" value={derivedStats.maintenance} helper="equipamentos que pedem atencao" />
        <KpiCard label="Laptops atribuidos" value={derivedStats.assigned} helper="rastreabilidade por responsavel" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, .75fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Localizacao rapida por setor</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Um clique para focar apenas o setor desejado e reduzir o tempo de procura.</p>
            </div>
            {topSector && <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.18)' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#fdba74', textTransform: 'uppercase' }}>Maior concentracao</div><div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: '#fff' }}>{topSector.label}</div><div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>{topSector.value} equipamento(s)</div></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {sectorTotals.map((sector) => <SectorChip key={sector.name} active={filterSector === sector.name} label={sector.label} count={sector.value} onClick={() => { setFilterSector(sector.name); setCurrentPage(1); }} />)}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Monitor operacional</h2>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Leitura mais direta do que precisa de acao.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(249,115,22,.16)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Com ticket</div><div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#fff' }}>{derivedStats.ticketed}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>chamados que podem exigir retorno ao time</div></div>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 700, textTransform: 'uppercase' }}>Inativos</div><div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#fff' }}>{derivedStats.inactive}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>itens fora de operacao na base filtrada</div></div>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 700, textTransform: 'uppercase' }}>Cobertura da base</div><div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#fff' }}>{stats?.percentual_ativos ?? 0}%</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>percentual geral de equipamentos ativos</div></div>
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Central de equipamentos</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Pesquisa mais completa, filtro por setor e tabela pronta para operacao do dia a dia.</p>
          </div>
          <div style={{ fontSize: 13, color: '#fdba74', fontWeight: 700 }}>{pagination.total} registro(s) encontrado(s)</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Buscar por nome, serie, setor, marca ou responsavel" style={inputStyle} />
          <select value={filterSector} onChange={(e) => { setFilterSector(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os setores</option>{SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os tipos</option>{EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={inputStyle}><option value="all">Todos os status</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>

        {(search || filterType !== 'all' || filterStatus !== 'all' || filterSector !== 'all') && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 16, background: '#111', border: '1px solid rgba(249,115,22,.12)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Filtros ativos para refinar a base e localizar mais rapido.</div>
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setFilterSector('all'); setSortBy('recent'); setCurrentPage(1); }} style={{ ...buttonBase, background: '#1c1c1c', color: '#fff', border: '1px solid rgba(255,255,255,.08)' }}>Limpar filtros</button>
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

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, .9fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Resumo da base filtrada</h2>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Leitura mais clara para o gestor identificar disponibilidade e risco.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Setor selecionado</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{filterSector === 'all' ? 'Todos os setores' : filterSector}</div></div>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Tipos visiveis</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{new Set(allDevices.map((item) => item.tipo).filter(Boolean)).size}</div></div>
            <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>Sem ticket</div><div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: '#fff' }}>{Math.max(allDevices.length - derivedStats.ticketed, 0)}</div></div>
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Fila de acompanhamento</h2>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens que merecem olhar mais proximo por manutencao ou ticket.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {recentMaintenance.length > 0 ? recentMaintenance.map((device) => (
              <div key={device.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.06)', background: '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{device.nome_dispositivo}</div><div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.setor || 'Sem setor'} • {device.numero_serie || 'Sem serie'}</div></div><StatusBadge status={device.status} /></div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#fdba74' }}>{device.ticket ? `Ticket ${device.ticket}` : 'Acompanhar status de manutencao'}</div>
              </div>
            )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum item em destaque no momento.</div>}
          </div>
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
