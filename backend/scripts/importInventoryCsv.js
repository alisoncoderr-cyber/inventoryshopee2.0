require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sheetsService = require('../src/services/googleSheets');

const DEFAULT_DOWNLOADS_DIR = path.resolve(process.env.USERPROFILE || '', 'Downloads');
const DEFAULT_FILE_PATTERN = /^Copy of Invent.+Soc-PE2.+Descri.+\.csv$/i;
const APPLY_FLAG = '--apply';

const TYPE_ALIASES = new Map([
  ['2d reader (leitores)', 'Leitor 2D'],
  ['bandoleiras', 'Bandoleira'],
  ['baterias de pda', 'Bateria de PDA'],
  ['berco de pda', 'Berco de PDA'],
  ['berço de pda', 'Berco de PDA'],
  ['carregador de bateria - pdas', 'Carregador Bateria PDA'],
  ['carregador de bateria - pda´s', 'Carregador Bateria PDA'],
  ['coldre pda', 'Coldre PDA'],
  ['desktops', 'Desktop'],
  ['gatilhos pdas', 'Gatilho PDA'],
  ['gatilhos pda´s', 'Gatilho PDA'],
  ['impresora', 'Impressora'],
  ['keyboard (teclado)', 'Teclado'],
  ['label printers', 'Impressora de Etiqueta'],
  ['radio comunicador', 'Radio comunicador'],
  ['rádio comunicador', 'Radio comunicador'],
]);

const SECTOR_ALIASES = new Map([
  ['expedicao', 'Expedicao'],
  ['operacao', 'Operacao'],
  ['full', 'Fullfilment'],
]);

const STATUS_ALIASES = new Map([
  ['em uso', 'Ativo'],
  ['guardado', 'Ativo'],
  ['recebido', 'Ativo'],
  ['emprestado', 'Ativo'],
  ['em manutenção', 'Em manutencao'],
  ['em manutencao', 'Em manutencao'],
  ['não encontrado', 'Inativo'],
  ['nao encontrado', 'Inativo'],
  ['transferido', 'Inativo'],
]);

const stripAccents = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeKey = (value = '') => stripAccents(value).trim().toLowerCase();
const clean = (value = '') => String(value || '').trim();

const parseCsv = (input) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) row.push(field);
  if (row.length) rows.push(row);

  return rows.filter((csvRow) => csvRow.some((value) => clean(value)));
};

const findDefaultCsv = () => {
  const files = fs.readdirSync(DEFAULT_DOWNLOADS_DIR);
  const fileName = files.find((name) => DEFAULT_FILE_PATTERN.test(name));

  if (!fileName) {
    throw new Error(`CSV nao encontrado em ${DEFAULT_DOWNLOADS_DIR}`);
  }

  return path.join(DEFAULT_DOWNLOADS_DIR, fileName);
};

const getCsvPath = () => {
  const positionalArg = process.argv.find((arg) => arg.toLowerCase().endsWith('.csv'));
  return positionalArg ? path.resolve(positionalArg) : findDefaultCsv();
};

