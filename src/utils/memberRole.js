/*
 * Concede ou remove o cargo de "membro ativo" (MEMBER_ROLE_ID) de acordo
 * com o status da CNH Virtual. Centralizado aqui para não duplicar a
 * lógica de erro/log entre index.js (cadastro/renovação) e
 * auditService.js (vencimento automático).
 */

async function grantMemberRole(guild, userId, env, { logChannel, reason } = {}) {
  if (!env.memberRoleId || !guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  if (member.roles.cache.has(env.memberRoleId)) return;

  try {
    await member.roles.add(env.memberRoleId, reason || 'CNH Virtual ativa');
    if (logChannel) {
      await logChannel
        .send(`🔓 Acesso interno de <@${userId}> liberado (${reason || 'CNH Virtual ativa'}).`)
        .catch(() => null);
    }
  } catch (error) {
    console.error(`[memberRole] Falha ao adicionar cargo em ${userId}:`, error.message);
    if (logChannel) {
      await logChannel
        .send(`⚠️ Não consegui adicionar o cargo <@&${env.memberRoleId}> em <@${userId}>. Verifique se o cargo do bot está **acima** desse cargo na hierarquia e se ele tem permissão "Gerenciar Cargos".`)
        .catch(() => null);
    }
  }
}

async function revokeMemberRole(guild, userId, env, { logChannel, reason } = {}) {
  if (!env.memberRoleId || !guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  if (!member.roles.cache.has(env.memberRoleId)) return;

  try {
    await member.roles.remove(env.memberRoleId, reason || 'CNH Virtual vencida');
    if (logChannel) {
      await logChannel
        .send(`🔒 Acesso interno de <@${userId}> suspenso (${reason || 'CNH Virtual vencida'}).`)
        .catch(() => null);
    }
  } catch (error) {
    console.error(`[memberRole] Falha ao remover cargo de ${userId}:`, error.message);
    if (logChannel) {
      await logChannel
        .send(`⚠️ Não consegui remover o cargo <@&${env.memberRoleId}> de <@${userId}>. Verifique a hierarquia de cargos do bot.`)
        .catch(() => null);
    }
  }
}

module.exports = { grantMemberRole, revokeMemberRole };
