// ============================================================
// utils/constants.js
// Constantes compartilhadas no frontend
// ============================================================

export const EQUIPMENT_TYPES = [
  'PDA',
  'Desktop',
  'Bateria de PDA',
  'Impressora de Etiqueta',
  'Bancada',
  'Leitor 2D',
  'Laptop',
  'Monitor',
  'Mouse',
  'Kit Mouse/Teclado',
  'Paleteira',
  'Gaiola',
  'Berço de PDA',
  'Tablet',
  'Impressora A4',
];

export const STATUS_OPTIONS = ['Ativo', 'Em manutenção', 'Inativo'];

export const SECTORS = [
  'Recebimento',
  'Expedição',
  'Armazenagem',
  'TI',
  'Administração',
  'Operações',
  'Qualidade',
  'Manutenção',
  'RH',
  'Financeiro',
];

export const STATUS_COLORS = {
  'Ativo': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  'Em manutenção': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'Inativo': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

export const STATUS_ICONS = {
  'Ativo': '✅',
  'Em manutenção': '🔧',
  'Inativo': '❌',
};

export const TYPE_ICONS = {
  'PDA': '📱',
  'Desktop': '🖥️',
  'Bateria de PDA': '🔋',
  'Impressora de Etiqueta': '🖨️',
  'Bancada': '🪑',
  'Leitor 2D': '📷',
  'Laptop': '💻',
  'Monitor': '🖥️',
  'Mouse': '🖱️',
  'Kit Mouse/Teclado': '⌨️',
  'Paleteira': '🏭',
  'Gaiola': '📦',
  'Berço de PDA': '🔌',
  'Tablet': '📱',
  'Impressora A4': '🖨️',
};
