# Monsters.ia - YouTube Shorts Automation

Sistema de automação para publicação de vídeos no YouTube Shorts com agendamento via planilha Excel e integração com Google Drive.

## 📋 Visão Geral

O Monsters.ia é um aplicativo web completo que automatiza o processo de publicação de vídeos no YouTube Shorts. Ele permite:

- **Upload de planilha Excel** com calendário de publicações
- **Integração com Google Drive** para buscar vídeos automaticamente
- **Publicação automática** no YouTube Shorts nos horários agendados
- **Dashboard completo** para monitoramento e gerenciamento
- **Sistema de logs** para rastreamento de erros e sucessos

## 🚀 Funcionalidades

### Fase 1 - MVP (Implementado)

- ✅ Autenticação de usuários via Manus OAuth
- ✅ Conexão com Google Drive (OAuth)
- ✅ Conexão com YouTube Data API (OAuth)
- ✅ Upload de arquivo Excel (.xlsx)
- ✅ Parser automático de planilha com validação
- ✅ Agendamento de posts no banco de dados
- ✅ Worker de background (executa a cada 1 minuto)
- ✅ Publicação automática no YouTube Shorts
- ✅ Dashboard com estatísticas
- ✅ Listagem e filtros de posts
- ✅ Sistema de retry para falhas
- ✅ Configurações de fuso horário e pasta do Drive

### Roadmap Futuro

- 🔄 Integração com Instagram Reels
- 🔄 Integração com TikTok
- 🔄 Visualização de calendário mensal/semanal
- 🔄 Notificações em tempo real
- 🔄 Analytics e relatórios

## 📦 Tecnologias

### Backend
- **Node.js** + **Express**
- **tRPC** para comunicação type-safe
- **MySQL/TiDB** para banco de dados
- **Drizzle ORM** para queries
- **Google APIs** (Drive + YouTube)
- **node-cron** para agendamento

### Frontend
- **React 19** + **TypeScript**
- **Tailwind CSS 4** para estilização
- **shadcn/ui** para componentes
- **Wouter** para roteamento
- **TanStack Query** (via tRPC)

## 🔧 Configuração

### Variáveis de Ambiente

O sistema requer as seguintes variáveis de ambiente:

#### Variáveis do Sistema (Pré-configuradas)
```env
DATABASE_URL=<mysql-connection-string>
JWT_SECRET=<session-secret>
VITE_APP_ID=<manus-app-id>
OAUTH_SERVER_URL=<manus-oauth-url>
VITE_OAUTH_PORTAL_URL=<manus-portal-url>
OWNER_OPEN_ID=<owner-openid>
OWNER_NAME=<owner-name>
```

#### Variáveis Necessárias (Configurar)
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=<your-app-url>/api/oauth/google/callback
```

### Como Obter Credenciais do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative as APIs:
   - Google Drive API
   - YouTube Data API v3
4. Vá em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth 2.0"
5. Configure a tela de consentimento OAuth
6. Adicione os escopos necessários:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
7. Configure o URI de redirecionamento:
   - Desenvolvimento: `http://localhost:3000/api/oauth/google/callback`
   - Produção: `https://seu-dominio.com/api/oauth/google/callback`
8. Copie o Client ID e Client Secret

## 📊 Formato da Planilha Excel

A planilha deve conter as seguintes colunas:

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| Date | Data | Sim | Data da publicação (YYYY-MM-DD) |
| Time | Hora | Sim | Horário da publicação (HH:MM) |
| Platform | Texto | Sim | Plataforma (apenas "YouTube" ou "YouTube Shorts") |
| Title | Texto | Sim | Título do vídeo |
| Description | Texto | Não | Descrição do vídeo |
| Hashtags | Texto | Não | Hashtags (serão adicionadas à descrição) |
| Prompt | Texto | Não | Campo opcional para referência |
| Video File | Texto | Sim | Nome do arquivo no Google Drive (ex: monster_1.mp4) |

### Exemplo de Planilha

```
Date       | Time  | Platform       | Title                    | Description              | Hashtags                  | Video File
2024-01-15 | 10:00 | YouTube Shorts | Meu Primeiro Short       | Descrição do vídeo       | #shorts #viral #trending  | video_001.mp4
2024-01-15 | 14:30 | YouTube        | Outro Vídeo Legal        | Mais uma descrição       | #youtube #content         | video_002.mp4
```

