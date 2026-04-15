// ============================================================
// pages/Devices.jsx
// Página de listagem, busca e gerenciamento de equipamentos
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { fetchDevices, deleteDevice } from '../services/api';
import { EQUIPMENT_TYPES, STATUS_OPTIONS, STATUS_COLORS, TYPE_ICONS } from '../utils/constants';
import DeviceForm from '../components/DeviceForm';

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filtros
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de formulário
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  // Confirmação de exclusão
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    border: 'none', borderRadius: 7, cursor: 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'opacity 0.15s',
  };

  return (
    <div>
      {/* Header */}
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
          ➕ Novo Equipamento
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: 16,
        marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* Busca */}
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
          <input
            style={{
              width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #d1d5db',
              borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
            }}
            placeholder="Buscar por nome, setor, marca..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Filtro Tipo */}
        <select
          style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Todos os tipos</option>
          {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Filtro Status */}
        <select
          style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Botão limpar */}
        {(search || filterType !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterType('all'); setFilterStatus('all'); setCurrentPage(1); }}
            style={{ ...btnBase, background: '#f3f4f6', color: '#6b7280', padding: '9px 14px' }}
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Erros */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            Carregando equipamentos...
          </div>
        ) : devices.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nenhum equipamento encontrado</div>
            <div style={{ fontSize: 13 }}>Tente ajustar os filtros ou cadastre um novo equipamento</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Dispositivo', 'Tipo', 'Marca / Modelo', 'Nº Série', 'Setor', 'Status', 'Ticket', 'Ações'].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left', fontSize: 12,
                      fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((device, idx) => (
                  <tr
                    key={device.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                        {device.nome_dispositivo}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {device.data_cadastro}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                      {TYPE_ICONS[device.tipo] || '📦'} {device.tipo}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: '#374151' }}>{device.marca}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{device.modelo}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
                      {device.numero_serie}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                      {device.setor}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={device.status} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                      {device.ticket || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleEdit(device)}
                          style={{ ...btnBase, background: '#eff6ff', color: '#2563eb', padding: '6px 12px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => setDeletingId(device.id)}
                          style={{ ...btnBase, background: '#fef2f2', color: '#dc2626', padding: '6px 12px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && pagination.totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8
          }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={{ ...btnBase, background: '#f3f4f6', color: '#374151', padding: '7px 14px', opacity: currentPage <= 1 ? 0.4 : 1 }}
              >
                ← Anterior
              </button>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{ ...btnBase, background: '#f3f4f6', color: '#374151', padding: '7px 14px', opacity: currentPage >= pagination.totalPages ? 0.4 : 1 }}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <DeviceForm
          device={editingDevice}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Confirmar exclusão</h3>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>
              Tem certeza que deseja remover este equipamento? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ ...btnBase, background: '#f3f4f6', color: '#374151', padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{ ...btnBase, background: '#dc2626', color: '#fff', padding: '10px 20px', opacity: deleteLoading ? 0.6 : 1 }}
              >
                {deleteLoading ? 'Excluindo...' : '🗑️ Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
