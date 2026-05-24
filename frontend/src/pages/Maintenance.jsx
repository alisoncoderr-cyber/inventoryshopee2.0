import React, { useEffect, useMemo, useState } from 'react';
import { updateDevice } from '../services/api';
import { getInventoryDevices, invalidateInventoryCache } from '../services/inventoryCache';
import { EQUIPMENT_TYPES, SECTORS, STATUS_COLORS } from '../utils/constants';
import { isMaintenanceStatus, normalizeSectorName, sortDevices } from '../utils/deviceHelpers';

const cardStyle = {
  background: 'var(--panel-bg)',
  borderRadius: 24,
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--shadow-md)',
  backdropFilter: 'blur(10px)',
};

const tableHeaderStyle = {
  padding: '13px 14px',
  textAlign: 'left',
  fontSize: 11,
  color: '#334155',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  borderBottom: '1px solid rgba(148,163,184,0.18)',
  whiteSpace: 'nowrap',
};

const tableCellStyle = {
  padding: '14px',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderTop: '1px solid rgba(148,163,184,0.12)',
  verticalAlign: 'middle',
};

const MAINTENANCE_PAGE_SIZE = 8;
const PENDING_TICKET_PAGE_SIZE = 6;

const todayDate = () => new Date().toISOString().split('T')[0];

const getDaysInMaintenance = (dateValue = '') => {
  if (!dateValue) return null;

  const startDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - startDate) / 86400000));
};

const formatDaysInMaintenance = (dateValue = '') => {
  const days = getDaysInMaintenance(dateValue);
  if (days === null) return 'Nao informado';
  if (days === 0) return 'Hoje';
  return `${days} dia(s)`;
};

const pageButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.22)',
  background: '#ffffff',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800,
  fontFamily: 'inherit',
};

const getPageItems = (items, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    totalPages,
    safePage,
    startIndex,
    visibleItems: items.slice(startIndex, startIndex + pageSize),
  };
};

const PaginationControls = ({ totalItems, page, totalPages, startIndex, pageSize, onPageChange }) => {
  if (totalItems <= pageSize) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} de {totalItems}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const active = pageNumber === page;

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              style={{
                ...pageButtonStyle,
                background: active ? 'var(--brand)' : '#ffffff',
                color: active ? '#ffffff' : 'var(--text-secondary)',
                borderColor: active ? 'transparent' : 'rgba(148,163,184,0.22)',
              }}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const looksLikeSerial = (value = '') => /^s?\d{8,}$/i.test(String(value).trim());

const getEquipmentDisplayName = (device = {}) => {
  const name = String(device.nome_dispositivo || '').trim();
  const type = String(device.tipo || '').trim();

  if (!name || looksLikeSerial(name) || name === device.numero_serie) {
    return type || 'Equipamento';
  }

  return name;
};

