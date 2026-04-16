# 📦 InvControl — Sistema de Inventário de Equipamentos

Sistema completo de inventário para operações logísticas com React + Node.js + Google Sheets.

---

## 🗂️ Estrutura do Projeto

```
inventory-system/
├── backend/
│   ├── src/
│   │   ├── server.js                  # Entry point do Express
│   │   ├── routes/
│   │   │   └── devices.js             # Definição de rotas REST
│   │   ├── controllers/
│   │   │   └── devicesController.js   # Lógica de negócio
│   │   └── services/
│   │       └── googleSheets.js        # Integração com Google Sheets API
│   ├── .env.example                   # Template de variáveis de ambiente
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.js                   # Entry point do React
    │   ├── App.jsx                    # Layout e navegação
    │   ├── pages/
    │   │   ├── Dashboard.jsx          # Dashboard com métricas e gráficos
    │   │   └── Devices.jsx            # Listagem com filtros e paginação
    │   ├── components/
    │   │   └── DeviceForm.jsx         # Modal de criação/edição
    │   ├── services/
    │   │   └── api.js                 # Camada de comunicação com backend
    │   └── utils/
    │       └── constants.js           # Tipos, status, setores e ícones
    ├── .env.example
    └── package.json
```

---

## ☁️ PASSO 1 — Configurar Google Cloud e Google Sheets

### 1.1 — Criar projeto no Google Cloud

