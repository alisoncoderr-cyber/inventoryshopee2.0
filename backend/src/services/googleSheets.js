// ============================================================
// services/googleSheets.js
// Integracao com Google Sheets
// ============================================================

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
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
const VISIBLE_DATA_FIELDS = [
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

const getSheetRange = (range) => {
  const escapedSheetName = SHEET_NAME.replace(/'/g, "''");
  return `'${escapedSheetName}'!${range}`;
};

const normalizePrivateKey = (privateKey = '') => privateKey.replace(/\\n/g, '\n').trim();
const normalizeSerial = (value = '') => String(value).trim().toLowerCase();
const SERVICE_UNAVAILABLE_STATUS = 503;

const serviceState = {
  ready: false,
  initializing: false,
  lastError: null,
  lastSuccessAt: null,
  lastAttemptAt: null,
};

let initializationPromise = null;

class SheetsServiceUnavailableError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'SheetsServiceUnavailableError';
    this.statusCode = SERVICE_UNAVAILABLE_STATUS;
    this.cause = cause;
  }
}

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

const buildServiceUnavailableError = (error) =>
  new SheetsServiceUnavailableError(
    error?.message ||
      'A integracao com Google Sheets nao esta disponivel no momento. Verifique as credenciais e a conectividade.',
    error
  );

const updateServiceState = (partialState = {}) => {
  Object.assign(serviceState, partialState);
};

const getServiceStatus = () => ({
  ready: serviceState.ready,
  initializing: serviceState.initializing,
  lastError: serviceState.lastError,
  lastSuccessAt: serviceState.lastSuccessAt,
  lastAttemptAt: serviceState.lastAttemptAt,
});

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

const getCellString = (cell) => {
  if (!cell) return '';

  const value =
    cell.formattedValue ??
    cell.effectiveValue?.stringValue ??
    cell.effectiveValue?.numberValue ??
    cell.effectiveValue?.boolValue ??
    '';

  return String(value).trim();
};

const hasVisibleData = (device) =>
  VISIBLE_DATA_FIELDS.some((field) => String(device[field] || '').trim());

const loadSheetRows = async (sheets) => {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [getSheetRange('A1:M')],
    includeGridData: true,
  });

  const sheet = response.data.sheets?.[0];
  const rowData = sheet?.data?.[0]?.rowData || [];

  return {
    sheet,
    rows: rowData.map((row, index) => {
      const values = Array.from({ length: HEADERS.length }, (_, columnIndex) =>
        getCellString(row.values?.[columnIndex])
      );

      return {
        rowNumber: index + 1,
        values,
      };
    }),
  };
};

const syncRowMetadata = async (sheets, updates) => {
  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((update) => ({
        range: getSheetRange(`A${update.rowNumber}:B${update.rowNumber}`),
        values: [[update.id, update.nome_dispositivo]],
      })),
    },
  });
};

const clearOrphanMetadataRows = async (sheets, rowNumbers) => {
  if (rowNumbers.length === 0) return;

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      ranges: rowNumbers.map((rowNumber) => getSheetRange(`A${rowNumber}:M${rowNumber}`)),
    },
  });
};

const ensureSheetReady = async () => {
  if (serviceState.ready) return;

  await initializeSheet();

  if (!serviceState.ready) {
    throw buildServiceUnavailableError(
      new Error(
        serviceState.lastError ||
          'A integracao com Google Sheets nao foi inicializada com sucesso.'
      )
    );
  }
};

const getDevicesFromSheet = async () => {
  await ensureSheetReady();
  const sheets = await getSheetsClient();
  const { rows } = await loadSheetRows(sheets);

  if (rows.length <= 1) return [];

  const metadataUpdates = [];
  const orphanRows = [];
  const devices = [];

  rows.slice(1).forEach(({ rowNumber, values }) => {
    const device = rowToObject(values);

    if (!hasVisibleData(device)) {
      if (device.id || device.nome_dispositivo) {
        orphanRows.push(rowNumber);
      }
      return;
    }

    let nextId = device.id;
    let nextName = device.nome_dispositivo;

    if (!nextId) nextId = randomUUID();
    if (!nextName) nextName = device.tipo || device.modelo || device.numero_serie || `linha-${rowNumber}`;

    if (nextId !== device.id || nextName !== device.nome_dispositivo) {
      metadataUpdates.push({
        rowNumber,
        id: nextId,
        nome_dispositivo: nextName,
      });
    }

    devices.push({
      ...device,
      id: nextId,
      nome_dispositivo: nextName,
      _rowNumber: rowNumber,
    });
  });

  await syncRowMetadata(sheets, metadataUpdates);
  await clearOrphanMetadataRows(sheets, orphanRows);

  return devices;
};

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
  const devices = await getDevicesFromSheet();
  return devices.map(({ _rowNumber, ...device }) => device);
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
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    updateServiceState({
      initializing: true,
      lastAttemptAt: new Date().toISOString(),
    });

    try {
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
        const normalizedHeaders = existingHeaders.map((value) =>
          String(value).trim().toLowerCase()
        );
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

      updateServiceState({
        ready: true,
        initializing: false,
        lastError: null,
        lastSuccessAt: new Date().toISOString(),
      });
    } catch (error) {
      updateServiceState({
        ready: false,
        initializing: false,
        lastError: error.message,
      });
      throw buildServiceUnavailableError(error);
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

const createDevice = async (device) => {
  await ensureSheetReady();
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
  await ensureSheetReady();
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
  await ensureSheetReady();
  const sheets = await getSheetsClient();
  const devices = await getDevicesFromSheet();
  const existingDevice = devices.find((device) => device.id === id);

  if (!existingDevice) return null;

  const mergedDevice = { ...existingDevice, ...updatedData, id };
  const updatedRow = objectToRow(mergedDevice);
  const sheetRowNumber = existingDevice._rowNumber;

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
  await ensureSheetReady();
  const sheets = await getSheetsClient();
  const devices = await getDevicesFromSheet();
  const existingDevice = devices.find((device) => device.id === id);

  if (!existingDevice) return false;

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
              startIndex: existingDevice._rowNumber - 1,
              endIndex: existingDevice._rowNumber,
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
  getServiceStatus,
  initializeSheet,
  SheetsServiceUnavailableError,
};
