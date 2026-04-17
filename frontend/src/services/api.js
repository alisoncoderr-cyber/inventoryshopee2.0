// ============================================================
// services/api.js
// Camada de servico para comunicacao com o backend
// ============================================================

import axios from 'axios';

const DEFAULT_LOCAL_API_URL = 'http://localhost:3001/api';
const DEFAULT_PRODUCTION_API_URL = 'https://inventoryshopee2-0.onrender.com/api';

const resolveApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_API_URL;
  }

  const { hostname } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEFAULT_LOCAL_API_URL;
  }

  if (hostname.endsWith('.vercel.app')) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return DEFAULT_PRODUCTION_API_URL;
};

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.message === 'Network Error'
        ? 'Falha de comunicacao com o backend. Verifique a URL da API ou o CORS no Render.'
        : null) ||
      error.message ||
      'Erro de conexao com o servidor';

    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export const fetchDevices = async (params = {}) => {
  const response = await api.get('/devices', {
    params: { ...params, _ts: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });

  return response.data;
};

export const fetchDeviceById = async (id) => {
  const response = await api.get(`/devices/${id}`, {
    params: { _ts: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });

  return response.data;
};

export const createDevice = async (deviceData) => {
  const response = await api.post('/devices', deviceData);
  return response.data;
};

export const createDevicesBulk = async (devicesData = []) => {
  const response = await api.post('/devices/bulk', { devices: devicesData });
  return response.data;
};

export const updateDevice = async (id, deviceData) => {
  const response = await api.put(`/devices/${id}`, deviceData);
  return response.data;
};

export const deleteDevice = async (id) => {
  const response = await api.delete(`/devices/${id}`);
  return response.data;
};

export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard', {
    params: { _ts: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });

  return response.data;
};

export default api;
