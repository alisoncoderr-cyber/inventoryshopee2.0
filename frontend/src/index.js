import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
  :root {
    --app-bg: #0a0a0a;
    --panel-bg: #141414;
    --panel-alt: #1b1b1b;
    --panel-soft: #222222;
    --panel-border: rgba(245, 130, 32, 0.22);
    --text-primary: #f8fafc;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
    --brand: #f58220;
    --brand-soft: #ff9a3d;
    --brand-pale: #ffe2bf;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { min-height: 100%; }
  body { margin: 0; padding: 0; background: var(--app-bg); color: var(--text-primary); overflow-x: hidden; }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  table { border-spacing: 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #111111; }
  ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #52525b; }
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
