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

// CORS - permite requisições do frontend
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origem (ex: curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse de JSON no body das requisições
app.use(express.json());

// Log simples de requisições (para debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ROTAS
// ============================================================

// Health check - verifica se o servidor está rodando
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api', devicesRouter);

// ============================================================
// TRATAMENTO DE ERROS GLOBAL
// ============================================================

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.url}`,
  });
});

// Erro interno
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================

const startServer = async () => {
  try {
    console.log('🔌 Conectando ao Google Sheets...');
    await initializeSheet();
    console.log('✅ Google Sheets conectado com sucesso');

    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log('\nRotas disponíveis:');
      console.log(`  GET    /api/dashboard`);
      console.log(`  GET    /api/devices`);
      console.log(`  POST   /api/devices`);
      console.log(`  GET    /api/devices/:id`);
      console.log(`  PUT    /api/devices/:id`);
      console.log(`  DELETE /api/devices/:id\n`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error.message);
    console.error('\nVerifique:');
    console.error('  1. Arquivo .env configurado corretamente');
    console.error('  2. Credenciais da service account válidas');
    console.error('  3. GOOGLE_SPREADSHEET_ID correto');
    console.error('  4. Planilha compartilhada com a service account');
    process.exit(1);
  }
};

startServer();
