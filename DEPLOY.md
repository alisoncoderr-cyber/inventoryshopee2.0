# Deploy

Este projeto fica mais estavel com:

- `frontend` no Vercel
- `backend` no Render

## 1. Subir o codigo para o GitHub

Envie a pasta do projeto para um repositorio GitHub.

## 2. Publicar o backend no Render

Voce pode usar o arquivo `render.yaml` deste repositorio ou criar manualmente.

### Manual

1. Entre no Render
2. Clique em `New +` > `Web Service`
3. Conecte o repositorio
4. Configure:
   - `Root Directory`: `backend`
   - `Build Command`: `npm install`
   - `Start Command`: `npm start`
5. Configure as variaveis:
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SHEET_NAME`
   - `GOOGLE_PROJECT_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `ALLOWED_ORIGINS`
6. Em `ALLOWED_ORIGINS`, use a URL final do Vercel

### Exemplo de ALLOWED_ORIGINS

```env
ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

### Exemplo de GOOGLE_PRIVATE_KEY

Cole a chave completa da service account. Se necessario, mantenha as quebras como `\n`.

## 3. Publicar o frontend no Vercel

1. Entre no Vercel
2. Clique em `Add New...` > `Project`
3. Importe o mesmo repositorio
4. Em `Root Directory`, selecione `frontend`
5. Em `Environment Variables`, crie:

```env
REACT_APP_API_URL=https://SEU-BACKEND.onrender.com/api
```

6. Clique em `Deploy`

O arquivo `frontend/vercel.json` ja foi preparado para servir o app corretamente.

## 4. Atualizar o backend com a URL do frontend

Depois que o Vercel gerar a URL publica, volte no Render e ajuste:

```env
ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

Depois disso, faca um novo deploy no Render.

## 5. Teste final

1. Abra a URL do Vercel em outra maquina
2. Verifique se a lista de equipamentos carrega
3. Teste criar, editar e excluir um equipamento
4. Confirme se os dados entram no Google Sheets

## Observacoes

- Nao envie `backend/.env` nem `backend/credentials.json` para o GitHub
- Em producao, prefira usar as variaveis do Render em vez do arquivo `credentials.json`
- Se der erro de CORS, quase sempre o problema esta no `ALLOWED_ORIGINS`
