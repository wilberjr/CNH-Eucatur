require('dotenv').config();

/*
 * Lê uma variável booleana do ambiente de forma tolerante a espaços e
 * caixa (" True ", "TRUE", "true" etc. todos funcionam). Se a variável
 * não existir ou estiver vazia, usa o valor padrão.
 */
function parseBool(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null) return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === '') return fallback;
  return normalized === 'true';
}

const env = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  panelChannelId: process.env.PANEL_CHANNEL_ID,
  adminChannelId: process.env.ADMIN_CHANNEL_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  staffRoleId: process.env.STAFF_ROLE_ID || '',
  panelMessageId: process.env.PANEL_MESSAGE_ID || '',
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',

  /*
   * Cargo interno concedido a quem tem CNH Virtual ativa.
   * É esse cargo que deve estar liberado nos canais internos
   * (configurado nas permissões de canal do próprio Discord).
   */
  memberRoleId: process.env.MEMBER_ROLE_ID || '',

  /*
   * Concede MEMBER_ROLE_ID automaticamente sempre que o cadastro
   * ou a renovação forem concluídos com sucesso.
   */
  grantRoleOnRegister: parseBool(process.env.GRANT_ROLE_ON_REGISTER, true),

  /*
   * Remove MEMBER_ROLE_ID automaticamente quando a CNH entra em
   * 'vencida' (30 dias) ou 'inativa' (40 dias) na auditoria diária.
   */
  removeRoleOnExpire: parseBool(process.env.REMOVE_ROLE_ON_EXPIRE, false),

  dataDir: process.env.DATA_DIR || '/app/data'
};
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'PANEL_CHANNEL_ID', 'ADMIN_CHANNEL_ID', 'LOG_CHANNEL_ID'];
const missing = required.filter(key => !process.env[key]);
function validateEnv() { if (missing.length) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`); }
module.exports = { env, validateEnv };
