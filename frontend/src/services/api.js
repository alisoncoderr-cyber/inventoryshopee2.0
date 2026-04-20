// ============================================================
// services/api.js
// Camada de servico para comunicacao com o backend
// ============================================================

import axios from 'axios';

const DEFAULT_LOCAL_API_URL = 'http://localhost:3001/api';
const DEFAULT_PRODUCTION_API_URL = 'https://inventory-backend.onrender.com/api';

const normalizeApiUrl = (value = '') => value.replace(/\/+$/, '');

const isPrivateNetworkHost = (hostname = '') => {
  if (!hostname) return false;

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  ) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

  const private172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
};

const resolveApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return normalizeApiUrl(process.env.REACT_APP_API_URL);
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_API_URL;
  }

  const { hostname, port, origin } = window.location;

  if (isPrivateNetworkHost(hostname)) {
    if (port === '3000' || port === '5173') {
      return `http://${hostname}:3001/api`;
    }

    return `${normalizeApiUrl(origin)}/api`;
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
