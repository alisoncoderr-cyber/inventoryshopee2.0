// ============================================================
// App.jsx
// Componente raiz com layout e navegacao principal
// ============================================================

import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';

const DashboardIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1.2" fill={active ? '#ffffff' : '#60a5fa'} />
    <rect x="9" y="2" width="5" height="8" rx="1.2" fill={active ? '#bfdbfe' : '#475569'} />
    <rect x="2" y="9" width="5" height="5" rx="1.2" fill={active ? '#bfdbfe' : '#475569'} />
    <rect x="9" y="12" width="5" height="2" rx="1" fill={active ? '#ffffff' : '#60a5fa'} />
  </svg>
);

const DevicesIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="12" height="8" rx="1.5" stroke={active ? '#ffffff' : '#60a5fa'} strokeWidth="1.4" />
    <path d="M5 13h6" stroke={active ? '#bfdbfe' : '#64748b'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7 11v2M9 11v2" stroke={active ? '#bfdbfe' : '#64748b'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'devices', label: 'Equipamentos', icon: DevicesIcon },
];

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 960);

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
    setActivePage(pageId);
    if (isMobile) setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'devices':
        return <Devices />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 20 }}
        />
      )}

      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          background: '#0f172a',
          color: '#fff',
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
          boxShadow: isMobile && sidebarOpen ? '0 20px 40px rgba(15, 23, 42, 0.22)' : 'none',
        }}
      >
        <div
          style={{
            padding: '20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 68,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            INV
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>Inventario SOCPE-02</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Logistica</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarOpen((open) => !open)}
          style={{
            border: 'none',
            background: 'none',
            color: '#64748b',
            padding: '8px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 14,
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          {sidebarOpen ? '<' : '>'}
        </button>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                width: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: sidebarOpen ? '11px 16px' : '11px 0',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: activePage === item.id ? '#fff' : '#94a3b8',
                background: activePage === item.id ? 'rgba(37,99,235,0.25)' : 'transparent',
                borderLeft: activePage === item.id ? '3px solid #2563eb' : '3px solid transparent',
                transition: 'all 0.15s',
                fontSize: 14,
                fontWeight: activePage === item.id ? 600 : 400,
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
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: '#475569' }}>Sistema de Inventario v1.0</div>
            <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>Google Sheets Backend</div>
            <div style={{ fontSize: 10, color: '#334155', marginTop: 10 }}>Desenvolvido por Alison - cop.</div>
          </div>
        )}
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '0 16px' : '0 24px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                }}
                aria-label="Abrir menu"
              >
                ≡
              </button>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{NAV_ITEMS.find((item) => item.id === activePage)?.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
            {!isMobile && <span style={{ fontSize: 12, color: '#64748b' }}>API Conectada</span>}
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
