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

export const STATUS_OPTIONS = ['Ativo', 'Em manutenção', 'Inativo'];

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
  Ativo: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'Em manutenção': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Inativo: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

export const STATUS_ICONS = {
  Ativo: 'OK',
  'Em manutenção': 'TOOL',
  Inativo: 'X',
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
