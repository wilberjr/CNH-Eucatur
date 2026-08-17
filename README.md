# CNH do Consórcio Eucatur - v5

Versão reescrita com os novos campos de cadastro:
- Nome Completo
- Identificação padrão da empresa
- Telefone internacional
- Steam ID numérico longo

## Arquivos para subir no GitHub
Suba:
- package.json
- .gitignore
- .env.example
- README.md
- pasta `src/`
- pasta `assets/`

Não suba:
- .env
- data/
- node_modules/
- arquivos sqlite

## Railway Volume
Crie um volume e monte em:
```text
/app/data
```

Use também esta variável:
```env
DATA_DIR=/app/data
```

## Variáveis
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
DATA_DIR=/app/data
```

## Importante
Se você já tinha um banco SQLite antigo com a estrutura anterior, o ideal é começar com volume limpo ou apagar o arquivo `cnh.sqlite`, porque o schema foi alterado.
