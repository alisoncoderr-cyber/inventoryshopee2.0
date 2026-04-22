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

export const STATUS_OPTIONS = ['Ativo', 'Em manutencao', 'Inativo'];

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

const maintenanceTone = { bg: '#fef3c7', text: '#b45309', border: 'rgba(245, 158, 11, 0.24)' };

export const STATUS_COLORS = {
  Ativo: { bg: '#dcfce7', text: '#166534', border: 'rgba(34, 197, 94, 0.22)' },
  Inativo: { bg: '#fee2e2', text: '#b91c1c', border: 'rgba(239, 68, 68, 0.22)' },
  'Em manutencao': maintenanceTone,
  'Em manutencao ': maintenanceTone,
  'Em manutenÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o': maintenanceTone,
  'Em manutenÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o': maintenanceTone,
};

export const STATUS_ICONS = {
  Ativo: 'OK',
  Inativo: 'X',
  'Em manutencao': 'TOOL',
  'Em manutencao ': 'TOOL',
  'Em manutenÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o': 'TOOL',
  'Em manutenÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o': 'TOOL',
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
  'ExpediÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o': 'Expedicao',
  'ExpediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o': 'Expedicao',
  Expedicao: 'Expedicao',
  'OperaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes': 'Operacao',
  'OperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes': 'Operacao',
  Operacoes: 'Operacao',
  'OperaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o': 'Operacao',
  'OperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o': 'Operacao',
  Administracao: 'ADM',
  'AdministraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o': 'ADM',
  'AdministraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o': 'ADM',
  Fulfillment: 'Fullfilment',
};
