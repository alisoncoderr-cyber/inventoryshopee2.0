import React, { useEffect, useMemo, useState } from 'react';
import { buildInventoryStats, getInventoryDevices } from '../services/inventoryCache';

const cardStyle = {
  background: 'var(--panel-bg)',
  borderRadius: 24,
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--shadow-md)',
  backdropFilter: 'blur(10px)',
};

const StatCard = ({ title, value, helper, accent, icon }) => (
  <div style={{ ...cardStyle, padding: 24, position: 'relative', overflow: 'hidden', minHeight: 150 }}>
    <div style={{ position: 'absolute', inset: 'auto -34px -34px auto', width: 120, height: 120, borderRadius: '50%', background: `${accent}14` }} />
    <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}14`, color: accent, fontWeight: 800, marginBottom: 22 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{helper}</div>
  </div>
);

const SummaryList = ({ data, emptyText }) => (
  <div style={{ display: 'grid', gap: 10 }}>
    {data.length > 0 ? data.map((item) => (
      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.name}</span>
        <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item.value}</strong>
      </div>
    )) : <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>{emptyText}</div>}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        const devices = await getInventoryDevices();
        setStats(buildInventoryStats(devices));
      } catch (err) {
        setError(err.message || 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const setorData = useMemo(() => Object.entries(stats?.por_setor || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [stats]);
  const tipoData = useMemo(() => Object.entries(stats?.por_tipo || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), [stats]);

  if (loading) return <div style={{ ...cardStyle, padding: 32, minHeight: 120 }} />;
  if (error) return <div style={{ ...cardStyle, padding: 24, color: '#b91c1c', background: 'var(--danger-soft)', borderColor: 'rgba(239,68,68,0.2)' }}>Erro ao carregar dashboard: {error}</div>;
  if (!stats) return null;

  const maintenanceRate = stats.total ? `${Math.round((stats.em_manutencao / stats.total) * 100)}%` : '0%';

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        style={{
          ...cardStyle,
          padding: isMobile ? 24 : 32,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.96) 48%, rgba(219,234,254,0.96) 100%)',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(59,130,246,0.12)' }} />
        <div style={{ position: 'absolute', left: '42%', bottom: -70, width: 180, height: 180, borderRadius: '50%', background: 'rgba(29,78,216,0.08)' }} />
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--brand)' }}>Resumo</div>
          <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 38, lineHeight: 1.05, letterSpacing: '-0.03em' }}>Inventario em numeros</h1>
          <p style={{ margin: 0, maxWidth: 560, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>Informacoes basicas da base. Para consultar equipamentos especificos, use a lista com filtros.</p>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        <StatCard title="Base total" value={stats.total} helper="todos os itens controlados" accent="#1d4ed8" icon="INV" />
        <StatCard title="Equipamentos ativos" value={stats.ativos} helper="itens prontos para operacao" accent="#0f766e" icon="OK" />
        <StatCard title="Em manutencao" value={stats.em_manutencao} helper={`${maintenanceRate} da base exige atencao`} accent="#d97706" icon="MT" />
        <StatCard title="Com ticket" value={stats.com_ticket} helper="equipamentos vinculados a chamados" accent="#475569" icon="TK" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Quantidade por setor</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lista simples para entender onde os equipamentos estao alocados.</p>
          </div>
          <SummaryList data={setorData} emptyText="Nenhum dado por setor disponivel." />
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Quantidade por tipo</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Contagem direta por tipo de equipamento.</p>
          </div>
          <SummaryList data={tipoData} emptyText="Nenhum dado por tipo disponivel." />
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Ultimos cadastros</h3>
        <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens adicionados mais recentemente na base.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {(stats.recentes || []).length > 0 ? stats.recentes.map((device) => (
            <div key={device.id} style={{ padding: '16px 18px', borderRadius: 18, border: '1px solid rgba(148,163,184,0.14)', background: 'var(--panel-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{device.nome_dispositivo}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo} - {device.setor || 'Sem setor'}</div>
                </div>
                <span style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: device.status === 'Ativo' ? '#dcfce7' : device.status === 'Inativo' ? '#fee2e2' : '#fef3c7', color: device.status === 'Ativo' ? '#166534' : device.status === 'Inativo' ? '#b91c1c' : '#b45309', border: '1px solid rgba(148,163,184,0.1)' }}>{device.status}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>Cadastro: {device.data_cadastro || '-'}</div>
            </div>
          )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum cadastro recente encontrado.</div>}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