const parseDateToIso = (value = '') => {
  const raw = clean(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return raw;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const normalizeType = (item, model) => {
  const raw = clean(item);
  const rawKey = normalizeKey(raw).replace(/´/g, '');

  if (rawKey && TYPE_ALIASES.has(rawKey)) return TYPE_ALIASES.get(rawKey);
  if (!raw && normalizeKey(model).includes('zebra tc21')) return 'PDA';

  return raw;
};

const normalizeSector = (setor, local) => {
  const primary = clean(setor) || clean(local) || 'Nao informado';
  const key = normalizeKey(primary);
  return SECTOR_ALIASES.get(key) || primary;
};

const normalizeStatus = (status) => {
  const raw = clean(status);
  const key = normalizeKey(raw);
  return STATUS_ALIASES.get(key) || 'Ativo';
};

const buildObservations = (row) => {
  const extras = [
    ['Local', row.Local],
    ['Usuario', row['Usuário']],
    ['Entrega no TI', row['Entrega no TI']],
    ['Motivo quebra', row['Motivo quebra']],
    ['Diagnostico', row['Diagnóstico']],
    ['Custo conserto', row['Custo conserto']],
    ['Recomendacao TI', row['Recomendação TI']],
    ['Local de transferencia', row['Local de transferência ( caso houver)']],
    ['Status original', row.Status],
    ['Linha CSV', row.__lineNumber],
  ];

  return extras
    .filter(([, value]) => clean(value))
    .map(([label, value]) => `${label}: ${clean(value)}`)
    .join(' | ');
};

const loadCsvDevices = (csvPath) => {
  const text = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  const headers = rows[0].map((header) => clean(header));

  return rows.slice(1).map((row, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header, clean(row[columnIndex])]));
    const lineNumber = index + 2;
    raw.__lineNumber = lineNumber;

    const tipo = normalizeType(raw.Item, raw.Modelo);
    const dataCadastro = parseDateToIso(raw['Data de criação']) || new Date().toISOString().split('T')[0];

    return {
      sourceLine: lineNumber,
      raw,
      device: {
        id: uuidv4(),
        nome_dispositivo: tipo,
        tipo,
        marca: clean(raw.Marca),
        modelo: clean(raw.Modelo),
        numero_serie: clean(raw['Numero de serie']),
        setor: normalizeSector(raw.Setor, raw.Local),
        pessoa_atribuida: tipo === 'Laptop' ? clean(raw['Usuário']) : '',
        status: normalizeStatus(raw.Status),
        ticket: clean(raw['Ticket number']),
        data_aquisicao: parseDateToIso(raw['Inventory  Date']),
        data_cadastro: dataCadastro,
        observacoes: buildObservations(raw),
      },
    };
  });
};

const getMissingFields = (device) =>
  ['tipo', 'marca', 'modelo', 'numero_serie', 'setor'].filter((field) => !clean(device[field]));

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const main = async () => {
  const csvPath = getCsvPath();
  const apply = process.argv.includes(APPLY_FLAG);
  const loaded = loadCsvDevices(csvPath);
  const invalidRows = [];
  const duplicateCsvRows = [];
  const seenCsvSerials = new Set();
  const validUniqueDevices = [];

  loaded.forEach(({ sourceLine, device }) => {
    const missing = getMissingFields(device);
    const serialKey = normalizeKey(device.numero_serie);

    if (missing.length > 0) {
      invalidRows.push({ line: sourceLine, serial: device.numero_serie, missing });
      return;
    }

    if (seenCsvSerials.has(serialKey)) {
      duplicateCsvRows.push({ line: sourceLine, serial: device.numero_serie });
      return;
    }

    seenCsvSerials.add(serialKey);
    validUniqueDevices.push(device);
  });

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    csvPath,
    csvRows: loaded.length,
    validUniqueRows: validUniqueDevices.length,
    invalidRows: invalidRows.length,
    duplicateCsvRows: duplicateCsvRows.length,
    typeCounts: validUniqueDevices.reduce((acc, device) => {
      acc[device.tipo] = (acc[device.tipo] || 0) + 1;
      return acc;
    }, {}),
    sectorCounts: validUniqueDevices.reduce((acc, device) => {
      acc[device.setor] = (acc[device.setor] || 0) + 1;
      return acc;
    }, {}),
    statusCounts: validUniqueDevices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {}),
    invalidSample: invalidRows.slice(0, 10),
    duplicateSample: duplicateCsvRows.slice(0, 10),
  };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await sheetsService.initializeSheet();
  const existingDevices = await sheetsService.getAllDevices();
  const existingSerials = new Set(
    existingDevices.map((device) => normalizeKey(device.numero_serie)).filter(Boolean)
  );
  const devicesToImport = validUniqueDevices.filter(
    (device) => !existingSerials.has(normalizeKey(device.numero_serie))
  );

  for (const deviceChunk of chunk(devicesToImport, 100)) {
    await sheetsService.createDevicesBulk(deviceChunk);
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        existingSheetRows: existingDevices.length,
        importedRows: devicesToImport.length,
        skippedExistingSerialRows: validUniqueDevices.length - devicesToImport.length,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
