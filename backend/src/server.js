// ============================================================
// server.js
// Ponto de entrada do servidor Express
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const devicesRouter = require('./routes/devices');
const { initializeSheet } = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000,https://inventoryshopee2-0.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /\.vercel\.app$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ROTAS
// ============================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', devicesRouter);

// ============================================================
// TRATAMENTO DE ERROS GLOBAL
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota nao encontrada: ${req.method} ${req.url}`,
  });
});

app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================
// INICIALIZACAO DO SERVIDOR
// ============================================================

const startServer = async () => {
  try {
    console.log('Conectando ao Google Sheets...');
    await initializeSheet();
    console.log('Google Sheets conectado com sucesso');

    app.listen(PORT, () => {
      console.log(`\nServidor rodando em http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log('\nRotas disponiveis:');
      console.log('  GET    /api/dashboard');
      console.log('  GET    /api/devices');
      console.log('  POST   /api/devices');
      console.log('  GET    /api/devices/:id');
      console.log('  PUT    /api/devices/:id');
      console.log('  DELETE /api/devices/:id\n');
    });
  } catch (error) {
    console.error('Falha ao iniciar servidor:', error.message);
    console.error('\nVerifique:');
    console.error('  1. Arquivo .env configurado corretamente');
    console.error('  2. Credenciais da service account validas');
    console.error('  3. GOOGLE_SPREADSHEET_ID correto');
    console.error('  4. Planilha compartilhada com a service account');
    process.exit(1);
  }
};

startServer();
