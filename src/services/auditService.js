const { daysSince, classify } = require('../utils/date');
const { getAllRegistrations, markAlert, updateStatus } = require('./registrationService');
const { revokeMemberRole } = require('../utils/memberRole');

/*
 * Estados que devem perder o cargo de membro ativo (e, por consequência,
 * o acesso aos canais internos que dependem desse cargo nas permissões
 * do servidor). 'vencida' já é suficiente para cortar o acesso; 'inativa'
 * é o estágio mais avançado, mantido aqui por segurança.
 */
const REVOKE_STATES = ['vencida', 'inativa'];

/*
 * Roda a auditoria de UM registro específico: alertas + remoção de cargo.
 * Extraído da varredura diária para poder ser reaproveitado pelo comando
 * /cnh-simular-vencimento, que precisa disparar exatamente a mesma lógica
 * na hora, sem esperar o cron das 9h.
 */
async function auditRegistration(client, env, row, { adminChannel, logChannel, guild } = {}) {
  const days = daysSince(row.updated_at);
  const state = classify(days);
  const user = await client.users.fetch(row.discord_user_id).catch(() => null);

  if (days >= 30 && !row.last_user_alert_at && user) {
    await user.send('Sua CNH Virtual do Consórcio Eucatur venceu. Atualize seu cadastro no servidor para continuar regular. Enquanto estiver vencida, seu acesso aos canais internos fica suspenso até a renovação.').catch(() => null);
    await markAlert(row.discord_user_id, 'last_user_alert_at');
  }

  if (days >= 40 && !row.last_admin_alert_at && adminChannel) {
    await adminChannel.send(`🚨 Inatividade detectada: <@${row.discord_user_id}> está há ${days} dias sem renovar a CNH Virtual.`).catch(() => null);
    await markAlert(row.discord_user_id, 'last_admin_alert_at');
  }

  if (env.removeRoleOnExpire && REVOKE_STATES.includes(state) && guild) {
    await revokeMemberRole(guild, row.discord_user_id, env, {
      logChannel,
      reason: `CNH Virtual ${state} (${days} dias sem renovar)`
    });
  }

  await updateStatus(row.discord_user_id, state);
  return { days, state };
}

async function runDailyAudit(client, env) {
  const rows = await getAllRegistrations();
  const adminChannel = await client.channels.fetch(env.adminChannelId).catch(() => null);
  const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);
  const guild = await client.guilds.fetch(env.guildId).catch(() => null);

  const summary = { ativa: 0, proximo: 0, vencida: 0, inativa: 0 };
  for (const row of rows) {
    const { state } = await auditRegistration(client, env, row, { adminChannel, logChannel, guild });
    summary[state]++;
  }
  return summary;
}

module.exports = { runDailyAudit, auditRegistration };
