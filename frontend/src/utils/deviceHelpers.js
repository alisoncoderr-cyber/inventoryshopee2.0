import { SECTOR_ALIASES } from './constants';

export const normalizeSectorName = (sector) =>
  !sector ? 'Nao informado' : SECTOR_ALIASES[sector] || sector;

export const isMaintenanceStatus = (status = '') =>
  String(status).toLowerCase().includes('manuten');

export const normalizeSearchText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const isAwaitingLeaderApproval = (device = {}) => {
  const searchableText = normalizeSearchText(
    [device.ticket, device.observacoes].filter(Boolean).join(' ')
  );

  return (
    searchableText.includes('aguardando aprovacao') ||
    searchableText.includes('pendente aprovacao') ||
    searchableText.includes('pendente aprovacao sl') ||
    searchableText.includes('aprovacao sl') ||
    searchableText.includes('aprovacao lider') ||
    searchableText.includes('aprovar lider') ||
    searchableText.includes('site lider')
  );
};

export const sortDevices = (items, sortBy) => {
  const sorted = [...items];

  if (sortBy === 'name') {
    return sorted.sort((a, b) =>
      (a.nome_dispositivo || '').localeCompare(b.nome_dispositivo || '')
    );
  }

  if (sortBy === 'sector') {
    return sorted.sort((a, b) => (a.setor || '').localeCompare(b.setor || ''));
  }

  if (sortBy === 'status') {
    return sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  }

  return sorted.sort((a, b) => (b.data_cadastro || '').localeCompare(a.data_cadastro || ''));
};