## 🏗️ Arquitetura

### Estrutura do Banco de Dados

#### `users`
Usuários autenticados no sistema

#### `oauthTokens`
Tokens OAuth do Google (Drive e YouTube) com refresh automático

#### `scheduledPosts`
Posts agendados com status de publicação
- Status: `scheduled`, `processing`, `published`, `failed`

#### `logs`
Logs de atividades e erros do sistema

#### `userSettings`
Configurações do usuário (fuso horário, pasta do Drive, etc.)

### Fluxo de Publicação

1. **Upload**: Usuário faz upload da planilha Excel
2. **Parse**: Sistema valida e extrai dados da planilha
3. **Armazenamento**: Posts são salvos no banco com status "scheduled"
4. **Scheduler**: Worker verifica a cada minuto posts pendentes
5. **Busca**: Sistema busca o vídeo no Google Drive pelo nome
6. **Upload**: Vídeo é enviado para o YouTube via API
7. **Atualização**: Status é atualizado para "published" ou "failed"
8. **Logs**: Todas as ações são registradas para auditoria

## 🚀 Deploy

### Opção 1: Render.com (Recomendado)

#### Web Service
```yaml
name: monsters-ia-web
type: web
env: node
buildCommand: pnpm install && pnpm build
startCommand: pnpm start
envVars:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    sync: false
  - key: GOOGLE_CLIENT_ID
    sync: false
  - key: GOOGLE_CLIENT_SECRET
    sync: false
  - key: GOOGLE_REDIRECT_URI
    value: https://seu-app.onrender.com/api/oauth/google/callback
```

### Opção 2: Docker

#### Dockerfile
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
    restart: unless-stopped
```

### Comandos de Deploy

```bash
# Instalar dependências
pnpm install

# Build do projeto
pnpm build

# Aplicar migrações do banco
pnpm db:push

# Iniciar servidor (produção)
pnpm start

# Iniciar servidor (desenvolvimento)
pnpm dev
```

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Executar testes em modo watch
pnpm test:watch

# Executar testes com coverage
pnpm test:coverage
```

## 📝 Scripts Disponíveis

```bash
pnpm dev          # Inicia servidor de desenvolvimento
pnpm build        # Build para produção
pnpm start        # Inicia servidor de produção
pnpm test         # Executa testes
pnpm db:push      # Aplica schema ao banco de dados
pnpm db:studio    # Abre Drizzle Studio (visualizador de DB)
```

## 🔒 Segurança

- ✅ Autenticação via OAuth
- ✅ Tokens armazenados de forma segura no banco
- ✅ Refresh automático de tokens expirados
- ✅ Validação de entrada em todas as APIs
- ✅ Rate limiting recomendado para produção
- ✅ HTTPS obrigatório em produção

## 🐛 Troubleshooting

### Erro: "Google OAuth not configured"
- Verifique se as variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` estão configuradas

### Erro: "Video file not found in Google Drive"
- Verifique se o nome do arquivo na planilha está correto
- Confirme se a pasta do Drive está configurada corretamente
- Verifique se a conexão com o Google Drive está ativa

### Erro: "Failed to upload video to YouTube"
- Verifique se a conexão com o YouTube está ativa
- Confirme se o vídeo tem menos de 60 segundos (para Shorts)
- Verifique os logs para mais detalhes do erro

### Scheduler não está executando
- Verifique se o servidor está rodando
- Confirme que não há erros no console
- O scheduler inicia automaticamente com o servidor

## 📄 Licença

Este projeto foi desenvolvido para automação de publicações no YouTube Shorts.

## 🤝 Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Google Drive API
- Documentação do YouTube Data API
- Logs do sistema no dashboard

## 🎯 Próximos Passos

1. Configure as credenciais do Google OAuth
2. Conecte suas contas do Google Drive e YouTube
3. Configure a pasta padrão do Drive
4. Faça upload da sua primeira planilha Excel
5. Monitore as publicações no dashboard

---

**Desenvolvido com ❤️ para automação de conteúdo**
