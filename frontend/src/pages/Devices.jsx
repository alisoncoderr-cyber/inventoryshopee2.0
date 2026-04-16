// ============================================================
// pages/Devices.jsx
// Pagina de listagem, busca e gerenciamento de equipamentos
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDevice, fetchDashboardStats, fetchDevices } from '../services/api';
import { EQUIPMENT_TYPES, SECTORS, STATUS_COLORS, STATUS_OPTIONS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };

  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
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

const SECTOR_ALIASES = {
  Expedicao: 'Expedicao',
  'Expedição': 'Expedicao',
  Operacoes: 'Operacao',
  'Operações': 'Operacao',
  'Operação': 'Operacao',
  Administracao: 'ADM',
  'Administração': 'ADM',
  Fulfillment: 'Fullfilment',
};

const normalizeSectorName = (sector) => {
  if (!sector) return 'Nao informado';
  return SECTOR_ALIASES[sector] || sector;
};

const MagnifierIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" stroke="#64748b" strokeWidth="1.4" />
    <path d="M10.5 10.5L14 14" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [sectorDevices, setSectorDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [sectorTotals, setSectorTotals] = useState([]);
  const [expandedSector, setExpandedSector] = useState(null);
  const [expandedSectorDeviceId, setExpandedSectorDeviceId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [search, setSearch] = useState('');
  const [sectorSearch, setSectorSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchDevices({
        search: search || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        page: currentPage,
        limit: 15,
      });
      setDevices(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, currentPage]);

  useEffect(() => {
    const timeout = setTimeout(loadDevices, 300);
    return () => clearTimeout(timeout);
  }, [loadDevices]);

  useEffect(() => {
    const loadSectorTotals = async () => {
      try {
        const [statsResult, devicesResult] = await Promise.all([
          fetchDashboardStats(),
          fetchDevices({ page: 1, limit: 1000 }),
        ]);

        const normalizedTotals = Object.entries(statsResult.data?.por_setor || {}).reduce((acc, [name, value]) => {
          const sectorName = normalizeSectorName(name);
          acc[sectorName] = (acc[sectorName] || 0) + value;
          return acc;
        }, {});

        const sectorOrder = [...SECTORS, 'Operacao', 'Expedicao', 'Nao informado'];
        const totals = sectorOrder
          .filter((value, index, array) => array.indexOf(value) === index)
          .map((name) => ({ name, value: normalizedTotals[name] || 0 }))
          .filter(({ value }) => value > 0)
          .sort((a, b) => b.value - a.value);

        setSectorTotals(totals);
        setSectorDevices(devicesResult.data || []);
      } catch (err) {
        setSectorTotals([]);
        setSectorDevices([]);
      }
    };

    loadSectorTotals();
  }, []);

  const visibleSectorTotals = useMemo(() => {
    if (sectorTotals.length > 0) {
      return sectorTotals;
    }

    const totals = devices.reduce((acc, device) => {
      const sectorName = normalizeSectorName(device.setor);
      acc[sectorName] = (acc[sectorName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [devices, sectorTotals]);

  const sectorItemsMap = useMemo(() => {
    const sourceDevices = sectorDevices.length > 0 ? sectorDevices : devices;

    return sourceDevices.reduce((acc, device) => {
      const sectorName = normalizeSectorName(device.setor);
      if (!acc[sectorName]) acc[sectorName] = [];
      acc[sectorName].push(device);
      return acc;
    }, {});
  }, [devices, sectorDevices]);

  const normalizedSectorSearch = sectorSearch.trim().toLowerCase();

  const filteredSectorTotals = useMemo(() => {
    if (!normalizedSectorSearch) return visibleSectorTotals;

    return visibleSectorTotals
      .map((sector) => {
        const matchedDevices = (sectorItemsMap[sector.name] || []).filter((device) =>
          [
            device.nome_dispositivo,
            device.numero_serie,
            device.tipo,
            device.marca,
            device.modelo,
            device.status,
            device.ticket,
            device.observacoes,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSectorSearch))
        );

        return {
          ...sector,
          matchedDevices,
          value: matchedDevices.length,
        };
      })
      .filter((sector) => sector.value > 0);
  }, [normalizedSectorSearch, sectorItemsMap, visibleSectorTotals]);

  const topSector = filteredSectorTotals[0];

  const handleEdit = (device) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingDevice(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    loadDevices();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteDevice(deletingId);
      setDeletingId(null);
      loadDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const btnBase = {
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'opacity 0.15s',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>Equipamentos</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>
            {pagination.total} equipamento{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleNew}
          style={{ ...btnBase, background: '#2563eb', color: '#fff', padding: '10px 18px', fontSize: 14, fontWeight: 600 }}
        >
          Novo Equipamento
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: isMobile ? 16 : 20,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Quantidade de dispositivos por setor</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Resumo executivo para consulta rapida, sem alterar o fluxo da aba de equipamentos.
            </p>
          </div>

          {topSector && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                minWidth: isMobile ? '100%' : 220,
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1d4ed8', fontWeight: 700 }}>
                Maior volume
              </div>
              <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: '#111827' }}>{topSector.name}</div>
              <div style={{ marginTop: 2, fontSize: 13, color: '#1e40af' }}>{topSector.value} dispositivo(s)</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              position: 'relative',
              width: isMobile ? '100%' : 340,
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <MagnifierIcon />
            </div>
            <input
              value={sectorSearch}
              onChange={(event) => {
                setSectorSearch(event.target.value);
                setExpandedSector(null);
                setExpandedSectorDeviceId(null);
              }}
              placeholder="Buscar equipamento por nome ou numero de serie"
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                background: '#fff',
                fontSize: 13,
                color: '#111827',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {filteredSectorTotals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {filteredSectorTotals.map(({ name, value, matchedDevices }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setExpandedSector((current) => (current === name ? null : name));
                  setExpandedSectorDeviceId(null);
                }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '14px 16px',
                  background: '#f8fafc',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: expandedSector === name ? '0 0 0 2px rgba(37, 99, 235, 0.12)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      {name}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: '#6b7280' }}>dispositivo(s)</div>
                  </div>
                  <div style={{ fontSize: 18, color: '#2563eb', lineHeight: 1 }}>{expandedSector === name ? '−' : '+'}</div>
                </div>

                {expandedSector === name && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid #dbeafe',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {(matchedDevices || sectorItemsMap[name] || []).length > 0 ? (
                      (matchedDevices || sectorItemsMap[name] || []).map((device) => (
                        <div
                          key={device.id}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedSectorDeviceId((current) => (current === device.id ? null : device.id));
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: '#ffffff',
                              border: expandedSectorDeviceId === device.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{device.nome_dispositivo}</div>
                                <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
                                  {device.tipo} • {device.status}
                                </div>
                                <div style={{ marginTop: 4, fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                                  Serie: {device.numero_serie || '-'}
                                </div>
                              </div>
                              <div style={{ fontSize: 16, color: '#2563eb', lineHeight: 1 }}>{expandedSectorDeviceId === device.id ? '−' : '+'}</div>
                            </div>

                            {expandedSectorDeviceId === device.id && (
                              <div
                                style={{
                                  marginTop: 12,
                                  paddingTop: 12,
                                  borderTop: '1px solid #dbeafe',
                                  display: 'grid',
                                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                  gap: 10,
                                }}
                              >
                                <div style={{ fontSize: 12, color: '#334155' }}>
                                  <strong>Marca:</strong> {device.marca || '-'}
                                </div>
                                <div style={{ fontSize: 12, color: '#334155' }}>
                                  <strong>Modelo:</strong> {device.modelo || '-'}
                                </div>
                                <div style={{ fontSize: 12, color: '#334155' }}>
                                  <strong>Setor:</strong> {device.setor || name}
                                </div>
                                <div style={{ fontSize: 12, color: '#334155' }}>
                                  <strong>Ticket:</strong> {device.ticket || '-'}
                                </div>
                                <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#334155' }}>
                                  <strong>Observacoes:</strong> {device.observacoes || 'Nenhuma observacao cadastrada.'}
                                </div>
                              </div>
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>Nenhum item encontrado neste setor.</div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: 10,
              border: '1px dashed #cbd5e1',
              padding: '20px 16px',
              color: '#64748b',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {normalizedSectorSearch
              ? 'Nenhum equipamento encontrado para essa busca.'
              : 'Os totais por setor serao exibidos assim que houver equipamentos cadastrados.'}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <input
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            placeholder="Buscar por nome, setor, marca..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', minWidth: isMobile ? '100%' : 180 }}
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Todos os tipos</option>
          {EQUIPMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', minWidth: isMobile ? '100%' : 180 }}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {(search || filterType !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setSearch('');
              setFilterType('all');
              setFilterStatus('all');
              setCurrentPage(1);
            }}
            style={{
              ...btnBase,
              background: '#f3f4f6',
              color: '#6b7280',
              padding: '9px 14px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          Erro: {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>Carregando equipamentos...</div>
        ) : devices.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nenhum equipamento encontrado</div>
            <div style={{ fontSize: 13 }}>Tente ajustar os filtros ou cadastrar um novo equipamento.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 860 : 700 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Dispositivo', 'Tipo', 'Marca / Modelo', 'No Serie', 'Setor', 'Status', 'Ticket', 'Acoes'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '11px 16px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((device, index) => (
                  <tr
                    key={device.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: index % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{device.nome_dispositivo}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{device.data_cadastro}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                      {TYPE_ICONS[device.tipo] || 'Item'} {device.tipo}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: '#374151' }}>{device.marca}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{device.modelo}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{device.numero_serie}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{device.setor}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={device.status} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{device.ticket || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEdit(device)}
                          style={{ ...btnBase, background: '#eff6ff', color: '#2563eb', padding: '6px 12px' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingId(device.id)}
                          style={{ ...btnBase, background: '#fef2f2', color: '#dc2626', padding: '6px 12px' }}
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

        {!loading && pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid #f3f4f6',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Pagina {pagination.page} de {pagination.totalPages} · {pagination.total} registros
            </span>
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => page - 1)}
                style={{
                  ...btnBase,
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '7px 14px',
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  flex: isMobile ? 1 : 'initial',
                  justifyContent: 'center',
                }}
              >
                Anterior
              </button>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
                style={{
                  ...btnBase,
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '7px 14px',
                  opacity: currentPage >= pagination.totalPages ? 0.4 : 1,
                  flex: isMobile ? 1 : 'initial',
                  justifyContent: 'center',
                }}
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && <DeviceForm device={editingDevice} onClose={handleFormClose} onSuccess={handleFormSuccess} />}

      {deletingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 28,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Confirmar exclusao</h3>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>
              Tem certeza que deseja remover este equipamento? Esta acao nao pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ ...btnBase, background: '#f3f4f6', color: '#374151', padding: '10px 20px', flex: isMobile ? 1 : 'initial', justifyContent: 'center' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{ ...btnBase, background: '#dc2626', color: '#fff', padding: '10px 20px', opacity: deleteLoading ? 0.6 : 1, flex: isMobile ? 1 : 'initial', justifyContent: 'center' }}
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
