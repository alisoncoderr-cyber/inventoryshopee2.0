// ============================================================
// controllers/devicesController.js
// Controlador com logica de negocio para equipamentos
// ============================================================

const { v4: uuidv4 } = require('uuid');
const sheetsService = require('../services/googleSheets');

const VALID_STATUSES = ['Ativo', 'Em manutenção', 'Inativo'];

const sanitizeDevicePayload = (payload = {}) => ({
  nome_dispositivo: payload.nome_dispositivo?.trim(),
  tipo: payload.tipo?.trim(),
  marca: payload.marca?.trim(),
  modelo: payload.modelo?.trim(),
  numero_serie: payload.numero_serie?.trim(),
  setor: payload.setor?.trim(),
  pessoa_atribuida: payload.pessoa_atribuida?.trim() || '',
  status: payload.status?.trim() || 'Ativo',
  ticket: payload.ticket?.trim() || '',
  data_aquisicao: payload.data_aquisicao || '',
  observacoes: payload.observacoes?.trim() || '',
});

const getMissingFields = (data) =>
  Object.entries(data)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

/**
 * Lista todos os equipamentos com suporte a filtros e busca
 * Query params: search, type, status, page, limit
 */
const getDevices = async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 20 } = req.query;

    let devices = await sheetsService.getAllDevices();

    if (search) {
      const term = search.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.nome_dispositivo?.toLowerCase().includes(term) ||
          d.setor?.toLowerCase().includes(term) ||
          d.numero_serie?.toLowerCase().includes(term) ||
          d.marca?.toLowerCase().includes(term) ||
          d.modelo?.toLowerCase().includes(term) ||
          d.pessoa_atribuida?.toLowerCase().includes(term)
      );
    }

    if (type && type !== 'all') {
      devices = devices.filter((d) => d.tipo === type);
    }

    if (status && status !== 'all') {
      devices = devices.filter((d) => d.status === status);
    }

    const total = devices.length;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginated = devices.slice(startIndex, startIndex + parsedLimit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar equipamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar equipamentos',
      error: error.message,
    });
  }
};

/**
 * Busca um equipamento especifico pelo ID
 */
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await sheetsService.getDeviceById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Equipamento nao encontrado',
      });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar equipamento',
      error: error.message,
    });
  }
};

/**
 * Cria um novo equipamento
 */
const createDevice = async (req, res) => {
  try {
    const sanitized = sanitizeDevicePayload(req.body);
    const {
      nome_dispositivo,
      tipo,
      marca,
      modelo,
      numero_serie,
      setor,
      pessoa_atribuida,
      status,
      ticket,
      data_aquisicao,
      observacoes,
    } = sanitized;

    const missingFields = getMissingFields({
      nome_dispositivo,
      tipo,
      marca,
      modelo,
      numero_serie,
      setor,
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatorios faltando: ${missingFields.join(', ')}`,
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status invalido. Use: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const existingSerial = await sheetsService.findDeviceBySerial(numero_serie);
    if (existingSerial) {
      return res.status(409).json({
        success: false,
        message: 'Ja existe um equipamento cadastrado com este numero de serie',
      });
    }

    const newDevice = {
      id: uuidv4(),
      nome_dispositivo,
      tipo,
      marca,
      modelo,
      numero_serie,
      setor,
      pessoa_atribuida: tipo === 'Laptop' ? pessoa_atribuida : '',
      status,
      ticket,
      data_aquisicao,
      data_cadastro: new Date().toISOString().split('T')[0],
      observacoes,
    };

    const created = await sheetsService.createDevice(newDevice);

    res.status(201).json({
      success: true,
      message: 'Equipamento cadastrado com sucesso',
      data: created,
    });
  } catch (error) {
    console.error('Erro ao criar equipamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar equipamento',
      error: error.message,
    });
  }
};

/**
 * Cria multiplos equipamentos de uma vez
 */
const createDevicesBulk = async (req, res) => {
  try {
    const devices = Array.isArray(req.body?.devices) ? req.body.devices : [];

    if (devices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Envie ao menos um equipamento para cadastro em lote',
      });
    }

    if (devices.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'O limite por lote e de 100 equipamentos',
      });
    }

    const preparedDevices = [];
    const seenSerials = new Set();

    for (const rawDevice of devices) {
      const sanitized = sanitizeDevicePayload(rawDevice);
      const {
        nome_dispositivo,
        tipo,
        marca,
        modelo,
        numero_serie,
        setor,
        pessoa_atribuida,
        status,
        ticket,
        data_aquisicao,
        observacoes,
      } = sanitized;

      const missingFields = getMissingFields({
        nome_dispositivo,
        tipo,
        marca,
        modelo,
        numero_serie,
        setor,
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos obrigatorios faltando em lote: ${missingFields.join(', ')}`,
        });
      }

      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status invalido no lote. Use: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const serialKey = numero_serie.toLowerCase();
      if (seenSerials.has(serialKey)) {
        return res.status(400).json({
          success: false,
          message: `Numero de serie duplicado no lote: ${numero_serie}`,
        });
      }

      const existingSerial = await sheetsService.findDeviceBySerial(numero_serie);
      if (existingSerial) {
        return res.status(409).json({
          success: false,
          message: `O numero de serie ${numero_serie} ja esta cadastrado`,
        });
      }

      seenSerials.add(serialKey);
      preparedDevices.push({
        id: uuidv4(),
        nome_dispositivo,
        tipo,
        marca,
        modelo,
        numero_serie,
        setor,
        pessoa_atribuida: tipo === 'Laptop' ? pessoa_atribuida : '',
        status,
        ticket,
        data_aquisicao,
        data_cadastro: new Date().toISOString().split('T')[0],
        observacoes,
      });
    }

    const createdDevices = await sheetsService.createDevicesBulk(preparedDevices);

    res.status(201).json({
      success: true,
      message: `${createdDevices.length} equipamento(s) cadastrado(s) com sucesso`,
      data: createdDevices,
    });
  } catch (error) {
    console.error('Erro ao criar equipamentos em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar equipamentos em lote',
      error: error.message,
    });
  }
};

