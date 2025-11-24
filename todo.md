# Monsters.ia - TODO List

## Fase 1: Estrutura e Banco de Dados
- [x] Criar schema do banco de dados (scheduledPosts, oauthTokens, logs)
- [x] Configurar tabelas com campos necessários
- [x] Adicionar helpers de banco de dados

## Fase 2: Autenticação Google OAuth
- [x] Implementar fluxo OAuth para Google Drive
- [x] Implementar fluxo OAuth para YouTube Data API
- [x] Criar sistema de armazenamento e refresh de tokens
- [x] Adicionar endpoints de conexão Google

## Fase 3: Upload e Processamento de Excel
- [x] Criar endpoint para upload de arquivo Excel
- [x] Implementar parser de planilha Excel
- [x] Validar colunas obrigatórias (Date, Time, Platform, Title, Description, Hashtags, Video File)
- [x] Filtrar apenas linhas com Platform = "YouTube" ou "YouTube Shorts"
- [x] Gravar dados no banco com status "agendado"
- [x] Mostrar preview da tabela após importação

## Fase 4: Integração Google Drive e YouTube
- [x] Implementar busca de arquivos no Google Drive por nome
- [x] Criar função para download/stream de vídeos do Drive
- [x] Implementar upload de vídeo para YouTube via API
- [x] Configurar metadados (título, descrição, hashtags)
- [x] Detectar automaticamente categoria Shorts (duração < 60s)

## Fase 5: Sistema de Agendamento
- [x] Criar worker de background que roda a cada 1 minuto
- [x] Verificar posts com horário >= Date+Time
- [x] Processar apenas posts com status "agendado"
- [x] Executar publicação automática
- [x] Atualizar status para "postado com sucesso" ou "falha"
- [x] Gravar YouTube video ID e timestamp
- [x] Implementar logs de erro detalhados

## Fase 6: Interface - Dashboard
- [x] Criar página de Dashboard
- [x] Mostrar próximos posts agendados
- [x] Mostrar posts publicados hoje
- [x] Mostrar falhas recentes
- [x] Adicionar estatísticas gerais

## Fase 7: Interface - Calendário e Posts
- [ ] Criar página de Calendário com visão semanal/mensal (placeholder)
- [ ] Implementar modal de detalhes ao clicar em post (placeholder)
- [x] Criar página de lista completa de posts
- [x] Adicionar filtros por status, data e plataforma
- [x] Implementar paginação

## Fase 8: Interface - Configurações
- [x] Criar página de Configurações
- [x] Adicionar seletor de fuso horário (padrão UTC-3)
- [x] Botão para conectar Google Drive
- [x] Botão para conectar YouTube
- [x] Campo para configurar pasta padrão do Drive
- [x] Botão "Upload Excel"
- [ ] Botão "Forçar sincronização" (placeholder)
- [ ] Botão "Testar publicação" (placeholder)

## Fase 9: Funcionalidades Adicionais
- [ ] Implementar retry manual para posts com falha
- [ ] Validar se Video File existe no Drive antes de agendar
- [ ] Adicionar suporte para múltiplos usuários
- [ ] Criar sistema de notificações

## Fase 10: Deploy e Documentação
- [x] Criar Dockerfile
- [x] Criar docker-compose.yml
- [x] Documentar variáveis de ambiente necessárias
- [x] Criar guia de deploy para Render.com
- [x] Documentar configuração de Web Service
- [x] Documentar configuração de Background Worker
- [x] Adicionar README com instruções completas

## Fase 11: Testes
- [x] Criar testes unitários para procedures
- [x] Testar fluxo de listagem de posts
- [x] Testar configurações de usuário
- [x] Testar status de conexões Google
- [x] Testar status do scheduler
