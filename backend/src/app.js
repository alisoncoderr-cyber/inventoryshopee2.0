const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const devicesRouter = require('./routes/devices');
const { requireAuth } = require('./middleware/auth');
const {
  getServiceStatus,
  SheetsServiceUnavailableError,
} = require('./services/googleSheets');
const { allowedOrigins, isOriginAllowed } = require('./config/cors');

const createCorsMiddleware = () =>
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origem nao permitida: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    credentials: true,
  });

const createApp = () => {
  const app = express();

  app.use(createCorsMiddleware());
  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get('/health', (req, res) => {
    const sheets = getServiceStatus();

    res.status(200).json({
      status: sheets.ready ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        googleSheets: sheets,
      },
      cors: {
        restrictive: allowedOrigins.length > 0,
      },
    });
  });

  app.use('/api', authRouter);
  app.use('/api', requireAuth, devicesRouter);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Rota nao encontrada: ${req.method} ${req.url}`,
    });
  });

  app.use((err, req, res, next) => {
    console.error('Erro nao tratado:', err);

    if (err.message?.startsWith('Origem nao permitida:')) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

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

  return app;
};

module.exports = {
  createApp,
};
