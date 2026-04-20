// ============================================================
// server.js
// Ponto de entrada do servidor Express
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const devicesRouter = require('./routes/devices');
const { getServiceStatus, initializeSheet, SheetsServiceUnavailableError } = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

app.use(
  cors({
    origin: true,
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
  const sheets = getServiceStatus();
  const isReady = sheets.ready;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      googleSheets: sheets,
    },
  });
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

  if (err instanceof SheetsServiceUnavailableError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      service: 'googleSheets',
    });
  }

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

  console.log('Conectando ao Google Sheets...');

  try {
    await initializeSheet();
    console.log('Google Sheets conectado com sucesso');
  } catch (error) {
    console.error('Falha ao inicializar Google Sheets:', error.message);
    console.error('A API continuara ativa, mas as rotas de inventario responderao com indisponibilidade ate a integracao voltar.');
    console.error('\nVerifique:');
    console.error('  1. Arquivo .env configurado corretamente');
    console.error('  2. Credenciais da service account validas');
    console.error('  3. GOOGLE_SPREADSHEET_ID correto');
    console.error('  4. Planilha compartilhada com a service account');
  }
};

startServer();
