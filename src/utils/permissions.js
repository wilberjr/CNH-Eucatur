const { PermissionFlagsBits } = require('discord.js');
function canUseStaff(interaction, env) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (env.staffRoleId && interaction.member?.roles?.cache?.has(env.staffRoleId)) return true;
  return false;
}
module.exports = { canUseStaff };
