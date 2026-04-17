// ============================================================
// services/googleSheets.js
// Serviço de integração com Google Sheets via API
// ============================================================

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID?.trim();
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME?.trim() || 'Equipamentos';
const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');

const getSheetRange = (range) => {
  const escapedSheetName = SHEET_NAME.replace(/'/g, "''");
  return `'${escapedSheetName}'!${range}`;
};

const normalizePrivateKey = (privateKey = '') => {
  return privateKey.replace(/\\n/g, '\n').trim();
};

const getCredentialsFromEnv = () => {
  const projectId = process.env.GOOGLE_PROJECT_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    type: 'service_account',
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
};

const getCredentialsFromFile = () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }

  const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  return {
    type: 'service_account',
    project_id: parsed.project_id?.trim(),
    client_email: parsed.client_email?.trim(),
    private_key: normalizePrivateKey(parsed.private_key),
  };
};

const getGoogleCredentials = () => {
  const envCredentials = getCredentialsFromEnv();
  if (envCredentials) {
    return envCredentials;
  }

  const fileCredentials = getCredentialsFromFile();
  if (fileCredentials) {
    return fileCredentials;
  }

  throw new Error(
    'Credenciais do Google nÃ£o encontradas. Configure as variÃ¡veis GOOGLE_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY ou mantenha um arquivo backend/credentials.json vÃ¡lido.'
  );
};

const validateSheetsConfig = () => {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SPREADSHEET_ID nÃ£o foi configurado.');
  }
};

/**
 * Cria e retorna um cliente autenticado do Google Sheets
 * Utiliza Service Account para autenticação server-to-server
 */
const getAuthClient = () => {
  validateSheetsConfig();
  const credentials = getGoogleCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
};

/**
 * Retorna instância do Sheets API autenticada
 */
const getSheetsClient = async () => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
};

/**
 * Cabeçalhos da planilha - ordem das colunas
 * IMPORTANTE: A ordem aqui deve corresponder exatamente à planilha
 */
const HEADERS = [
  'id',
  'nome_dispositivo',
  'tipo',
  'marca',
  'modelo',
  'numero_serie',
  'setor',
  'status',
  'ticket',
  'data_aquisicao',
  'data_cadastro',
  'observacoes',
  'pessoa_atribuida',
];

const normalizeSerial = (value = '') => String(value).trim().toLowerCase();

/**
 * Converte uma linha do Sheets (array) em objeto JavaScript
 * @param {Array} row - Linha da planilha
 * @returns {Object} Objeto com campos nomeados
 */
const rowToObject = (row) => {
  const obj = {};
  HEADERS.forEach((header, index) => {
    obj[header] = row[index] || '';
  });
  return obj;
};

/**
 * Converte um objeto JavaScript em linha do Sheets (array)
 * @param {Object} obj - Objeto com dados do equipamento
 * @returns {Array} Array na ordem correta dos headers
 */
const objectToRow = (obj) => {
  return HEADERS.map((header) => obj[header] || '');
};

/**
 * Busca todos os equipamentos da planilha
 * @returns {Array} Lista de equipamentos
 */
const getAllDevices = async () => {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
  });

  const rows = response.data.values || [];

  // Remove a primeira linha (cabeçalhos) e converte para objetos
  if (rows.length <= 1) return [];

  return rows.slice(1).map(rowToObject);
};

/**
 * Busca um equipamento pelo ID
 * @param {string} id - ID do equipamento
 * @returns {Object|null} Equipamento encontrado ou null
 */
const getDeviceById = async (id) => {
  const devices = await getAllDevices();
  return devices.find((d) => d.id === id) || null;
};

const findDeviceBySerial = async (serial, ignoreId = null) => {
  if (!serial) return null;

  const devices = await getAllDevices();
  const normalized = normalizeSerial(serial);

  return (
    devices.find(
      (device) =>
        normalizeSerial(device.numero_serie) === normalized &&
        device.id !== ignoreId
    ) || null
  );
};

/**
 * Cria a linha de cabeçalho na planilha (caso não exista)
 * Chamado na inicialização do servidor
 */
const initializeSheet = async () => {
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const existingSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties.title === SHEET_NAME
  );

  if (!existingSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAME,
              },
            },
          },
        ],
      },
    });
    console.log(`Aba "${SHEET_NAME}" criada na planilha`);
  }

  // Verifica se já existe cabeçalho
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A1:M1'),
  });

  const existingHeaders = response.data.values?.[0] || [];

  if (existingHeaders.length === 0) {
    // Cria os cabeçalhos
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange('A1:M1'),
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS],
      },
    });
    console.log('✅ Cabeçalhos criados na planilha');
  } else {
    console.log('✅ Planilha já inicializada');
  }
};

/**
 * Adiciona um novo equipamento na planilha
 * @param {Object} device - Dados do equipamento
 * @returns {Object} Equipamento criado
 */
const createDevice = async (device) => {
  const sheets = await getSheetsClient();
  const row = objectToRow(device);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  return device;
};

const createDevicesBulk = async (devices) => {
  const sheets = await getSheetsClient();
  const rows = devices.map(objectToRow);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });

  return devices;
};

/**
 * Atualiza um equipamento existente na planilha
 * @param {string} id - ID do equipamento
 * @param {Object} updatedData - Dados atualizados
 * @returns {Object|null} Equipamento atualizado ou null se não encontrado
 */
const updateDevice = async (id, updatedData) => {
  const sheets = await getSheetsClient();

  // Busca todas as linhas para encontrar o índice
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
  });

  const rows = response.data.values || [];

  // Encontra a linha pelo ID (linha 0 é cabeçalho, linha 1 em diante são dados)
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);

  if (rowIndex === -1) return null;

  // Monta objeto completo com dados existentes + atualizações
  const existingDevice = rowToObject(rows[rowIndex]);
  const mergedDevice = { ...existingDevice, ...updatedData, id };
  const updatedRow = objectToRow(mergedDevice);

  // Linha no Sheets é 1-indexed, +1 para pular o cabeçalho
  const sheetRowNumber = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange(`A${sheetRowNumber}:M${sheetRowNumber}`),
    valueInputOption: 'RAW',
    requestBody: {
      values: [updatedRow],
    },
  });

  return mergedDevice;
};

/**
 * Remove um equipamento da planilha
 * Utiliza batchUpdate para deletar a linha física
 * @param {string} id - ID do equipamento
 * @returns {boolean} true se deletado, false se não encontrado
 */
const deleteDevice = async (id) => {
  const sheets = await getSheetsClient();

  // Busca todas as linhas
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:A'),
  });

  const ids = (response.data.values || []).map((row) => row[0]);
  const rowIndex = ids.findIndex((rowId, index) => index > 0 && rowId === id);

  if (rowIndex === -1) return false;

  // Busca o sheetId da aba pelo nome
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === SHEET_NAME
  );

  if (!sheet) throw new Error(`Aba "${SHEET_NAME}" não encontrada`);

  const sheetId = sheet.properties.sheetId;

  // Deleta a linha usando batchUpdate
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,   // 0-indexed
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
};

module.exports = {
  getAllDevices,
  getDeviceById,
  findDeviceBySerial,
  createDevice,
  createDevicesBulk,
  updateDevice,
  deleteDevice,
  initializeSheet,
};
