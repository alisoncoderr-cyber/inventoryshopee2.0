// ============================================================
// routes/devices.js
// Definição das rotas da API de equipamentos
// ============================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/devicesController');

// GET /api/dashboard - Estatísticas para o dashboard
router.get('/dashboard', controller.getDashboardStats);

// GET /api/devices - Lista todos os equipamentos (com filtros e paginação)
// Query params: ?search=&type=&status=&page=1&limit=20
router.get('/devices', controller.getDevices);

// GET /api/devices/:id - Busca equipamento por ID
router.get('/devices/:id', controller.getDeviceById);

// POST /api/devices - Cria novo equipamento
router.post('/devices', controller.createDevice);

// POST /api/devices/bulk - Cria varios equipamentos em lote
router.post('/devices/bulk', controller.createDevicesBulk);

// PUT /api/devices/:id - Atualiza equipamento existente
router.put('/devices/:id', controller.updateDevice);

// DELETE /api/devices/:id - Remove equipamento
router.delete('/devices/:id', controller.deleteDevice);

module.exports = router;
