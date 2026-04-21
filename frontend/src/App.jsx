// ============================================================
// App.jsx
// Componente raiz com layout e navegacao principal
// ============================================================

import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Maintenance from './pages/Maintenance';

const DashboardIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1.2" fill={active ? '#fff7ed' : '#ff9a3d'} />
    <rect x="9" y="2" width="5" height="8" rx="1.2" fill={active ? '#ffd08a' : '#6b7280'} />
    <rect x="2" y="9" width="5" height="5" rx="1.2" fill={active ? '#ffd08a' : '#6b7280'} />
    <rect x="9" y="12" width="5" height="2" rx="1" fill={active ? '#fff7ed' : '#ff9a3d'} />
  </svg>
);

const DevicesIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="12" height="8" rx="1.5" stroke={active ? '#fff7ed' : '#ff9a3d'} strokeWidth="1.4" />
    <path d="M5 13h6" stroke={active ? '#ffd08a' : '#9ca3af'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7 11v2M9 11v2" stroke={active ? '#ffd08a' : '#9ca3af'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const MaintenanceIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6.2 3.4a2 2 0 0 0 2.82 2.83l3.03 3.02a1.6 1.6 0 0 1 0 2.26l-.5.5a1.6 1.6 0 0 1-2.26 0L6.27 9.02A2 2 0 0 0 3.44 6.2L5.2 4.44 6.2 3.4Z" fill={active ? '#fff7ed' : '#ff9a3d'} />
    <path d="M4.2 10.8l1 1" stroke={active ? '#ffd08a' : '#9ca3af'} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9.8 3.2l3 3" stroke={active ? '#ffd08a' : '#9ca3af'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'devices', label: 'Equipamentos', icon: DevicesIcon },
  { id: 'maintenance', label: 'Manutencao', icon: MaintenanceIcon },
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
      case 'maintenance':
        return <Maintenance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, rgba(245,130,32,0.22), transparent 26%), var(--app-bg)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: 'var(--text-primary)',
      }}
    >
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.56)', zIndex: 20 }}
        />
      )}

      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          background: 'linear-gradient(180deg, #111111 0%, #1a1a1a 50%, #0b0b0b 100%)',
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
          boxShadow: isMobile && sidebarOpen ? '0 24px 48px rgba(0, 0, 0, 0.35)' : 'none',
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
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f58220, #ff9a3d 55%, #ffd08a)',
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
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>Inventario Shopee</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Centro Logistico</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarOpen((open) => !open)}
          style={{
            border: 'none',
            background: 'none',
            color: '#9ca3af',
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
                color: activePage === item.id ? '#fff' : '#cbd5e1',
                background: activePage === item.id ? 'linear-gradient(90deg, rgba(245,130,32,0.36), rgba(255,154,61,0.14))' : 'transparent',
                borderLeft: activePage === item.id ? '3px solid #f58220' : '3px solid transparent',
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
            <div style={{ fontSize: 11, color: '#d1d5db' }}>Sistema de Inventario v1.1</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Google Sheets Backend</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 10 }}>Painel operacional Shopee</div>
          </div>
        )}
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header
          style={{
            background: 'rgba(18, 18, 18, 0.9)',
            borderBottom: '1px solid rgba(245,130,32,0.14)',
            padding: isMobile ? '0 16px' : '0 24px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  border: '1px solid var(--panel-border)',
                  background: '#18181b',
                  color: '#f8fafc',
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{NAV_ITEMS.find((item) => item.id === activePage)?.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f58220', boxShadow: '0 0 0 3px rgba(245,130,32,0.22)' }} />
            {!isMobile && <span style={{ fontSize: 12, color: '#d1d5db' }}>Operacao ativa</span>}
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 24 }}>{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
