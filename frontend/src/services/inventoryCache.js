import { fetchDevices } from './api';
import { isMaintenanceStatus, normalizeSectorName, sortDevices } from '../utils/deviceHelpers';

const CACHE_TTL_MS = 90 * 1000;

let inventoryCache = null;
let inventoryCacheTimestamp = 0;
let inventoryCachePromise = null;

const isCacheFresh = () =>
  inventoryCache && Date.now() - inventoryCacheTimestamp < CACHE_TTL_MS;

export const getInventoryDevices = async ({ force = false } = {}) => {
  if (!force && isCacheFresh()) {
    return inventoryCache;
  }

  if (!force && inventoryCachePromise) {
    return inventoryCachePromise;
  }

  inventoryCachePromise = fetchDevices({ page: 1, limit: 1000 })
    .then((result) => {
      inventoryCache = result.data || [];
      inventoryCacheTimestamp = Date.now();
      return inventoryCache;
    })
    .finally(() => {
      inventoryCachePromise = null;
    });

  return inventoryCachePromise;
};

export const invalidateInventoryCache = () => {
  inventoryCache = null;
  inventoryCacheTimestamp = 0;
  inventoryCachePromise = null;
};

export const buildInventoryStats = (devices = []) => {
  const ativos = devices.filter((device) => device.status === 'Ativo').length;
  const emManutencao = devices.filter((device) =>
    isMaintenanceStatus(device.status)
  ).length;
  const inativos = devices.filter((device) => device.status === 'Inativo').length;
  const comTicket = devices.filter((device) =>
    String(device.ticket || '').trim()
  ).length;
  const laptopsAtribuidos = devices.filter(
    (device) =>
      device.tipo === 'Laptop' && String(device.pessoa_atribuida || '').trim()
  ).length;

  const porSetor = devices.reduce((acc, device) => {
    const sector = normalizeSectorName(device.setor);
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {});

  const porTipo = devices.reduce((acc, device) => {
    const type = device.tipo || 'Nao informado';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    total: devices.length,
    ativos,
    em_manutencao: emManutencao,
    inativos,
    com_ticket: comTicket,
    laptops_atribuidos: laptopsAtribuidos,
    percentual_ativos: devices.length ? Math.round((ativos / devices.length) * 100) : 0,
    por_setor: porSetor,
    por_tipo: porTipo,
    recentes: sortDevices(devices, 'recent').slice(0, 6),
  };
};
