# CNH do Consórcio Eucatur - v4

Versão mais pronta para produção, com estrutura modular, painel fixo, alertas automáticos e opção de remover cargo de inativos.

## Estrutura
```text
cnh-bot-v4/
├─ package.json
├─ .gitignore
├─ .env.example
├─ README.md
├─ assets/
│  ├─ ref-eucatur-azulog-1.jpeg
│  └─ ref-eucatur-azulog-2.jpeg
└─ src/
   ├─ index.js
   ├─ config/
   │  └─ env.js
   ├─ commands/
   │  └─ registerCommands.js
   ├─ services/
   │  ├─ auditService.js
   │  ├─ cardService.js
   │  ├─ database.js
   │  ├─ panelService.js
   │  └─ registrationService.js
   └─ utils/
      ├─ date.js
      ├─ permissions.js
      └─ text.js
```

## Variáveis de ambiente
```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
PANEL_CHANNEL_ID=
ADMIN_CHANNEL_ID=
LOG_CHANNEL_ID=
STAFF_ROLE_ID=
PANEL_MESSAGE_ID=
TIMEZONE=America/Sao_Paulo
MEMBER_ROLE_ID=
REMOVE_ROLE_ON_INACTIVE=false
```

## O que cada variável faz
### Obrigatórias
- `DISCORD_TOKEN`: token do bot
- `CLIENT_ID`: application ID do bot
- `GUILD_ID`: ID do servidor
- `PANEL_CHANNEL_ID`: canal onde o painel fixo ficará
- `ADMIN_CHANNEL_ID`: canal para alertas de 40 dias
- `LOG_CHANNEL_ID`: canal de logs de cadastro e renovação

### Opcionais
- `STAFF_ROLE_ID`: cargo adicional autorizado para comandos da staff
- `PANEL_MESSAGE_ID`: ID manual da mensagem do painel, se você quiser travar uma mensagem específica
- `TIMEZONE`: fuso horário do cron diário, padrão `America/Sao_Paulo`
- `MEMBER_ROLE_ID`: cargo dos membros da empresa
- `REMOVE_ROLE_ON_INACTIVE`: se `true`, remove `MEMBER_ROLE_ID` quando o usuário ficar inativo

## Onde colocar o código
Suba tudo no GitHub. Não suba `.env`.

## Como implementar
### 1. Criar aplicação no Discord
- Acesse Discord Developer Portal
- Crie a aplicação
- Vá em Bot
- Gere o token
- Ative as permissões necessárias

### 2. Pegar IDs
Ative o modo desenvolvedor do Discord e copie:
- ID do servidor
- ID do canal do painel
- ID do canal admin
- ID do canal de logs
- ID do cargo da staff, se existir
- ID do cargo de membro, se quiser remoção automática

### 3. GitHub
```bash
git init
git add .
git commit -m "Bot CNH v4"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

### 4. Railway
- New Project
- Deploy from GitHub repo
- Selecione o repositório
- Adicione as variables do `.env.example`
- Start command: `npm start`
- Deploy

### 5. Render
- New Background Worker
- Conecte o GitHub
- Build: `npm install`
- Start: `npm start`
- Adicione as environment variables
- Deploy

### 6. Oracle
- Crie a VM Always Free
- Instale Node 20, git e pm2
- Clone o projeto
- Rode `npm install`
- Crie `.env`
- Rode `pm2 start src/index.js --name cnh-bot`

## Recomendação prática
- Quer facilidade: Railway ou Render
- Quer economia real a longo prazo: Oracle Cloud Free Tier

## Fluxo final
1. Bot sobe
2. Registra comandos
3. Garante painel fixo no canal
4. Usuário cadastra ou renova via modal
5. Bot gera CNH virtual
6. Em 30 dias, lembra usuário
7. Em 40 dias, alerta staff
8. Opcionalmente remove cargo automaticamente
