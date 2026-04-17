// ============================================================
// pages/Devices.jsx
// Pagina de listagem, busca e gerenciamento de equipamentos
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDevice, fetchDashboardStats, fetchDevices } from '../services/api';
import { EQUIPMENT_TYPES, SECTORS, STATUS_COLORS, STATUS_OPTIONS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 20,
  border: '1px solid #e2e8f0',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'name', label: 'Nome A-Z' },
  { value: 'sector', label: 'Setor A-Z' },
  { value: 'status', label: 'Status A-Z' },
];

const normalizeSectorName = (sector) => {
  if (!sector) return 'Nao informado';

  const aliases = {
    'Expedição': 'Expedicao',
    Expedicao: 'Expedicao',
    'Operações': 'Operacao',
    Operacoes: 'Operacao',
    'Operação': 'Operacao',
    Administracao: 'ADM',
    'Administração': 'ADM',
    Fulfillment: 'Fullfilment',
  };

  return aliases[sector] || sector;
};

const sortDevices = (items, sortBy) => {
  const sorted = [...items];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => (a.nome_dispositivo || '').localeCompare(b.nome_dispositivo || ''));
    case 'sector':
      return sorted.sort((a, b) => (a.setor || '').localeCompare(b.setor || ''));
    case 'status':
      return sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    case 'recent':
    default:
      return sorted.sort((a, b) => (b.data_cadastro || '').localeCompare(a.data_cadastro || ''));
  }
};

