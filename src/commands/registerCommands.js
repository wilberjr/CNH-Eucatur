const { SlashCommandBuilder, REST, Routes } = require('discord.js');

async function registerCommands(env) {
  const commands = [
    new SlashCommandBuilder().setName('cnh-painel').setDescription('Atualiza ou recria o painel principal'),
    new SlashCommandBuilder().setName('cnh-status').setDescription('Mostra sua CNH Virtual atual'),
    new SlashCommandBuilder().setName('cnh-admin').setDescription('Mostra o resumo administrativo'),
    new SlashCommandBuilder().setName('cnh-vencidos').setDescription('Lista cadastros vencidos ou inativos'),
    new SlashCommandBuilder().setName('cnh-proximos').setDescription('Lista cadastros próximos do vencimento')
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(env.token);
  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body: commands });
}

module.exports = { registerCommands };
