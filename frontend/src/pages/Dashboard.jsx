import React, { useEffect, useMemo, useState } from 'react';
import { buildInventoryStats, getInventoryDevices } from '../services/inventoryCache';

const cardStyle = {
  background: 'var(--panel-bg)',
  borderRadius: 24,
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--shadow-md)',
  backdropFilter: 'blur(10px)',
};

const StatCard = ({ title, value, helper, icon }) => (
  <div style={{ ...cardStyle, padding: 24, minHeight: 150 }}>
    <div style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid rgba(148,163,184,0.18)', marginBottom: 22 }}>
      <img src={icon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
    </div>
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

const SUMMARY_PAGE_SIZE = 8;

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

const PaginatedSummaryList = ({ data, emptyText, page, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(data.length / SUMMARY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * SUMMARY_PAGE_SIZE;
  const visibleData = data.slice(startIndex, startIndex + SUMMARY_PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) onPageChange(safePage);
  }, [onPageChange, page, safePage]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <SummaryList data={visibleData} emptyText={emptyText} />
      {data.length > SUMMARY_PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {startIndex + 1}-{Math.min(startIndex + SUMMARY_PAGE_SIZE, data.length)} de {data.length}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const active = pageNumber === safePage;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(pageNumber)}
                  style={{
                    ...pageButtonStyle,
                    background: active ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : '#ffffff',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: active ? 'transparent' : 'rgba(148,163,184,0.22)',
                    boxShadow: active ? '0 10px 22px rgba(29,78,216,0.16)' : 'none',
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}
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

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [setorPage, setSetorPage] = useState(1);
  const [tipoPage, setTipoPage] = useState(1);

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
          background: '#ffffff',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--brand)' }}>Resumo</div>
          <h1 style={{ margin: '12px 0 10px', fontSize: isMobile ? 28 : 38, lineHeight: 1.05, letterSpacing: '-0.03em' }}>Inventario em numeros</h1>
          <p style={{ margin: 0, maxWidth: 560, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>Informacoes basicas da base. Para consultar equipamentos especificos, use a lista com filtros.</p>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        <StatCard title="Base total" value={stats.total} helper="todos os itens controlados" icon="/icons/inventory.png" />
        <StatCard title="Equipamentos ativos" value={stats.ativos} helper="itens prontos para operacao" icon="/icons/active.png" />
        <StatCard title="Em manutencao" value={stats.em_manutencao} helper={`${maintenanceRate} da base exige atencao`} icon="/icons/maintenance.png" />
        <StatCard title="Aguardando aprovacao" value={stats.aguardando_aprovacao} helper="tickets pendentes para o lider aprovar" icon="/icons/approval.png" />
      </section>

      <section style={{ ...cardStyle, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Aguardando aprovacao SL</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Use "Pendente aprovacao SL" nas observacoes para acompanhar os tickets que o lider precisa aprovar.</p>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: 999, background: '#f8fafc', border: '1px solid rgba(148,163,184,0.18)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 800 }}>{stats.aguardando_aprovacao} pendente(s)</div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {(stats.aguardando_aprovacao_itens || []).length > 0 ? stats.aguardando_aprovacao_itens.map((device) => (
            <div key={device.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 1fr) 120px minmax(140px, .7fr) minmax(220px, 1.2fr)', gap: 12, alignItems: 'center', padding: '14px 16px', borderRadius: 16, background: 'var(--panel-soft)', border: '1px solid rgba(148,163,184,0.14)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{getEquipmentDisplayName(device)}</div>
                <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>{device.tipo || 'Sem tipo'}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{device.setor || 'Sem setor'}</div>
              <div style={{ fontSize: 13, color: '#b45309', fontWeight: 700 }}>{device.ticket || 'Sem ticket'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{device.observacoes || 'Sem observacao'}</div>
            </div>
          )) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--panel-soft)', borderRadius: 16, border: '1px solid rgba(148,163,184,0.14)' }}>Nenhum equipamento marcado como pendente de aprovacao SL.</div>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Quantidade por setor</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lista simples para entender onde os equipamentos estao alocados.</p>
          </div>
          <PaginatedSummaryList data={setorData} emptyText="Nenhum dado por setor disponivel." page={setorPage} onPageChange={setSetorPage} />
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Quantidade por tipo</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Contagem direta por tipo de equipamento.</p>
          </div>
          <PaginatedSummaryList data={tipoData} emptyText="Nenhum dado por tipo disponivel." page={tipoPage} onPageChange={setTipoPage} />
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
