// ============================================================
// controllers/devicesController.js
// Controlador com lógica de negócio para equipamentos
// ============================================================

const { v4: uuidv4 } = require('uuid');
const sheetsService = require('../services/googleSheets');

/**
 * Lista todos os equipamentos com suporte a filtros e busca
 * Query params: search, type, status, page, limit
 */
const getDevices = async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 20 } = req.query;

    let devices = await sheetsService.getAllDevices();

    // Filtro por busca (nome, setor, número de série)
    if (search) {
      const term = search.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.nome_dispositivo?.toLowerCase().includes(term) ||
          d.setor?.toLowerCase().includes(term) ||
          d.numero_serie?.toLowerCase().includes(term) ||
          d.marca?.toLowerCase().includes(term) ||
          d.modelo?.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (type && type !== 'all') {
      devices = devices.filter((d) => d.tipo === type);
    }

    // Filtro por status
    if (status && status !== 'all') {
      devices = devices.filter((d) => d.status === status);
    }

    // Paginação
    const total = devices.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginated = devices.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
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
 * Busca um equipamento específico pelo ID
 */
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await sheetsService.getDeviceById(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Equipamento não encontrado',
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
 * Valida campos obrigatórios e gera ID único
 */
const createDevice = async (req, res) => {
  try {
    const {
      nome_dispositivo,
      tipo,
      marca,
      modelo,
      numero_serie,
      setor,
      status = 'Ativo',
      ticket = '',
      data_aquisicao = '',
      observacoes = '',
    } = req.body;

    // Validação de campos obrigatórios
    const requiredFields = { nome_dispositivo, tipo, marca, modelo, numero_serie, setor };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
      });
    }

    // Status válidos
    const validStatuses = ['Ativo', 'Em manutenção', 'Inativo'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status inválido. Use: ${validStatuses.join(', ')}`,
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
      status,
      ticket,
      data_aquisicao,
      data_cadastro: new Date().toISOString().split('T')[0], // YYYY-MM-DD
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
 * Atualiza dados de um equipamento existente
 */
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Não permite alterar o ID
    delete updateData.id;
    delete updateData.data_cadastro;

    // Valida status se fornecido
    if (updateData.status) {
      const validStatuses = ['Ativo', 'Em manutenção', 'Inativo'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: `Status inválido. Use: ${validStatuses.join(', ')}`,
        });
      }
    }

    const updated = await sheetsService.updateDevice(id, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Equipamento não encontrado',
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
        message: 'Equipamento não encontrado',
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
 * Retorna estatísticas para o dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const devices = await sheetsService.getAllDevices();

    const stats = {
      total: devices.length,
      ativos: devices.filter((d) => d.status === 'Ativo').length,
      em_manutencao: devices.filter((d) => d.status === 'Em manutenção').length,
      inativos: devices.filter((d) => d.status === 'Inativo').length,
    };

    // Agrupamento por setor
    const porSetor = devices.reduce((acc, d) => {
      const setor = d.setor || 'Sem setor';
      acc[setor] = (acc[setor] || 0) + 1;
      return acc;
    }, {});

    // Agrupamento por tipo
    const porTipo = devices.reduce((acc, d) => {
      const tipo = d.tipo || 'Sem tipo';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        ...stats,
        por_setor: porSetor,
        por_tipo: porTipo,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message,
    });
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getDashboardStats,
};
