import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildInventoryStats, getInventoryDevices } from '../services/inventoryCache';

const CHART_COLORS = ['#f58220', '#ff9a3d', '#ffd08a', '#d97706', '#f59e0b', '#fb7185', '#facc15'];
const cardStyle = { background: 'linear-gradient(180deg, rgba(24,24,24,.96), rgba(12,12,12,.96))', borderRadius: 22, border: '1px solid var(--panel-border)', boxShadow: '0 24px 55px rgba(0,0,0,.28)' };

const StatCard = ({ title, value, helper, accent, icon }) => (
  <div style={{ ...cardStyle, padding: 22, position: 'relative', overflow: 'hidden', minHeight: 148 }}>
    <div style={{ position: 'absolute', inset: 'auto -40px -40px auto', width: 120, height: 120, borderRadius: '50%', background: `${accent}22` }} />
    <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}24`, color: accent, fontWeight: 700, marginBottom: 20 }}>{icon}</div>
    <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{title}</div>
    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{helper}</div>
  </div>
);

const InsightItem = ({ label, value, tone }) => (
  <div style={{ padding: '14px 16px', borderRadius: 14, background: tone.background, border: `1px solid ${tone.border}` }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: tone.labelColor, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: tone.valueColor }}>{value}</div>
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
  if (error) return <div style={{ ...cardStyle, padding: 24, color: '#fecaca', background: 'rgba(239,68,68,.12)', borderColor: 'rgba(239,68,68,.28)' }}>Erro ao carregar dashboard: {error}</div>;
  if (!stats) return null;

  const topSector = setorData[0];
  const topType = tipoData[0];
  const maintenanceRate = stats.total ? `${Math.round((stats.em_manutencao / stats.total) * 100)}%` : '0%';

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 24 : 32, background: 'radial-gradient(circle at top right, rgba(245,130,32,.28), transparent 24%), linear-gradient(135deg,#090909 0%,#131313 52%,#241305 100%)', color: '#fff', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(245,130,32,.14)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ffd08a' }}>Dashboard</div>
            <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 36, lineHeight: 1.1 }}>Visao geral do inventario</h1>
            <p style={{ margin: 0, maxWidth: 560, color: '#ffe2bf', fontSize: 14, lineHeight: 1.7 }}>Indicadores, distribuicao por setor e acompanhamento da operacao em tempo real.</p>
          </div>
          <div style={{ minWidth: isMobile ? '100%' : 260, maxWidth: 300, padding: 18, borderRadius: 18, background: 'linear-gradient(180deg, rgba(18,18,18,.88), rgba(36,20,6,.82))', border: '1px solid rgba(245,130,32,.22)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 12, color: '#ffd08a', textTransform: 'uppercase', letterSpacing: '.05em' }}>Saude da operacao</div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 800 }}>{stats.percentual_ativos}%</div>
            <div style={{ marginTop: 4, color: '#e5e7eb', fontSize: 13 }}>dos equipamentos estao ativos</div>
            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              <InsightItem label="Setor lider" value={topSector ? `${topSector.name} (${topSector.value})` : 'Sem dados'} tone={{ background: 'rgba(245,130,32,.16)', border: 'rgba(245,130,32,.22)', labelColor: '#ffd08a', valueColor: '#fff' }} />
              <InsightItem label="Tipo dominante" value={topType ? `${topType.name} (${topType.value})` : 'Sem dados'} tone={{ background: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)', labelColor: '#d1d5db', valueColor: '#fff' }} />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        <StatCard title="Base total" value={stats.total} helper="todos os itens controlados" accent="#f58220" icon="INV" />
        <StatCard title="Equipamentos ativos" value={stats.ativos} helper="itens prontos para operacao" accent="#ff9a3d" icon="OK" />
        <StatCard title="Em manutencao" value={stats.em_manutencao} helper={`${maintenanceRate} da base exige atencao`} accent="#f59e0b" icon="MT" />
        <StatCard title="Com ticket" value={stats.com_ticket} helper="equipamentos vinculados a chamados" accent="#ffd08a" icon="TK" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Distribuicao por setor</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Top setores com maior concentracao de equipamentos</p>
          </div>
          {setorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={setorData} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#d1d5db' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#d1d5db' }} />
                <Tooltip cursor={{ fill: 'rgba(245,130,32,.08)' }} contentStyle={{ borderRadius: 14, border: '1px solid rgba(245,130,32,.16)', background: '#111', color: '#fff' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#f58220" name="Equipamentos" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado por setor disponivel.</div>}
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Mix por tipo</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Leitura rapida dos tipos mais representativos do inventario</p>
          {tipoData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={tipoData} dataKey="value" nameKey="name" outerRadius={92} innerRadius={48} paddingAngle={4}>
                    {tipoData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid rgba(245,130,32,.16)', background: '#111' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 10 }}>
                {tipoData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', display: 'inline-block', background: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span style={{ fontSize: 13, color: '#e5e7eb' }}>{item.name}</span>
                    </div>
                    <strong style={{ fontSize: 13, color: '#fff' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado por tipo disponivel.</div>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Alertas operacionais</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Indicadores que ajudam a priorizar manutencao e distribuicao</p>
          <div style={{ display: 'grid', gap: 12 }}>
            <InsightItem label="Em manutencao" value={`${stats.em_manutencao} item(ns)`} tone={{ background: 'rgba(245,130,32,.1)', border: 'rgba(245,130,32,.16)', labelColor: '#ffd08a', valueColor: '#fff' }} />
            <InsightItem label="Com ticket ativo" value={`${stats.com_ticket} item(ns)`} tone={{ background: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)', labelColor: '#d1d5db', valueColor: '#fff' }} />
            <InsightItem label="Laptops com responsavel" value={`${stats.laptops_atribuidos} item(ns)`} tone={{ background: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.16)', labelColor: '#fdba74', valueColor: '#fff' }} />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Ultimos cadastros</h3>
          <p style={{ margin: '4px 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>Itens adicionados mais recentemente na base</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {(stats.recentes || []).length > 0 ? stats.recentes.map((device) => (
              <div key={device.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.06)', background: '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{device.nome_dispositivo}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo} • {device.setor || 'Sem setor'}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: device.status === 'Ativo' ? 'rgba(34,197,94,.15)' : device.status === 'Inativo' ? 'rgba(239,68,68,.15)' : 'rgba(249,115,22,.15)', color: device.status === 'Ativo' ? '#86efac' : device.status === 'Inativo' ? '#fca5a5' : '#fdba74' }}>{device.status}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#d1d5db' }}>Cadastro: {device.data_cadastro || '-'}</div>
              </div>
            )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum cadastro recente encontrado.</div>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
