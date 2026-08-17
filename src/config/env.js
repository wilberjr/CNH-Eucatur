require('dotenv').config();

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
  memberRoleId: process.env.MEMBER_ROLE_ID || '',
  removeRoleOnInactive: String(process.env.REMOVE_ROLE_ON_INACTIVE || 'false').toLowerCase() === 'true'
};

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'PANEL_CHANNEL_ID', 'ADMIN_CHANNEL_ID', 'LOG_CHANNEL_ID'];
const missing = required.filter(key => !process.env[key]);

function validateEnv() {
  if (missing.length) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  }
}

module.exports = { env, validateEnv };