const downloadCsv = (rows) => {
  const headers = [
    'Nome',
    'Tipo',
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
    ...rows.map((device) =>
      [
        device.nome_dispositivo,
        device.tipo,
        device.marca,
        device.modelo,
        device.numero_serie,
        device.setor,
        device.status,
        device.ticket,
        device.pessoa_atribuida,
        device.data_cadastro,
      ]
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
        .join(';')
    ),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const KpiCard = ({ label, value, helper, accent }) => (
  <div style={{ ...cardStyle, padding: 20 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{value}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>{helper}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };

  return (
    <span
      style={{
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
};

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
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

      const [devicesResult, dashboardResult, allDevicesResult] = await Promise.all([
        fetchDevices({
          search: search || undefined,
          type: filterType !== 'all' ? filterType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page: currentPage,
          limit: 15,
        }),
        fetchDashboardStats(),
        fetchDevices({ page: 1, limit: 1000 }),
      ]);

      setDevices(sortDevices(devicesResult.data || [], sortBy));
      setPagination(devicesResult.pagination || { total: 0, page: 1, totalPages: 1 });
      setStats(dashboardResult.data);
      setAllDevices(allDevicesResult.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, currentPage, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(loadInventoryData, 250);
    return () => clearTimeout(timeout);
  }, [loadInventoryData]);

  const visibleSectorTotals = useMemo(() => {
    const totals = allDevices.reduce((acc, device) => {
      const sector = normalizeSectorName(device.setor);
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});

    return [...SECTORS, 'Nao informado']
      .filter((value, index, array) => array.indexOf(value) === index)
      .map((name) => ({ name, value: totals[name] || 0 }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [allDevices]);

  const derivedStats = useMemo(() => {
    const active = allDevices.filter((item) => item.status === 'Ativo').length;
    const maintenance = allDevices.filter((item) => item.status === 'Em manutenção').length;
    const ticketed = allDevices.filter((item) => item.ticket?.trim()).length;
    const assigned = allDevices.filter((item) => item.tipo === 'Laptop' && item.pessoa_atribuida?.trim()).length;

    return {
      active,
      maintenance,
      ticketed,
      assigned,
    };
  }, [allDevices]);

  const topSector = visibleSectorTotals[0];

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

  const buttonBase = {
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    padding: '10px 16px',
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        style={{
          ...cardStyle,
          padding: isMobile ? 22 : 28,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 54%, #0f766e 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ fontSize: 12, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Gestao operacional de ativos
            </div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 34, lineHeight: 1.1 }}>
              Controle visual, filtro rapido e acoes mais objetivas para o inventario
            </h1>
            <p style={{ margin: 0, color: '#dbeafe', lineHeight: 1.7, fontSize: 14 }}>
              Reorganizei a tela para facilitar leitura do volume, exportacao, priorizacao de manutencao e tomada de decisao por setor sem perder o CRUD principal.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={() => downloadCsv(sortDevices(allDevices, sortBy))} style={{ ...buttonBase, background: '#ffffff', color: '#0f172a' }}>
              Exportar CSV
            </button>
            <button onClick={() => { setEditingDevice(null); setShowForm(true); }} style={{ ...buttonBase, background: '#38bdf8', color: '#082f49' }}>
              Novo equipamento
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard label="Base total" value={stats?.total || allDevices.length} helper="volume geral do inventario" accent="#2563eb" />
        <KpiCard label="Ativos" value={derivedStats.active} helper="equipamentos disponiveis para operacao" accent="#16a34a" />
        <KpiCard label="Em manutencao" value={derivedStats.maintenance} helper="itens que exigem acompanhamento" accent="#f59e0b" />
        <KpiCard label="Com ticket" value={derivedStats.ticketed} helper="equipamentos associados a chamados" accent="#7c3aed" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Concentracao por setor</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Visao rapida da distribuicao dos equipamentos por area
              </p>
            </div>
            {topSector && (
              <div style={{ padding: '10px 14px', borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Maior concentracao</div>
                <div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{topSector.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: '#475569' }}>{topSector.value} equipamento(s)</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {visibleSectorTotals.map((sector) => (
              <div key={sector.name} style={{ padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>{sector.name}</div>
                <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{sector.value}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>ativos, estoque ou manutencao por setor</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Leituras importantes</h2>
          <p style={{ margin: '4px 0 18px', color: '#64748b', fontSize: 13 }}>
            Indicadores para o gestor agir mais rapido
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700, textTransform: 'uppercase' }}>Backlog de manutencao</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#9a3412' }}>{derivedStats.maintenance}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#9a3412' }}>prioridade para evitar indisponibilidade operacional</div>
            </div>
            <div style={{ padding: 16, borderRadius: 16, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: 12, color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>Tickets vinculados</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#5b21b6' }}>{derivedStats.ticketed}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#5b21b6' }}>bom para acompanhar SLA e reincidencia</div>
            </div>
            <div style={{ padding: 16, borderRadius: 16, background: '#ecfeff', border: '1px solid #a5f3fc' }}>
              <div style={{ fontSize: 12, color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>Laptops atribuidos</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#115e59' }}>{derivedStats.assigned}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#115e59' }}>rastreabilidade melhor para itens de uso pessoal</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Central de equipamentos</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              Busca, filtros, ordenacao e acoes operacionais em uma unica tabela
            </p>
          </div>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>
            {pagination.total} registro(s) encontrado(s)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, serie, setor, marca ou responsavel"
            style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit' }}
          />

          <select
            value={filterType}
            onChange={(event) => {
              setFilterType(event.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
          >
            <option value="all">Todos os tipos</option>
            {EQUIPMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
          >
            <option value="all">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {(search || filterType !== 'all' || filterStatus !== 'all') && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#475569' }}>
              Filtros ativos para refinar a leitura da base.
            </div>
            <button
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setFilterStatus('all');
                setSortBy('recent');
                setCurrentPage(1);
              }}
              style={{ ...buttonBase, background: '#f8fafc', color: '#334155', padding: '9px 14px' }}
            >
              Limpar filtros
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}>
            Erro: {error}
          </div>
        )}

        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Carregando base operacional...</div>
          ) : devices.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              Nenhum equipamento encontrado com os filtros atuais.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Equipamento', 'Tipo', 'Marca/Modelo', 'Serie', 'Setor', 'Status', 'Ticket', 'Responsavel', 'Acoes'].map((header) => (
                      <th key={header} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr key={device.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#fbfdff', borderTop: '1px solid #edf2f7' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{device.nome_dispositivo}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>Cadastro: {device.data_cadastro || '-'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>
                        {(TYPE_ICONS[device.tipo] || 'ITEM')} {device.tipo}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, color: '#334155' }}>{device.marca}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{device.modelo}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>{device.numero_serie}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#334155' }}>{device.setor}</td>
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={device.status} /></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: device.ticket ? '#7c2d12' : '#94a3b8', fontWeight: device.ticket ? 700 : 500 }}>
                        {device.ticket || 'Sem ticket'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#334155' }}>{device.pessoa_atribuida || '-'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setEditingDevice(device);
                              setShowForm(true);
                            }}
                            style={{ ...buttonBase, background: '#eff6ff', color: '#1d4ed8', padding: '8px 12px' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingId(device.id)}
                            style={{ ...buttonBase, background: '#fef2f2', color: '#dc2626', padding: '8px 12px' }}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Pagina {pagination.page} de {pagination.totalPages}
            </div>
            <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => page - 1)}
                style={{ ...buttonBase, background: '#f8fafc', color: '#334155', opacity: currentPage <= 1 ? 0.45 : 1, flex: isMobile ? 1 : 'initial' }}
              >
                Anterior
              </button>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
                style={{ ...buttonBase, background: '#0f172a', color: '#ffffff', opacity: currentPage >= pagination.totalPages ? 0.45 : 1, flex: isMobile ? 1 : 'initial' }}
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </section>

      {showForm && <DeviceForm device={editingDevice} onClose={handleFormClose} onSuccess={handleFormSuccess} />}

      {deletingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ ...cardStyle, padding: 28, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Confirmar exclusao</h3>
            <p style={{ margin: '10px 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
              Esta acao remove o equipamento da base e deve ser usada apenas quando o registro realmente nao precisa mais existir no inventario.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setDeletingId(null)} style={{ ...buttonBase, background: '#f8fafc', color: '#334155' }}>
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{ ...buttonBase, background: '#dc2626', color: '#ffffff', opacity: deleteLoading ? 0.6 : 1 }}
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