const KpiCard = ({ label, value, helper }) => (
  <div style={{ ...cardStyle, padding: 22 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    <div style={{ marginTop: 12, fontSize: 30, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{helper}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#f8fafc', text: '#334155', border: 'rgba(148,163,184,0.2)' };
  return <span style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{status}</span>;
};

const SectorImpactCard = ({ sector, count, withTicket }) => (
  <div style={{ padding: 18, borderRadius: 18, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}>
    <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase' }}>{sector}</div>
    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{withTicket} com ticket associado</div>
  </div>
);

const Maintenance = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [ticketDevice, setTicketDevice] = useState(null);
  const [ticketForm, setTicketForm] = useState({ ticket: '', data_inicio_manutencao: todayDate(), observacoes: '' });
  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [pendingTicketPage, setPendingTicketPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: 'all', sector: 'all', ticket: 'all', sort: 'oldest' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDevices = async (options = {}) => {
    try {
      setLoading(true);
      setError('');
      const inventoryDevices = await getInventoryDevices(options);
      setDevices(inventoryDevices);
    } catch (err) {
      setError(err.message || 'Erro ao carregar manutencao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const openTicketModal = (device) => {
    setTicketDevice(device);
    setTicketForm({
      ticket: device.ticket || '',
      data_inicio_manutencao: device.data_inicio_manutencao || todayDate(),
      observacoes: device.observacoes || '',
    });
    setTicketError('');
  };

  const closeTicketModal = () => {
    if (ticketSaving) return;
    setTicketDevice(null);
    setTicketForm({ ticket: '', data_inicio_manutencao: todayDate(), observacoes: '' });
    setTicketError('');
  };

  const handleTicketSubmit = async (event) => {
    event.preventDefault();

    if (!ticketDevice) return;
    if (!ticketForm.ticket.trim()) {
      setTicketError('Informe o numero do ticket.');
      return;
    }

    setTicketSaving(true);
    setTicketError('');

    try {
      await updateDevice(ticketDevice.id, {
        ...ticketDevice,
        ticket: ticketForm.ticket.trim(),
        data_inicio_manutencao: ticketForm.data_inicio_manutencao,
        observacoes: ticketForm.observacoes.trim(),
      });
      invalidateInventoryCache();
      await loadDevices({ force: true });
      closeTicketModal();
    } catch (err) {
      setTicketError(err.message || 'Erro ao salvar ticket');
    } finally {
      setTicketSaving(false);
    }
  };

  const maintenanceDevices = useMemo(() => sortDevices(devices.filter((device) => isMaintenanceStatus(device.status)), 'recent'), [devices]);
  const filteredMaintenanceDevices = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const filtered = maintenanceDevices.filter((device) => {
      const matchesSearch = !searchTerm || [
        device.nome_dispositivo,
        device.tipo,
        device.numero_serie,
        device.setor,
        device.ticket,
        device.observacoes,
        device.pessoa_atribuida,
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      const matchesType = filters.type === 'all' || device.tipo === filters.type;
      const matchesSector = filters.sector === 'all' || normalizeSectorName(device.setor) === filters.sector;
      const hasTicket = Boolean(String(device.ticket || '').trim());
      const matchesTicket =
        filters.ticket === 'all' ||
        (filters.ticket === 'with' && hasTicket) ||
        (filters.ticket === 'without' && !hasTicket);

      return matchesSearch && matchesType && matchesSector && matchesTicket;
    });

    if (filters.sort === 'newest') {
      return filtered.sort((a, b) => (b.data_inicio_manutencao || '').localeCompare(a.data_inicio_manutencao || ''));
    }

    if (filters.sort === 'type') {
      return filtered.sort((a, b) => (a.tipo || '').localeCompare(b.tipo || ''));
    }

    return filtered.sort((a, b) => {
      const daysA = getDaysInMaintenance(a.data_inicio_manutencao);
      const daysB = getDaysInMaintenance(b.data_inicio_manutencao);

      if (daysA === null && daysB === null) return 0;
      if (daysA === null) return 1;
      if (daysB === null) return -1;
      return daysB - daysA;
    });
  }, [filters, maintenanceDevices]);
  const pendingTicketDevices = useMemo(() => maintenanceDevices.filter((device) => !String(device.ticket || '').trim()), [maintenanceDevices]);
  const maintenanceBySector = useMemo(() => {
    const grouped = maintenanceDevices.reduce((acc, device) => {
      const sector = normalizeSectorName(device.setor);
      if (!acc[sector]) acc[sector] = { sector, count: 0, withTicket: 0 };
      acc[sector].count += 1;
      if (String(device.ticket || '').trim()) acc[sector].withTicket += 1;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [maintenanceDevices]);

  const topSector = maintenanceBySector[0];
  const maintenanceTypeOptions = useMemo(() => {
    const values = new Set([...EQUIPMENT_TYPES, ...maintenanceDevices.map((device) => device.tipo).filter(Boolean)]);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [maintenanceDevices]);
  const maintenanceSectorOptions = useMemo(() => {
    const values = new Set([...SECTORS, ...maintenanceDevices.map((device) => normalizeSectorName(device.setor)).filter(Boolean)]);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [maintenanceDevices]);
  const withTicketCount = maintenanceDevices.filter((device) => String(device.ticket || '').trim()).length;
  const oldestDays = maintenanceDevices.reduce((max, device) => {
    const days = getDaysInMaintenance(device.data_inicio_manutencao);
    return days === null ? max : Math.max(max, days);
  }, 0);
  const maintenancePageData = getPageItems(filteredMaintenanceDevices, maintenancePage, MAINTENANCE_PAGE_SIZE);
  const pendingTicketPageData = getPageItems(pendingTicketDevices, pendingTicketPage, PENDING_TICKET_PAGE_SIZE);

  useEffect(() => {
    setMaintenancePage(1);
  }, [filters]);

  if (loading) return <div style={{ ...cardStyle, padding: 32, minHeight: 120 }} />;
  if (error) return <div style={{ ...cardStyle, padding: 24, color: '#b91c1c', background: 'var(--danger-soft)', borderColor: 'rgba(239,68,68,0.2)' }}>Erro ao carregar manutencao: {error}</div>;

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 24 : 30, background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 52%, rgba(241,245,249,0.95) 100%)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Manutencao</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 30 : 40, lineHeight: 1.04, letterSpacing: '-0.03em' }}>Acompanhamento de equipamentos em manutencao</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 15, maxWidth: 620 }}>Painel dedicado para fila de manutencao, tickets, setores impactados e itens que exigem acompanhamento mais proximo.</p>
          </div>
          <div style={{ minWidth: isMobile ? '100%' : 280, maxWidth: 320, padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(100,116,139,0.18)' }}>
            <div style={{ fontSize: 11, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Setor mais impactado</div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{topSector ? topSector.sector : 'Sem dados'}</div>
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 13 }}>{topSector ? `${topSector.count} equipamento(s) em manutencao` : 'Nenhum equipamento em manutencao'}</div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard label="Fila total" value={maintenanceDevices.length} helper="equipamentos atualmente em manutencao" />
        <KpiCard label="Com ticket" value={withTicketCount} helper="itens com chamado registrado" />
        <KpiCard label="Sem ticket" value={pendingTicketDevices.length} helper="itens que pedem formalizacao" />
        <KpiCard label="Mais antigo" value={`${oldestDays}d`} helper="maior tempo parado informado" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.25fr) minmax(320px, .75fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Fila de manutencao</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lista de equipamentos que estao fora da operacao por manutencao.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 1.4fr) repeat(4, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Buscar por serie, ticket, setor..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />
            <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', background: '#ffffff' }}>
              <option value="all">Todos os tipos</option>
              {maintenanceTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={filters.sector} onChange={(event) => setFilters((prev) => ({ ...prev, sector: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', background: '#ffffff' }}>
              <option value="all">Todos os setores</option>
              {maintenanceSectorOptions.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
            </select>
            <select value={filters.ticket} onChange={(event) => setFilters((prev) => ({ ...prev, ticket: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', background: '#ffffff' }}>
              <option value="all">Todos tickets</option>
              <option value="with">Com ticket</option>
              <option value="without">Sem ticket</option>
            </select>
            <select value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', background: '#ffffff' }}>
              <option value="oldest">Mais tempo parado</option>
              <option value="newest">Data mais recente</option>
              <option value="type">Tipo A-Z</option>
            </select>
          </div>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.18)' }}>
            {filteredMaintenanceDevices.length > 0 ? (
              <div style={{ overflowX: 'auto', background: '#ffffff' }}>
                <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Equipamento', 'Serie', 'Tipo', 'Setor', 'Ticket', 'Inicio manut.', 'Dias parado', 'Responsavel', 'Status'].map((header) => <th key={header} style={tableHeaderStyle}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {maintenancePageData.visibleItems.map((device, index) => (
                      <tr key={device.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#fbfdff' }}>
                        <td style={tableCellStyle}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{getEquipmentDisplayName(device)}</div>
                          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>{device.marca || device.modelo ? [device.marca, device.modelo].filter(Boolean).join(' ') : 'Sem detalhes'}</div>
                        </td>
                        <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{device.numero_serie || '-'}</td>
                        <td style={tableCellStyle}>{device.tipo || '-'}</td>
                        <td style={tableCellStyle}>{normalizeSectorName(device.setor)}</td>
                        <td style={{ ...tableCellStyle, color: device.ticket ? 'var(--brand)' : '#64748b', fontWeight: device.ticket ? 700 : 500 }}>{device.ticket || 'Nao informado'}</td>
                        <td style={tableCellStyle}>{device.data_inicio_manutencao || 'Nao informado'}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 800, color: getDaysInMaintenance(device.data_inicio_manutencao) >= 7 ? '#b91c1c' : 'var(--text-secondary)' }}>{formatDaysInMaintenance(device.data_inicio_manutencao)}</td>
                        <td style={tableCellStyle}>{device.pessoa_atribuida || '-'}</td>
                        <td style={tableCellStyle}><StatusBadge status={device.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>Nenhum equipamento em manutencao encontrado com os filtros atuais.</div>}
          </div>
          <PaginationControls
            totalItems={filteredMaintenanceDevices.length}
            page={maintenancePageData.safePage}
            totalPages={maintenancePageData.totalPages}
            startIndex={maintenancePageData.startIndex}
            pageSize={MAINTENANCE_PAGE_SIZE}
            onPageChange={setMaintenancePage}
          />
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Pendencias sem ticket</h2>
            <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens em manutencao que ainda precisam de ticket formal.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {pendingTicketDevices.length > 0 ? pendingTicketPageData.visibleItems.map((device) => (
                <button key={device.id} type="button" onClick={() => openTicketModal(device)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(100,116,139,0.2)', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getEquipmentDisplayName(device)}</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>{normalizeSectorName(device.setor)} {device.observacoes ? `- ${device.observacoes}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sem ticket</span>
                </button>
              )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Todos os itens em manutencao possuem ticket.</div>}
            </div>
            <PaginationControls
              totalItems={pendingTicketDevices.length}
              page={pendingTicketPageData.safePage}
              totalPages={pendingTicketPageData.totalPages}
              startIndex={pendingTicketPageData.startIndex}
              pageSize={PENDING_TICKET_PAGE_SIZE}
              onPageChange={setPendingTicketPage}
            />
          </div>

          <div style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Setores impactados</h2>
            <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Visao rapida de onde a manutencao esta concentrada.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {maintenanceBySector.length > 0 ? maintenanceBySector.map((item) => <SectorImpactCard key={item.sector} sector={item.sector} count={item.count} withTicket={item.withTicket} />) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum setor com fila de manutencao.</div>}
            </div>
          </div>
        </div>
      </section>

      {ticketDevice && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.36)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={(event) => event.target === event.currentTarget && closeTicketModal()}
        >
          <form onSubmit={handleTicketSubmit} style={{ ...cardStyle, width: '100%', maxWidth: 520, padding: 24, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Adicionar ticket</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{getEquipmentDisplayName(ticketDevice)} - {normalizeSectorName(ticketDevice.setor)}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>Serie: {ticketDevice.numero_serie || 'Nao informado'}</p>
              </div>
              <button type="button" onClick={closeTicketModal} style={{ border: '1px solid rgba(148,163,184,0.18)', background: '#f8fafc', color: 'var(--text-secondary)', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>x</button>
            </div>

            {ticketError && <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c', fontSize: 13 }}>Erro: {ticketError}</div>}

            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Ticket</label>
            <input
              value={ticketForm.ticket}
              onChange={(event) => setTicketForm((prev) => ({ ...prev, ticket: event.target.value }))}
              placeholder="Ex: TKT-2026-001"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.24)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Data inicio manutencao</label>
            <input
              type="date"
              value={ticketForm.data_inicio_manutencao}
              onChange={(event) => setTicketForm((prev) => ({ ...prev, data_inicio_manutencao: event.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.24)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Defeito / observacao</label>
            <textarea
              value={ticketForm.observacoes}
              onChange={(event) => setTicketForm((prev) => ({ ...prev, observacoes: event.target.value }))}
              placeholder="Ex: Tela quebrada, nao liga, falha no leitor..."
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 110, resize: 'vertical', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.24)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(148,163,184,0.14)' }}>
              <button type="button" onClick={closeTicketModal} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.22)', background: '#ffffff', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>Cancelar</button>
              <button type="submit" disabled={ticketSaving} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: ticketSaving ? '#94a3b8' : 'var(--brand)', color: '#ffffff', cursor: ticketSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }}>{ticketSaving ? 'Salvando...' : 'Salvar ticket'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
