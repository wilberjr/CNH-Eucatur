const { SlashCommandBuilder, REST, Routes } = require('discord.js');
async function registerCommands(env) {
  const commands = [
    new SlashCommandBuilder().setName('cnh-painel').setDescription('Atualiza ou recria o painel principal'),
    new SlashCommandBuilder().setName('cnh-status').setDescription('Mostra sua CNH Virtual atual'),
    new SlashCommandBuilder().setName('cnh-admin').setDescription('Mostra o resumo administrativo'),
    new SlashCommandBuilder().setName('cnh-vencidos').setDescription('Lista cadastros vencidos ou inativos'),
    new SlashCommandBuilder().setName('cnh-proximos').setDescription('Lista cadastros próximos do vencimento'),
    new SlashCommandBuilder().setName('cnh-lista').setDescription('Lista todos os usuários com CNH Virtual cadastrada'),
    new SlashCommandBuilder().setName('cnh-excluir').setDescription('Exclui a CNH de um usuário').addUserOption(option => option.setName('usuario').setDescription('Usuário que terá a CNH excluída').setRequired(true)),

    new SlashCommandBuilder()
      .setName('cnh-simular-vencimento')
      .setDescription('[Teste] Faz a CNH de um usuário parecer mais antiga, para testar vencimento e remoção de cargo')
      .addUserOption(option => option.setName('usuario').setDescription('Usuário a simular').setRequired(true))
      .addIntegerOption(option =>
        option.setName('dias')
          .setDescription('Dias atrás da última renovação (padrão 31 = vencida, 41+ = inativa, 0 = resetar como recém-renovada)')
          .setMinValue(0)
          .setMaxValue(365)
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('cnh-forcar-auditoria')
      .setDescription('[Teste] Executa agora a auditoria diária completa (alertas + remoção de cargo)'),

    new SlashCommandBuilder()
      .setName('cnh-cargo')
      .setDescription('[Teste] Concede ou remove manualmente o cargo de membro ativo de um usuário')
      .addUserOption(option => option.setName('usuario').setDescription('Usuário alvo').setRequired(true))
      .addStringOption(option =>
        option.setName('acao')
          .setDescription('O que fazer com o cargo')
          .setRequired(true)
          .addChoices(
            { name: 'Conceder', value: 'conceder' },
            { name: 'Remover', value: 'remover' }
          )
      )
  ].map(command => command.toJSON());
  const rest = new REST({ version: '10' }).setToken(env.token);
  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body: commands });
}
module.exports = { registerCommands };