1. Acesse [https://console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Novo Projeto"**
3. Dê um nome (ex: `inventario-logistica`) e clique em **Criar**

### 1.2 — Ativar a Google Sheets API

1. No projeto criado, vá em **APIs e Serviços → Biblioteca**
2. Pesquise por **"Google Sheets API"**
3. Clique em **Ativar**

### 1.3 — Criar Service Account (conta de serviço)

1. Vá em **APIs e Serviços → Credenciais**
2. Clique em **"Criar credenciais" → Service Account**
3. Preencha:
   - Nome: `inventario-sheets`
   - ID: gerado automaticamente
4. Clique em **Criar e Continuar → Concluir**

### 1.4 — Gerar chave JSON da Service Account

1. Clique na service account criada
2. Vá na aba **"Chaves"**
3. Clique em **"Adicionar chave" → Criar nova chave → JSON**
4. Faça o download do arquivo JSON — **guarde com segurança!**

O arquivo JSON tem esta estrutura:
```json
{
  "type": "service_account",
  "project_id": "seu-projeto-id",
  "client_email": "inventario-sheets@seu-projeto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
  ...
}
```

### 1.5 — Criar a Planilha Google Sheets

1. Acesse [https://sheets.google.com](https://sheets.google.com)
2. Crie uma nova planilha
3. Renomeie a aba para **"Equipamentos"** (clique duplo na aba)
4. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/  [ESTE_É_O_ID]  /edit
   ```

### 1.6 — Compartilhar a planilha com a Service Account

1. Na planilha, clique em **"Compartilhar"** (canto superior direito)
2. No campo de e-mail, cole o `client_email` do JSON da service account
   - Ex: `inventario-sheets@seu-projeto.iam.gserviceaccount.com`
3. Defina permissão como **"Editor"**
4. Desmarque "Notificar pessoas" e clique em **Compartilhar**

> ✅ Agora o backend pode ler e escrever na planilha automaticamente.

---

## ⚙️ PASSO 2 — Configurar o Backend

### 2.1 — Instalar dependências

```bash
cd backend
npm install
```

### 2.2 — Criar arquivo .env

```bash
cp .env.example .env
```

Edite o arquivo `.env` com os dados do JSON da service account:

```env
PORT=3001

GOOGLE_SPREADSHEET_ID=seu_id_da_planilha_aqui
GOOGLE_SHEET_NAME=Equipamentos

GOOGLE_SERVICE_ACCOUNT_EMAIL=inventario-sheets@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nSUA_CHAVE_AQUI\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=seu-projeto-id

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> ⚠️ **ATENÇÃO com a PRIVATE_KEY:**
> - Copie o valor completo de `private_key` do arquivo JSON
> - Substitua quebras de linha reais por `\n` (literal)
> - Coloque o valor entre aspas duplas no `.env`

### 2.3 — Rodar o backend

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

Saída esperada:
```
🔌 Conectando ao Google Sheets...
✅ Google Sheets conectado com sucesso
✅ Planilha já inicializada

🚀 Servidor rodando em http://localhost:3001
📋 Health check: http://localhost:3001/health
🔗 API Base URL: http://localhost:3001/api
```

---

## ⚛️ PASSO 3 — Configurar o Frontend

### 3.1 — Instalar dependências

```bash
cd frontend
npm install
```

### 3.2 — Criar arquivo .env (opcional)

```bash
cp .env.example .env
```

O proxy já está configurado no `package.json` para redirecionar para `localhost:3001`.
Em produção, edite o `.env`:

```env
REACT_APP_API_URL=https://sua-api-em-producao.com/api
```

### 3.3 — Rodar o frontend

```bash
npm start
```

Acesse: **http://localhost:3000**

---

## 🧪 PASSO 4 — Testar a API

### Health Check
```bash
curl http://localhost:3001/health
```

### Listar equipamentos
```bash
curl http://localhost:3001/api/devices
```

### Criar equipamento
```bash
curl -X POST http://localhost:3001/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "nome_dispositivo": "PDA-Recebimento-01",
    "tipo": "PDA",
    "marca": "Zebra",
    "modelo": "TC52",
    "numero_serie": "SN123456789",
    "setor": "Recebimento",
    "status": "Ativo",
    "data_aquisicao": "2024-01-15",
    "observacoes": "PDA principal do setor"
  }'
```

### Atualizar status
```bash
curl -X PUT http://localhost:3001/api/devices/ID_AQUI \
  -H "Content-Type: application/json" \
  -d '{"status": "Em manutenção", "ticket": "TKT-2024-0042"}'
```

### Deletar equipamento
```bash
curl -X DELETE http://localhost:3001/api/devices/ID_AQUI
```

### Dashboard stats
```bash
curl http://localhost:3001/api/dashboard
```

### Filtros e busca
```bash
# Buscar por nome
curl "http://localhost:3001/api/devices?search=PDA"

# Filtrar por tipo e status
curl "http://localhost:3001/api/devices?type=PDA&status=Ativo"

# Com paginação
curl "http://localhost:3001/api/devices?page=2&limit=10"
```

---

## 📊 Estrutura da Planilha Google Sheets

A planilha é criada automaticamente com os seguintes cabeçalhos:

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| A | id | UUID único gerado automaticamente |
| B | nome_dispositivo | Nome/identificador do equipamento |
| C | tipo | Tipo do equipamento (PDA, Desktop, etc.) |
| D | marca | Fabricante |
| E | modelo | Modelo específico |
| F | numero_serie | Número de série do fabricante |
| G | setor | Setor onde está alocado |
| H | status | Ativo / Em manutenção / Inativo |
| I | ticket | Número do ticket de manutenção |
| J | data_aquisicao | Data de compra/aquisição |
| K | data_cadastro | Data de cadastro no sistema |
| L | observacoes | Notas e informações adicionais |

---

## 🔗 Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do servidor |
| GET | `/api/dashboard` | Estatísticas e métricas |
| GET | `/api/devices` | Lista equipamentos (com filtros) |
| GET | `/api/devices/:id` | Busca por ID |
| POST | `/api/devices` | Cria novo equipamento |
| PUT | `/api/devices/:id` | Atualiza equipamento |
| DELETE | `/api/devices/:id` | Remove equipamento |

### Query Params — GET /api/devices

| Param | Tipo | Descrição |
|-------|------|-----------|
| search | string | Busca em nome, setor, marca, modelo, série |
| type | string | Filtro por tipo de equipamento |
| status | string | Filtro por status |
| page | number | Página atual (padrão: 1) |
| limit | number | Itens por página (padrão: 20) |

---

## 🚀 Deploy em Produção

O caminho mais estável para este projeto é:

- Frontend no Vercel
- Backend no Render

Arquivos de apoio já preparados no repositório:

- `frontend/vercel.json`
- `backend/.env.example`
- `render.yaml`
- `DEPLOY.md`

### Backend (Render)
1. Faça push para um repositório Git
2. Crie um Web Service com `Root Directory = backend`
3. Configure as variáveis de ambiente da service account e da planilha
4. Inicie com `npm start`

### Frontend (Vercel)
1. Importe o mesmo repositório no Vercel
2. Defina `Root Directory = frontend`
3. Configure `REACT_APP_API_URL` apontando para o backend em produção
4. Faça o deploy

Veja o passo a passo completo em `DEPLOY.md`.

---

## 🐛 Troubleshooting

**Erro: "Google Sheets: The caller does not have permission"**
→ Verifique se a planilha foi compartilhada com o email da service account como Editor.

**Erro: "Invalid JWT Signature"**
→ A `GOOGLE_PRIVATE_KEY` está incorreta. Certifique-se de que as quebras de linha `\n` estão presentes e o valor está entre aspas.

**CORS error no frontend**
→ Verifique `ALLOWED_ORIGINS` no `.env` do backend. Adicione a URL do frontend.

**Planilha não encontrada**
→ Confirme que `GOOGLE_SPREADSHEET_ID` e `GOOGLE_SHEET_NAME` estão corretos.

---

## 📝 Tipos de Equipamentos Suportados

- PDA · Desktop · Bateria de PDA · Impressora de Etiqueta · Bancada
- Leitor 2D · Laptop · Monitor · Mouse · Kit Mouse/Teclado
- Paleteira · Gaiola · Berço de PDA · Tablet · Impressora A4
