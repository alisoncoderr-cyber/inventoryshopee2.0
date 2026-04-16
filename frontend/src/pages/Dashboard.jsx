// ============================================================
// pages/Dashboard.jsx
// Pagina principal com metricas e graficos
// ============================================================

import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchDashboardStats } from '../services/api';
import { SECTORS } from '../utils/constants';

const CHART_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#9333ea', '#d97706'];

const SECTOR_ALIASES = {
  'Expedição': 'Expedicao',
  Expedicao: 'Expedicao',
  Recebimento: 'Recebimento',
  'Operações': 'Operacao',
  Operacoes: 'Operacao',
  'Operação': 'Operacao',
  Armazenagem: 'Fullfilment',
  'Administração': 'ADM',
  Administracao: 'ADM',
  COP: 'COP',
  Security: 'Security',
  TI: 'TI',
  Esteira: 'Esteira',
  Fullfilment: 'Fullfilment',
  Fulfillment: 'Fullfilment',
  ADM: 'ADM',
};

const EquipmentBadgeIcon = ({ color, children }) => (
  <div
    style={{
      width: 48,
      height: 48,
      borderRadius: 10,
      background: `${color}18`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      flexShrink: 0,
      color,
    }}
  >
    {children}
  </div>
);

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 12,
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      flex: 1,
      minWidth: 180,
    }}
  >
    <EquipmentBadgeIcon color={color}>{icon}</EquipmentBadgeIcon>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{subtitle}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const result = await fetchDashboardStats();
        setStats(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#6b7280' }}>
        <div style={{ textAlign: 'center' }}>Carregando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626' }}>
        Erro ao carregar dashboard: {error}
      </div>
    );
  }

  if (!stats) return null;

  const normalizedSectorTotals = Object.entries(stats.por_setor || {}).reduce((acc, [name, value]) => {
    const normalizedName = SECTOR_ALIASES[name] || name;
    acc[normalizedName] = (acc[normalizedName] || 0) + value;
    return acc;
  }, {});

  const setorData = SECTORS
    .concat(['Operacao', 'Expedicao'])
    .filter((value, index, array) => array.indexOf(value) === index)
    .map((name) => ({ name, value: normalizedSectorTotals[name] || 0 }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const tipoData = Object.entries(stats.por_tipo || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const atualPct = stats.total > 0 ? Math.round((stats.ativos / stats.total) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>Visao geral do inventario de equipamentos</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard title="Total de Equipamentos" value={stats.total} icon="Eq" color="#2563eb" subtitle="inventario completo" />
        <StatCard title="Ativos" value={stats.ativos} icon="✓" color="#16a34a" subtitle={`${atualPct}% do total`} />
        <StatCard title="Em Manutencao" value={stats.em_manutencao} icon="🛠" color="#d97706" subtitle="aguardando retorno" />
        <StatCard title="Inativos" value={stats.inativos} icon="✕" color="#dc2626" subtitle="fora de operacao" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Equipamentos por Setor</h3>
          {setorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 250}>
              <BarChart data={setorData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={isMobile ? -25 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Equipamentos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Nenhum dado disponivel</div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Equipamentos por Tipo</h3>
          {tipoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 250}>
              <PieChart>
                <Pie
                  data={tipoData}
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 74 : 90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {tipoData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Nenhum dado disponivel</div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Distribuicao por Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Ativo', value: stats.ativos, color: '#16a34a' },
              { label: 'Em Manutencao', value: stats.em_manutencao, color: '#d97706' },
              { label: 'Inativo', value: stats.inativos, color: '#dc2626' },
            ].map(({ label, value, color }) => {
              const pct = stats.total > 0 ? (value / stats.total) * 100 : 0;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {value} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Ranking por Setor</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {setorData.length > 0 ? (
              setorData.map(({ name, value }, index) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: index < setorData.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: CHART_COLORS[index % CHART_COLORS.length],
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: CHART_COLORS[index % CHART_COLORS.length] }}>{value}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>Nenhum setor cadastrado</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
