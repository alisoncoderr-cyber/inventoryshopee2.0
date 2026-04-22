import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
  :root {
    --app-bg: #f3f6fb;
    --app-bg-soft: #edf2f8;
    --panel-bg: rgba(255, 255, 255, 0.9);
    --panel-alt: #ffffff;
    --panel-soft: #f7f9fc;
    --panel-border: rgba(148, 163, 184, 0.22);
    --panel-border-strong: rgba(148, 163, 184, 0.34);
    --text-primary: #0f172a;
    --text-secondary: #334155;
    --text-muted: #64748b;
    --brand: #1d4ed8;
    --brand-soft: #3b82f6;
    --brand-pale: #dbeafe;
    --brand-ink: #1e3a8a;
    --success: #15803d;
    --success-soft: #dcfce7;
    --warning: #d97706;
    --warning-soft: #fef3c7;
    --danger: #dc2626;
    --danger-soft: #fee2e2;
    --shadow-sm: 0 10px 30px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 18px 45px rgba(15, 23, 42, 0.08);
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { min-height: 100%; }
  body {
    margin: 0;
    padding: 0;
    background:
      radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
      linear-gradient(180deg, #f8fbff 0%, var(--app-bg) 38%, var(--app-bg-soft) 100%);
    color: var(--text-primary);
    overflow-x: hidden;
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  table { border-spacing: 0; }
  ::selection { background: rgba(59, 130, 246, 0.16); }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.7); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.86); }
`;

const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
