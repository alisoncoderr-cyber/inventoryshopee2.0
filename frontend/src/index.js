import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
  :root {
    --app-bg: #eef2f7;
    --app-bg-soft: #e7edf5;
    --panel-bg: rgba(255, 255, 255, 0.96);
    --panel-alt: #ffffff;
    --panel-soft: #f6f8fb;
    --panel-border: rgba(100, 116, 139, 0.18);
    --panel-border-strong: rgba(71, 85, 105, 0.28);
    --text-primary: #111827;
    --text-secondary: #374151;
    --text-muted: #667085;
    --brand: #1f3a5f;
    --brand-soft: #2f5f98;
    --brand-pale: #e7eef7;
    --brand-ink: #172b45;
    --success: #15803d;
    --success-soft: #dcfce7;
    --warning: #d97706;
    --warning-soft: #fef3c7;
    --danger: #dc2626;
    --danger-soft: #fee2e2;
    --shadow-sm: 0 6px 18px rgba(15, 23, 42, 0.05);
    --shadow-md: 0 12px 28px rgba(15, 23, 42, 0.07);
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { min-height: 100%; }
  body {
    margin: 0;
    padding: 0;
    background: linear-gradient(180deg, #f7f9fc 0%, var(--app-bg) 44%, var(--app-bg-soft) 100%);
    color: var(--text-primary);
    overflow-x: hidden;
    font-family: "Aptos", "Segoe UI", Arial, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  table { border-spacing: 0; }
  .page-loader-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--brand);
    display: inline-block;
    animation: page-loader-bounce 0.84s ease-in-out infinite;
  }
  @keyframes page-loader-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
    40% { transform: translateY(-7px); opacity: 1; }
  }
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
