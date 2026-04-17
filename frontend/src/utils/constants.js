// ============================================================
// utils/constants.js
// Constantes compartilhadas no frontend
// ============================================================

export const EQUIPMENT_TYPES = [
  'PDA',
  'Gatilho PDA',
  'Desktop',
  'Bateria de PDA',
  'Carregador Bateria PDA',
  'Impressora de Etiqueta',
  'Bancada',
  'Leitor 2D',
  'Laptop',
  'Monitor',
  'Mouse',
  'Kit Mouse/Teclado',
  'Paleteira',
  'Gaiola',
  'Berco de PDA',
  'Tablet',
  'Impressora A4',
];

export const STATUS_OPTIONS = ['Ativo', 'Em manutenÃ§Ã£o', 'Inativo'];

export const SECTORS = [
  'Esteira',
  'Expedicao',
  'Recebimento',
  'Operacao',
  'TI',
  'ADM',
  'COP',
  'Security',
  'Fullfilment',
];

export const STATUS_COLORS = {
  Ativo: { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.35)' },
  Inativo: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
  'Em manutenÃ§Ã£o': { bg: 'rgba(249,115,22,0.15)', text: '#fdba74', border: 'rgba(249,115,22,0.35)' },
  'Em manutenÃƒÂ§ÃƒÂ£o': { bg: 'rgba(249,115,22,0.15)', text: '#fdba74', border: 'rgba(249,115,22,0.35)' },
};

export const STATUS_ICONS = {
  Ativo: 'OK',
  Inativo: 'X',
  'Em manutenÃ§Ã£o': 'TOOL',
  'Em manutenÃƒÂ§ÃƒÂ£o': 'TOOL',
};

export const TYPE_ICONS = {
  PDA: 'PDA',
  'Gatilho PDA': 'TRG',
  Desktop: 'PC',
  'Bateria de PDA': 'BAT',
  'Carregador Bateria PDA': 'CHG',
  'Impressora de Etiqueta': 'PRN',
  Bancada: 'BNK',
  'Leitor 2D': '2D',
  Laptop: 'LPT',
  Monitor: 'MON',
  Mouse: 'MSE',
  'Kit Mouse/Teclado': 'KIT',
  Paleteira: 'PAL',
  Gaiola: 'GAI',
  'Berco de PDA': 'CRD',
  Tablet: 'TAB',
  'Impressora A4': 'A4',
};

export const SECTOR_ALIASES = {
  'ExpediÃ§Ã£o': 'Expedicao',
  'Expedição': 'Expedicao',
  Expedicao: 'Expedicao',
  'OperaÃ§Ãµes': 'Operacao',
  'Operações': 'Operacao',
  Operacoes: 'Operacao',
  'OperaÃ§Ã£o': 'Operacao',
  'Operação': 'Operacao',
  Administracao: 'ADM',
  'AdministraÃ§Ã£o': 'ADM',
  'Administração': 'ADM',
  Fulfillment: 'Fullfilment',
};
