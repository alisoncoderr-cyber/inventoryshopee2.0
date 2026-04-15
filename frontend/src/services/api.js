// ============================================================
// services/api.js
// Camada de serviço para comunicação com o backend
// ============================================================

import axios from 'axios';

// URL base da API - usa variável de ambiente ou localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos (Google Sheets pode ser lento)
});

// Interceptor para log de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Erro de conexão com o servidor';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// ============================================================
// EQUIPAMENTOS
// ============================================================

/**
 * Busca todos os equipamentos com filtros opcionais
 * @param {Object} params - Parâmetros de busca e paginação
 */
export const fetchDevices = async (params = {}) => {
  const response = await api.get('/devices', { params });
  return response.data;
};

/**
 * Busca um equipamento por ID
 * @param {string} id - ID do equipamento
 */
export const fetchDeviceById = async (id) => {
  const response = await api.get(`/devices/${id}`);
  return response.data;
};

/**
 * Cria um novo equipamento
 * @param {Object} deviceData - Dados do equipamento
 */
export const createDevice = async (deviceData) => {
  const response = await api.post('/devices', deviceData);
  return response.data;
};

/**
 * Cria varios equipamentos em sequencia
 * @param {Array} devicesData - Lista de equipamentos
 */
export const createDevicesBulk = async (devicesData = []) => {
  const results = [];

  for (const deviceData of devicesData) {
    const response = await createDevice(deviceData);
    results.push(response);
  }

  return results;
};

/**
 * Atualiza um equipamento existente
 * @param {string} id - ID do equipamento
 * @param {Object} deviceData - Dados atualizados
 */
export const updateDevice = async (id, deviceData) => {
  const response = await api.put(`/devices/${id}`, deviceData);
  return response.data;
};

/**
 * Remove um equipamento
 * @param {string} id - ID do equipamento
 */
export const deleteDevice = async (id) => {
  const response = await api.delete(`/devices/${id}`);
  return response.data;
};

/**
 * Busca estatísticas para o dashboard
 */
export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;
