import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { min-height: 100%; }
  body { margin: 0; padding: 0; background: #f1f5f9; overflow-x: hidden; }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  table { border-spacing: 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
