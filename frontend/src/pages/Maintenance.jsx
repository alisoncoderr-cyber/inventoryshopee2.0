import React, { useEffect, useMemo, useState } from 'react';
import { getInventoryDevices } from '../services/inventoryCache';
import { STATUS_COLORS } from '../utils/constants';
import { isMaintenanceStatus, normalizeSectorName, sortDevices } from '../utils/deviceHelpers';

const cardStyle = {
  background: 'linear-gradient(180deg, rgba(24,24,24,.96), rgba(12,12,12,.96))',
  borderRadius: 22,
  border: '1px solid var(--panel-border)',
  boxShadow: '0 24px 55px rgba(0,0,0,.28)',
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

const SectorImpactCard = ({ sector, count, withTicket }) => (
  <div style={{ padding: 16, borderRadius: 16, background: '#111', border: '1px solid rgba(249,115,22,.14)' }}>
    <div style={{ fontSize: 12, color: '#fdba74', fontWeight: 700, textTransform: 'uppercase' }}>{sector}</div>
    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#fff' }}>{count}</div>
    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{withTicket} com ticket associado</div>
  </div>
);

const Maintenance = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        setError('');
        const inventoryDevices = await getInventoryDevices();
        setDevices(inventoryDevices);
      } catch (err) {
        setError(err.message || 'Erro ao carregar manutencao');
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

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

  if (loading) return <div style={{ ...cardStyle, padding: 32, minHeight: 120 }} />;
  if (error) return <div style={{ ...cardStyle, padding: 24, color: '#fecaca', background: 'rgba(239,68,68,.12)', borderColor: 'rgba(239,68,68,.28)' }}>Erro ao carregar manutencao: {error}</div>;

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 22 : 30, background: 'radial-gradient(circle at top right, rgba(249,115,22,.3), transparent 24%), linear-gradient(135deg,#090909 0%,#141414 54%,#241103 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: '#ffd08a', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Manutencao</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 36, lineHeight: 1.06 }}>Acompanhamento de equipamentos em manutencao</h1>
            <p style={{ margin: 0, color: '#ffe2bf', lineHeight: 1.7, fontSize: 14, maxWidth: 620 }}>Painel dedicado para fila de manutencao, tickets, setores impactados e itens que exigem acompanhamento mais proximo.</p>
          </div>
          <div style={{ minWidth: isMobile ? '100%' : 280, maxWidth: 320, padding: 18, borderRadius: 18, background: 'linear-gradient(180deg, rgba(18,18,18,.88), rgba(36,20,6,.82))', border: '1px solid rgba(245,130,32,.22)' }}>
            <div style={{ fontSize: 12, color: '#ffd08a', textTransform: 'uppercase' }}>Setor mais impactado</div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{topSector ? topSector.sector : 'Sem dados'}</div>
            <div style={{ marginTop: 4, color: '#e5e7eb', fontSize: 13 }}>{topSector ? `${topSector.count} equipamento(s) em manutencao` : 'Nenhum equipamento em manutencao'}</div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard label="Fila total" value={maintenanceDevices.length} helper="equipamentos atualmente em manutencao" />
        <KpiCard label="Com ticket" value={withTicketCount} helper="itens com chamado registrado" />
        <KpiCard label="Sem ticket" value={pendingTicketDevices.length} helper="itens que pedem formalizacao" />
        <KpiCard label="Com responsavel" value={assignedCount} helper="equipamentos ligados a uma pessoa" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, .75fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Fila de manutencao</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lista de equipamentos que estao fora da operacao por manutencao.</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {maintenanceDevices.length > 0 ? maintenanceDevices.map((device) => (
              <div key={device.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.06)', background: '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{device.nome_dispositivo}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo} • {normalizeSectorName(device.setor)} • {device.numero_serie || 'Sem serie'}</div>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Ticket</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#e5e7eb' }}>{device.ticket || 'Nao informado'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Responsavel</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#e5e7eb' }}>{device.pessoa_atribuida || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#fdba74', textTransform: 'uppercase' }}>Cadastro</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#e5e7eb' }}>{device.data_cadastro || '-'}</div>
                  </div>
                </div>
                {device.observacoes && <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(249,115,22,.08)', color: '#f8fafc', fontSize: 13, lineHeight: 1.6 }}>{device.observacoes}</div>}
              </div>
            )) : <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum equipamento em manutencao no momento.</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Pendencias sem ticket</h2>
            <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens em manutencao que ainda precisam de ticket formal.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {pendingTicketDevices.length > 0 ? pendingTicketDevices.map((device) => (
                <div key={device.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(249,115,22,.16)', background: '#111' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{device.nome_dispositivo}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{normalizeSectorName(device.setor)} • {device.numero_serie || 'Sem serie'}</div>
                </div>
              )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Todos os itens em manutencao possuem ticket.</div>}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Setores impactados</h2>
            <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Visao rapida de onde a manutencao esta concentrada.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {maintenanceBySector.length > 0 ? maintenanceBySector.map((item) => <SectorImpactCard key={item.sector} sector={item.sector} count={item.count} withTicket={item.withTicket} />) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum setor com fila de manutencao.</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Maintenance;
