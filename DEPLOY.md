# Guia de Deploy - Monsters.ia

Este guia fornece instruções detalhadas para fazer deploy do Monsters.ia em diferentes ambientes.

## 📋 Pré-requisitos

Antes de fazer o deploy, você precisa:

1. **Credenciais do Google Cloud**
   - Client ID
   - Client Secret
   - APIs habilitadas: Google Drive API e YouTube Data API v3

2. **Banco de Dados MySQL/TiDB**
   - URL de conexão configurada

3. **Servidor Node.js**
   - Node.js 22+ instalado
   - pnpm instalado

## 🔑 Configuração de Variáveis de Ambiente

### Variáveis Obrigatórias

Configure as seguintes variáveis de ambiente no seu servidor:

```bash
# Google OAuth (OBRIGATÓRIO)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=https://seu-dominio.com/api/oauth/google/callback
```

### Como Obter Credenciais do Google

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto ou selecione existente
3. Ative as APIs:
   - Google Drive API
   - YouTube Data API v3
4. Vá em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth 2.0"
5. Tipo de aplicativo: "Aplicativo da Web"
6. URIs de redirecionamento autorizados:
   - Desenvolvimento: `http://localhost:3000/api/oauth/google/callback`
   - Produção: `https://seu-dominio.com/api/oauth/google/callback`
7. Copie o Client ID e Client Secret

### Escopos OAuth Necessários

O sistema solicita automaticamente os seguintes escopos:

- `https://www.googleapis.com/auth/drive.readonly` - Leitura de arquivos do Drive
- `https://www.googleapis.com/auth/youtube.upload` - Upload de vídeos
- `https://www.googleapis.com/auth/youtube.force-ssl` - Acesso seguro ao YouTube

## 🚀 Deploy no Render.com

### Passo 1: Criar Web Service

1. Conecte seu repositório Git ao Render
2. Crie um novo "Web Service"
3. Configure:
   - **Name**: monsters-ia
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

### Passo 2: Configurar Variáveis de Ambiente

No painel do Render, adicione as variáveis:

```
NODE_ENV=production
GOOGLE_CLIENT_ID=<seu-client-id>
GOOGLE_CLIENT_SECRET=<seu-client-secret>
GOOGLE_REDIRECT_URI=https://seu-app.onrender.com/api/oauth/google/callback
```

### Passo 3: Deploy

O Render fará o deploy automaticamente quando você fizer push para o repositório.

## 🐳 Deploy com Docker

### Dockerfile

Já incluído no projeto. Para build:

```bash
docker build -t monsters-ia .
```

### Docker Compose

Crie um arquivo `docker-compose.yml`:

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

Execute:

```bash
docker-compose up -d
```

## 🖥️ Deploy Manual (VPS)

### Passo 1: Preparar Servidor

```bash
# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Clonar repositório
git clone <seu-repositorio>
cd monsters-ia
```

### Passo 2: Configurar Variáveis

```bash
# Criar arquivo .env
nano .env

# Adicionar variáveis (veja seção "Variáveis Obrigatórias" acima)
```

### Passo 3: Build e Deploy

```bash
# Instalar dependências
pnpm install

# Build do projeto
pnpm build

# Aplicar schema do banco
pnpm db:push

# Iniciar com PM2 (recomendado)
npm install -g pm2
pm2 start npm --name "monsters-ia" -- start
pm2 save
pm2 startup
```

## 🔄 Background Worker

O scheduler (worker de background) é iniciado automaticamente com o servidor. Ele:

- Executa a cada 1 minuto
- Verifica posts agendados
- Publica automaticamente no horário correto
- Registra logs de todas as operações

**Não é necessário configurar um worker separado.**

## 🗄️ Banco de Dados

### Aplicar Migrações

Sempre que fizer deploy ou atualizar o schema:

```bash
pnpm db:push
```

### Backup

Recomendamos fazer backups regulares do banco de dados:

```bash
# MySQL
mysqldump -u user -p database > backup.sql

# Restaurar
mysql -u user -p database < backup.sql
```

## 🔒 Segurança em Produção

### Checklist de Segurança

- [ ] HTTPS habilitado (obrigatório)
- [ ] Variáveis de ambiente seguras (nunca commitar .env)
- [ ] Firewall configurado
- [ ] Rate limiting implementado (recomendado)
- [ ] Logs de acesso habilitados
- [ ] Backups automáticos configurados

### Configurar HTTPS

Para Render.com: HTTPS é automático.

Para VPS, use Nginx + Let's Encrypt:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoramento

### Logs do Sistema

```bash
# Ver logs em tempo real (PM2)
pm2 logs monsters-ia

# Ver logs do Docker
docker logs -f <container-id>

# Ver logs do Render
# Acesse o painel do Render → Logs
```

### Health Check

O servidor expõe um endpoint de health check:

```bash
curl https://seu-dominio.com/api/health
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
- Verifique a variável `DATABASE_URL`
- Confirme que o banco está acessível
- Teste a conexão manualmente

### Erro: "Google OAuth not configured"
- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados
- Confirme que `GOOGLE_REDIRECT_URI` está correto
- Verifique se as APIs estão habilitadas no Google Cloud

### Scheduler não está executando
- Verifique os logs do servidor
- Confirme que o servidor está rodando
- O scheduler inicia automaticamente, não requer configuração adicional

### Erro 502 Bad Gateway
- Verifique se o servidor Node.js está rodando
- Confirme que a porta 3000 está acessível
- Verifique configuração do proxy reverso (Nginx)

## 🔄 Atualizações

Para atualizar o sistema:

```bash
# Pull das mudanças
git pull

# Instalar novas dependências
pnpm install

# Build
pnpm build

# Aplicar migrações
pnpm db:push

# Reiniciar
pm2 restart monsters-ia
```

## 📞 Suporte

Para problemas de deploy:

1. Verifique os logs do sistema
2. Consulte a documentação das APIs do Google
3. Revise as configurações de ambiente
4. Teste em ambiente local primeiro

## ✅ Checklist de Deploy

- [ ] Credenciais do Google configuradas
- [ ] Banco de dados criado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Build executado com sucesso
- [ ] Migrações aplicadas
- [ ] HTTPS habilitado
- [ ] Servidor rodando
- [ ] Scheduler ativo
- [ ] Teste de conexão Google Drive
- [ ] Teste de conexão YouTube
- [ ] Upload de planilha testado
- [ ] Publicação automática testada

---

**Boa sorte com seu deploy! 🚀**
