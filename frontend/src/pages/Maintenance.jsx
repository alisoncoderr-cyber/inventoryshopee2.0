import React, { useEffect, useMemo, useState } from 'react';
import { updateDevice } from '../services/api';
import { getInventoryDevices } from '../services/inventoryCache';
import { STATUS_COLORS } from '../utils/constants';
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
  const [ticketForm, setTicketForm] = useState({ ticket: '', observacoes: '' });
  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [pendingTicketPage, setPendingTicketPage] = useState(1);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError('');
      const inventoryDevices = await getInventoryDevices({ force: true });
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
    setTicketForm({ ticket: device.ticket || '', observacoes: device.observacoes || '' });
    setTicketError('');
  };

  const closeTicketModal = () => {
    if (ticketSaving) return;
    setTicketDevice(null);
    setTicketForm({ ticket: '', observacoes: '' });
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
        observacoes: ticketForm.observacoes.trim(),
      });
      await loadDevices();
      closeTicketModal();
    } catch (err) {
      setTicketError(err.message || 'Erro ao salvar ticket');
    } finally {
      setTicketSaving(false);
    }
  };

  const maintenanceDevices = useMemo(() => sortDevices(devices.filter((device) => isMaintenanceStatus(device.status)), 'recent'), [devices]);
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
  const withTicketCount = maintenanceDevices.filter((device) => String(device.ticket || '').trim()).length;
  const assignedCount = maintenanceDevices.filter((device) => String(device.pessoa_atribuida || '').trim()).length;
  const maintenancePageData = getPageItems(maintenanceDevices, maintenancePage, MAINTENANCE_PAGE_SIZE);
  const pendingTicketPageData = getPageItems(pendingTicketDevices, pendingTicketPage, PENDING_TICKET_PAGE_SIZE);

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
        <KpiCard label="Com responsavel" value={assignedCount} helper="equipamentos ligados a uma pessoa" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.25fr) minmax(320px, .75fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Fila de manutencao</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lista de equipamentos que estao fora da operacao por manutencao.</p>
          </div>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.18)' }}>
            {maintenanceDevices.length > 0 ? (
              <div style={{ overflowX: 'auto', background: '#ffffff' }}>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Equipamento', 'Serie', 'Setor', 'Ticket', 'Responsavel', 'Cadastro', 'Status'].map((header) => <th key={header} style={tableHeaderStyle}>{header}</th>)}
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
                        <td style={tableCellStyle}>{normalizeSectorName(device.setor)}</td>
                        <td style={{ ...tableCellStyle, color: device.ticket ? 'var(--brand)' : '#64748b', fontWeight: device.ticket ? 700 : 500 }}>{device.ticket || 'Nao informado'}</td>
                        <td style={tableCellStyle}>{device.pessoa_atribuida || '-'}</td>
                        <td style={tableCellStyle}>{device.data_cadastro || '-'}</td>
                        <td style={tableCellStyle}><StatusBadge status={device.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>Nenhum equipamento em manutencao no momento.</div>}
          </div>
          <PaginationControls
            totalItems={maintenanceDevices.length}
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
