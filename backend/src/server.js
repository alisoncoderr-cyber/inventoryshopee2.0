// ============================================================
// server.js
// Ponto de entrada do servidor Express
// ============================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createApp } = require('./app');
const { initializeSheet } = require('./services/googleSheets');

const app = createApp();
const PORT = process.env.PORT || 3001;

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
    console.log('  POST   /api/devices/bulk');
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
    console.error(
      'A API continuara ativa, mas as rotas de inventario responderao com indisponibilidade ate a integracao voltar.'
    );
    console.error('\nVerifique:');
    console.error('  1. Arquivo .env configurado corretamente');
    console.error('  2. Credenciais da service account validas');
    console.error('  3. GOOGLE_SPREADSHEET_ID correto');
    console.error('  4. Planilha compartilhada com a service account');
  }
};

startServer();
