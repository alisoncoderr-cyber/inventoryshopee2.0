// ============================================================
// App.jsx
// Componente raiz com layout e navegação principal
// ============================================================

import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'devices', label: 'Equipamentos', icon: '📦' },
];

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'devices': return <Devices />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#0f172a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 68,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            📦
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
                Inventário SOCPE-02
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                Logística
              </div>
            </div>
          )}
        </div>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            border: 'none', background: 'none', color: '#64748b',
            padding: '8px 16px', cursor: 'pointer', textAlign: 'left',
            fontSize: 14, marginTop: 4,
            display: 'flex', alignItems: 'center',
          }}
          title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Navegação */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                width: '100%', border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10,
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
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: '#475569' }}>
              Sistema de Inventário v1.0
            </div>
            <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>
              Google Sheets Backend
            </div>
            <div style={{ fontSize: 10, color: '#334155', marginTop: 10 }}>
              Desenvolvido por Alison - cop.
            </div>
          </div>
        )}
      </aside>

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {NAV_ITEMS.find((i) => i.id === activePage)?.icon}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              {NAV_ITEMS.find((i) => i.id === activePage)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
            }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>API Conectada</span>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
