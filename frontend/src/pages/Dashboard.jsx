import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildInventoryStats, getInventoryDevices } from '../services/inventoryCache';

const CHART_COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#0f766e', '#f59e0b', '#ef4444'];
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

const InsightItem = ({ label, value, tone }) => (
  <div style={{ padding: '15px 16px', borderRadius: 16, background: tone.background, border: `1px solid ${tone.border}` }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: tone.labelColor, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: tone.valueColor, lineHeight: 1.35 }}>{value}</div>
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

  const setorData = useMemo(() => Object.entries(stats?.por_setor || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7), [stats]);
  const tipoData = useMemo(() => Object.entries(stats?.por_tipo || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6), [stats]);

  if (loading) return <div style={{ ...cardStyle, padding: 32, minHeight: 120 }} />;
  if (error) return <div style={{ ...cardStyle, padding: 24, color: '#b91c1c', background: 'var(--danger-soft)', borderColor: 'rgba(239,68,68,0.2)' }}>Erro ao carregar dashboard: {error}</div>;
  if (!stats) return null;

  const topSector = setorData[0];
  const topType = tipoData[0];
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
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--brand)' }}>Dashboard</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 38, lineHeight: 1.05, letterSpacing: '-0.03em' }}>Visao geral do inventario</h1>
            <p style={{ margin: 0, maxWidth: 560, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>Indicadores, distribuicao por setor e acompanhamento da operacao com uma leitura mais limpa e direta.</p>
          </div>
          <div style={{ minWidth: isMobile ? '100%' : 280, maxWidth: 320, padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(148,163,184,0.2)', backdropFilter: 'blur(8px)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Saude da operacao</div>
            <div style={{ marginTop: 12, fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.percentual_ativos}%</div>
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 13 }}>dos equipamentos estao ativos</div>
            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              <InsightItem label="Setor lider" value={topSector ? `${topSector.name} (${topSector.value})` : 'Sem dados'} tone={{ background: 'rgba(219,234,254,0.7)', border: 'rgba(59,130,246,0.16)', labelColor: 'var(--brand)', valueColor: 'var(--text-primary)' }} />
              <InsightItem label="Tipo dominante" value={topType ? `${topType.name} (${topType.value})` : 'Sem dados'} tone={{ background: 'rgba(248,250,252,0.9)', border: 'rgba(148,163,184,0.2)', labelColor: 'var(--text-muted)', valueColor: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        <StatCard title="Base total" value={stats.total} helper="todos os itens controlados" accent="#1d4ed8" icon="INV" />
        <StatCard title="Equipamentos ativos" value={stats.ativos} helper="itens prontos para operacao" accent="#0f766e" icon="OK" />
        <StatCard title="Em manutencao" value={stats.em_manutencao} helper={`${maintenanceRate} da base exige atencao`} accent="#d97706" icon="MT" />
        <StatCard title="Com ticket" value={stats.com_ticket} helper="equipamentos vinculados a chamados" accent="#475569" icon="TK" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Distribuicao por setor</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Top setores com maior concentracao de equipamentos</p>
          </div>
          {setorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={setorData} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.26)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(59,130,246,0.06)' }} contentStyle={{ borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)', background: '#ffffff', color: '#0f172a', boxShadow: '0 16px 35px rgba(15,23,42,0.08)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#1d4ed8" name="Equipamentos" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado por setor disponivel.</div>}
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Mix por tipo</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Leitura rapida dos tipos mais representativos do inventario</p>
          {tipoData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={tipoData} dataKey="value" nameKey="name" outerRadius={92} innerRadius={48} paddingAngle={4}>
                    {tipoData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)', background: '#ffffff', boxShadow: '0 16px 35px rgba(15,23,42,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 10 }}>
                {tipoData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', display: 'inline-block', background: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado por tipo disponivel.</div>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Alertas operacionais</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Indicadores que ajudam a priorizar manutencao e distribuicao</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <InsightItem label="Em manutencao" value={`${stats.em_manutencao} item(ns)`} tone={{ background: '#fff7ed', border: 'rgba(245,158,11,0.18)', labelColor: '#d97706', valueColor: 'var(--text-primary)' }} />
            <InsightItem label="Com ticket ativo" value={`${stats.com_ticket} item(ns)`} tone={{ background: '#f8fafc', border: 'rgba(148,163,184,0.18)', labelColor: '#64748b', valueColor: 'var(--text-primary)' }} />
            <InsightItem label="Laptops com responsavel" value={`${stats.laptops_atribuidos} item(ns)`} tone={{ background: '#eff6ff', border: 'rgba(59,130,246,0.16)', labelColor: '#2563eb', valueColor: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Ultimos cadastros</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens adicionados mais recentemente na base</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {(stats.recentes || []).length > 0 ? stats.recentes.map((device) => (
              <div key={device.id} style={{ padding: '16px 18px', borderRadius: 18, border: '1px solid rgba(148,163,184,0.14)', background: 'var(--panel-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{device.nome_dispositivo}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo} • {device.setor || 'Sem setor'}</div>
                  </div>
                  <span style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: device.status === 'Ativo' ? '#dcfce7' : device.status === 'Inativo' ? '#fee2e2' : '#fef3c7', color: device.status === 'Ativo' ? '#166534' : device.status === 'Inativo' ? '#b91c1c' : '#b45309', border: '1px solid rgba(148,163,184,0.1)' }}>{device.status}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>Cadastro: {device.data_cadastro || '-'}</div>
              </div>
            )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum cadastro recente encontrado.</div>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
