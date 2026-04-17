// ============================================================
// services/googleSheets.js
// Integracao com Google Sheets
// ============================================================

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID?.trim();
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME?.trim() || 'Equipamentos';
const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');

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

const HEADER_LABELS = [
  'ID',
  'Identificacao Interna',
  'Tipo de Equipamento',
  'Marca',
  'Modelo',
  'Numero de Serie',
  'Setor',
  'Status',
  'Ticket',
  'Data de Aquisicao',
  'Data de Cadastro',
  'Observacoes',
  'Pessoa Atribuida',
];

const COLUMN_WIDTHS = [210, 220, 180, 120, 160, 180, 140, 130, 120, 130, 130, 260, 180];

const getSheetRange = (range) => {
  const escapedSheetName = SHEET_NAME.replace(/'/g, "''");
  return `'${escapedSheetName}'!${range}`;
};

const normalizePrivateKey = (privateKey = '') => privateKey.replace(/\\n/g, '\n').trim();
const normalizeSerial = (value = '') => String(value).trim().toLowerCase();

const getCredentialsFromEnv = () => {
  const projectId = process.env.GOOGLE_PROJECT_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    type: 'service_account',
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
};

const getCredentialsFromFile = () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;

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
  if (envCredentials) return envCredentials;

  const fileCredentials = getCredentialsFromFile();
  if (fileCredentials) return fileCredentials;

  throw new Error(
    'Credenciais do Google nao encontradas. Configure GOOGLE_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY ou mantenha backend/credentials.json valido.'
  );
};

const validateSheetsConfig = () => {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SPREADSHEET_ID nao foi configurado.');
  }
};

const getAuthClient = () => {
  validateSheetsConfig();
  return new google.auth.GoogleAuth({
    credentials: getGoogleCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getSheetsClient = async () => {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
};

const getSheetByName = (spreadsheet) =>
  spreadsheet.data.sheets?.find((sheet) => sheet.properties.title === SHEET_NAME);

const rowToObject = (row) => {
  const obj = {};
  HEADERS.forEach((header, index) => {
    obj[header] = row[index] || '';
  });
  return obj;
};

const objectToRow = (obj) => HEADERS.map((header) => obj[header] || '');

const ensureSheetFormatting = async (sheets, sheetId) => {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 1,
            },
            properties: {
              hiddenByUser: true,
            },
            fields: 'hiddenByUser',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 1,
              endIndex: 2,
            },
            properties: {
              hiddenByUser: true,
            },
            fields: 'hiddenByUser',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.96, green: 0.45, blue: 0.09 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                  bold: true,
                },
              },
            },
            fields:
              'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(verticalAlignment,wrapStrategy)',
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endColumnIndex: HEADERS.length,
              },
            },
          },
        },
      ],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: COLUMN_WIDTHS.map((pixelSize, index) => ({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1,
          },
          properties: { pixelSize },
          fields: 'pixelSize',
        },
      })),
    },
  });
};

const getAllDevices = async () => {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map(rowToObject);
};

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

const initializeSheet = async () => {
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  let existingSheet = getSheetByName(spreadsheet);

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

    const refreshedSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    existingSheet = getSheetByName(refreshedSpreadsheet);
    console.log(`Aba "${SHEET_NAME}" criada na planilha`);
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A1:M1'),
  });

  const existingHeaders = response.data.values?.[0] || [];

  if (existingHeaders.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: getSheetRange('A1:M1'),
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADER_LABELS],
      },
    });
    console.log('Cabecalhos criados na planilha');
  } else {
    const normalizedHeaders = existingHeaders.map((value) => String(value).trim().toLowerCase());
    const needsFriendlyHeaders = normalizedHeaders.some((value) => HEADERS.includes(value));

    if (needsFriendlyHeaders) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: getSheetRange('A1:M1'),
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADER_LABELS],
        },
      });
      console.log('Cabecalhos da planilha atualizados');
    } else {
      console.log('Planilha ja inicializada');
    }
  }

  if (existingSheet?.properties?.sheetId !== undefined) {
    await ensureSheetFormatting(sheets, existingSheet.properties.sheetId);
    console.log('Formatacao da planilha aplicada');
  }
};

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

const updateDevice = async (id, updatedData) => {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:M'),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);

  if (rowIndex === -1) return null;

  const existingDevice = rowToObject(rows[rowIndex]);
  const mergedDevice = { ...existingDevice, ...updatedData, id };
  const updatedRow = objectToRow(mergedDevice);
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

const deleteDevice = async (id) => {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: getSheetRange('A:A'),
  });

  const ids = (response.data.values || []).map((row) => row[0]);
  const rowIndex = ids.findIndex((rowId, index) => index > 0 && rowId === id);

  if (rowIndex === -1) return false;

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = getSheetByName(spreadsheet);

  if (!sheet) {
    throw new Error(`Aba "${SHEET_NAME}" nao encontrada`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
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