/**
 * Atualiza dados de um equipamento existente
 */
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = sanitizeDevicePayload(req.body);

    delete updateData.id;
    delete updateData.data_cadastro;

    if (updateData.tipo && updateData.tipo !== 'Laptop') {
      updateData.pessoa_atribuida = '';
    }

    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: `Status invalido. Use: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (updateData.numero_serie) {
      const existingSerial = await sheetsService.findDeviceBySerial(
        updateData.numero_serie,
        id
      );

      if (existingSerial) {
        return res.status(409).json({
          success: false,
          message: 'Ja existe outro equipamento cadastrado com este numero de serie',
        });
      }
    }

    const updated = await sheetsService.updateDevice(id, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Equipamento nao encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Equipamento atualizado com sucesso',
      data: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar equipamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar equipamento',
      error: error.message,
    });
  }
};

/**
 * Remove um equipamento pelo ID
 */
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await sheetsService.deleteDevice(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Equipamento nao encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Equipamento removido com sucesso',
    });
  } catch (error) {
    console.error('Erro ao deletar equipamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar equipamento',
      error: error.message,
    });
  }
};

/**
 * Retorna estatisticas para o dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const devices = await sheetsService.getAllDevices();

    const stats = {
      total: devices.length,
      ativos: devices.filter((d) => d.status === 'Ativo').length,
      em_manutencao: devices.filter((d) => d.status === 'Em manutenção').length,
      inativos: devices.filter((d) => d.status === 'Inativo').length,
      com_ticket: devices.filter((d) => d.ticket?.trim()).length,
      laptops_atribuidos: devices.filter(
        (d) => d.tipo === 'Laptop' && d.pessoa_atribuida?.trim()
      ).length,
    };

    const porSetor = devices.reduce((acc, d) => {
      const setor = d.setor || 'Sem setor';
      acc[setor] = (acc[setor] || 0) + 1;
      return acc;
    }, {});

    const porTipo = devices.reduce((acc, d) => {
      const tipo = d.tipo || 'Sem tipo';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    const recentes = [...devices]
      .sort((a, b) => (b.data_cadastro || '').localeCompare(a.data_cadastro || ''))
      .slice(0, 5)
      .map((device) => ({
        id: device.id,
        nome_dispositivo: device.nome_dispositivo,
        tipo: device.tipo,
        setor: device.setor,
        status: device.status,
        data_cadastro: device.data_cadastro,
      }));

    res.json({
      success: true,
      data: {
        ...stats,
        percentual_ativos: stats.total ? Math.round((stats.ativos / stats.total) * 100) : 0,
        por_setor: porSetor,
        por_tipo: porTipo,
        recentes,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatisticas',
      error: error.message,
    });
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  createDevicesBulk,
  updateDevice,
  deleteDevice,
  getDashboardStats,
};
