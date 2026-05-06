// ============================================================
// App.jsx
// Componente raiz com layout e navegacao principal
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Maintenance from './pages/Maintenance';
import { fetchSession, login, logout } from './services/api';

const DashboardIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1.2" fill={active ? '#1d4ed8' : '#64748b'} />
    <rect x="9" y="2" width="5" height="8" rx="1.2" fill={active ? '#60a5fa' : '#94a3b8'} />
    <rect x="2" y="9" width="5" height="5" rx="1.2" fill={active ? '#93c5fd' : '#cbd5e1'} />
    <rect x="9" y="12" width="5" height="2" rx="1" fill={active ? '#1e3a8a' : '#94a3b8'} />
  </svg>
);

const DevicesIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="12" height="8" rx="1.5" stroke={active ? '#1d4ed8' : '#64748b'} strokeWidth="1.4" />
    <path d="M5 13h6" stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7 11v2M9 11v2" stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const MaintenanceIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6.2 3.4a2 2 0 0 0 2.82 2.83l3.03 3.02a1.6 1.6 0 0 1 0 2.26l-.5.5a1.6 1.6 0 0 1-2.26 0L6.27 9.02A2 2 0 0 0 3.44 6.2L5.2 4.44 6.2 3.4Z" fill={active ? '#1d4ed8' : '#64748b'} />
    <path d="M4.2 10.8l1 1" stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9.8 3.2l3 3" stroke={active ? '#3b82f6' : '#94a3b8'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'devices', label: 'Equipamentos', icon: DevicesIcon },
  { id: 'maintenance', label: 'Manutencao', icon: MaintenanceIcon },
];

const PageLoader = ({ label }) => (
  <div
    style={{
      minHeight: 'calc(100vh - 116px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    }}
  >
    <div
      style={{
        minWidth: 220,
        padding: '24px 28px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.86)',
        border: '1px solid var(--panel-border)',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="page-loader-dot"
            style={{ animationDelay: `${index * 0.14}s` }}
          />
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>Carregando {label}</div>
    </div>
  </div>
);

const LoginScreen = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(form);
      onLogin(result.user);
    } catch (err) {
      setError(err.message || 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380, padding: 28, borderRadius: 18, background: '#ffffff', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <img src="/shopee-icon.webp" alt="Shopee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Inventario SOC-PE2</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Acesso restrito</p>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Usuario</label>
        <input
          value={form.username}
          onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          autoComplete="username"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.26)', color: 'var(--text-primary)', fontSize: 14, marginBottom: 14 }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Senha</label>
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          autoComplete="current-password"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.26)', color: 'var(--text-primary)', fontSize: 14 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: 20, padding: '12px 16px', borderRadius: 12, border: 'none', background: loading ? '#94a3b8' : 'var(--brand)', color: '#ffffff', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [pageLoading, setPageLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 960);
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState(null);
  const pageLoadingTimer = useRef(null);

  useEffect(() => {
    let mounted = true;

    fetchSession()
      .then((session) => {
        if (mounted && session.authenticated) setUser(session.user);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setAuthChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (pageId) => {
    if (pageId === activePage) {
      if (isMobile) setSidebarOpen(false);
      return;
    }

    if (pageLoadingTimer.current) window.clearTimeout(pageLoadingTimer.current);
    setPageLoading(true);
    setActivePage(pageId);
    if (isMobile) setSidebarOpen(false);
    pageLoadingTimer.current = window.setTimeout(() => setPageLoading(false), 520);
  };

  useEffect(() => () => {
    if (pageLoadingTimer.current) window.clearTimeout(pageLoadingTimer.current);
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => null);
    setUser(null);
    setActivePage('dashboard');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'devices':
        return <Devices />;
      case 'maintenance':
        return <Maintenance />;
      default:
        return <Dashboard />;
    }
  };

  if (authChecking) {
    return <PageLoader label="sistema" />;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'transparent',
        fontFamily: '"Aptos", "Segoe UI", Arial, system-ui, sans-serif',
        color: 'var(--text-primary)',
      }}
    >
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(4px)',
            zIndex: 20,
          }}
        />
      )}

      <aside
        style={{
          width: sidebarOpen ? 248 : 72,
          background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(255,255,255,0.97) 100%)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: isMobile ? 'transform 0.2s ease' : 'width 0.2s ease',
          overflow: 'hidden',
          position: isMobile ? 'fixed' : 'relative',
          inset: isMobile ? '0 auto 0 0' : 'auto',
          height: isMobile ? '100vh' : 'auto',
          zIndex: 30,
          transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          borderRight: '1px solid var(--panel-border)',
          boxShadow: isMobile && sidebarOpen ? '0 30px 70px rgba(15, 23, 42, 0.18)' : 'none',
        }}
      >
        <div
          style={{
            padding: '22px 16px',
            borderBottom: '1px solid var(--panel-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minHeight: 76,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
            }}
          >
            <img src="/shopee-icon.webp" alt="Shopee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Inventario SOC-PE2</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Centro Logistico</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarOpen((open) => !open)}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--text-muted)',
            padding: '10px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 14,
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
          }}
          title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          {sidebarOpen ? '<' : '>'}
        </button>

        <nav style={{ flex: 1, padding: '10px 10px 18px' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                width: '100%',
                border: 'none',
                background: activePage === item.id ? 'rgba(31, 58, 95, 0.08)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: sidebarOpen ? '12px 14px' : '12px 0',
                marginBottom: 6,
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: activePage === item.id ? 'var(--brand-ink)' : 'var(--text-secondary)',
                borderRadius: 9,
                transition: 'all 0.15s',
                fontSize: 14,
                fontWeight: activePage === item.id ? 700 : 500,
                boxShadow: activePage === item.id ? 'inset 0 0 0 1px rgba(59,130,246,0.1)' : 'none',
              }}
            >
              <span style={{ width: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon active={activePage === item.id} />
              </span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div
            style={{
              padding: '18px 16px',
              borderTop: '1px solid var(--panel-border)',
              background: 'rgba(248,250,252,0.72)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Sistema de Inventario v1.1</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Google Sheets Backend</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10 }}>Painel operacional Shopee</div>
          </div>
        )}
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header
          style={{
            background: 'rgba(248, 250, 252, 0.78)',
            borderBottom: '1px solid var(--panel-border)',
            padding: isMobile ? '0 16px' : '0 28px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  border: '1px solid var(--panel-border)',
                  background: 'rgba(255,255,255,0.84)',
                  color: 'var(--text-primary)',
                  borderRadius: 12,
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 6,
                  boxShadow: 'var(--shadow-sm)',
                }}
                aria-label="Abrir menu"
              >
                ≡
              </button>
            )}
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {NAV_ITEMS.find((item) => item.id === activePage)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.14)' }} />
            {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Operacao ativa</span>}
            <button onClick={handleLogout} style={{ marginLeft: 8, border: '1px solid var(--panel-border)', background: '#ffffff', color: 'var(--text-secondary)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              Sair
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>
          {pageLoading ? <PageLoader label={NAV_ITEMS.find((item) => item.id === activePage)?.label || 'pagina'} /> : renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
