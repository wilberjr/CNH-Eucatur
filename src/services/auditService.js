const { daysSince, classify } = require('../utils/date');
const { getAllRegistrations, markAlert, updateStatus } = require('./registrationService');

async function runDailyAudit(client, env) {
  const rows = await getAllRegistrations();
  const adminChannel = await client.channels.fetch(env.adminChannelId).catch(() => null);
  const guild = await client.guilds.fetch(env.guildId).catch(() => null);

  for (const row of rows) {
    const days = daysSince(row.updated_at);
    const state = classify(days);
    const user = await client.users.fetch(row.discord_user_id).catch(() => null);

    if (days >= 30 && !row.last_user_alert_at && user) {
      await user.send('Sua CNH Virtual do Consórcio Eucatur venceu. Atualize seu cadastro no servidor para continuar regular.').catch(() => null);
      await markAlert(row.discord_user_id, 'last_user_alert_at');
    }

    if (days >= 40 && !row.last_admin_alert_at && adminChannel) {
      await adminChannel.send(`🚨 Inatividade detectada: <@${row.discord_user_id}> está há ${days} dias sem renovar a CNH Virtual.`).catch(() => null);
      await markAlert(row.discord_user_id, 'last_admin_alert_at');
    }

    if (env.removeRoleOnInactive && env.memberRoleId && state === 'inativa' && guild) {
      const member = await guild.members.fetch(row.discord_user_id).catch(() => null);
      if (member && member.roles.cache.has(env.memberRoleId)) {
        await member.roles.remove(env.memberRoleId, 'Inatividade na CNH Virtual').catch(() => null);
      }
    }

    await updateStatus(row.discord_user_id, state);
  }
}

module.exports = { runDailyAudit };
