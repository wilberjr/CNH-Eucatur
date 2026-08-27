const cron = require('node-cron');
const { Client, GatewayIntentBits, Partials, Events, AttachmentBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { env, validateEnv } = require('./config/env');
const { daysSince, classify, isoNow } = require('./utils/date');
const { canUseStaff } = require('./utils/permissions');
const { normalizePhone, isValidPhone, normalizeSteamId, isValidSteamId } = require('./utils/validation');
const { registerCommands } = require('./commands/registerCommands');
const { generateCard } = require('./services/cardService');
const { ensurePanelMessage } = require('./services/panelService');
const { runDailyAudit, auditRegistration } = require('./services/auditService');
const { grantMemberRole, revokeMemberRole } = require('./utils/memberRole');
const { buildRegistrationsCsv } = require('./utils/csvExport');
const { upsertRegistration, getRegistration, getAllRegistrations, deleteRegistration, setRegistrationAge } = require('./services/registrationService');
const { ready: databaseReady } = require('./services/database');
validateEnv();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });

/*
 * Rede de segurança: qualquer erro não tratado dentro de um handler de
 * interação (ex.: DiscordAPIError, falha de rede) não pode derrubar o
 * processo inteiro — foi exatamente isso que reiniciou o bot na renovação
 * que deu "Unknown interaction". client.on('error', ...) evita que o
 * processo morra quando o discord.js emite 'error' sem listener, e
 * unhandledRejection cobre qualquer outra Promise rejeitada que escape.
 */
client.on('error', error => console.error('[client error]', error));
client.on('shardError', error => console.error('[shard error]', error));
process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', error => console.error('[uncaughtException]', error));

function buildModal(customId, title) {
  return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome_completo').setLabel('Nome Completo').setPlaceholder('Fulano de Tal da Silva').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('identificacao_empresa').setLabel('Identificação padrão da empresa').setPlaceholder('[EMPRESA] Fulano - 12345').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('telefone').setLabel('Telefone').setPlaceholder('+55 12 91234 5678').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steam_id').setLabel('Steam ID').setPlaceholder('7656119...').setStyle(TextInputStyle.Short).setRequired(true))
  );
}
function summarize(rows) { const count = { ativa: 0, proximo: 0, vencida: 0, inativa: 0 }; for (const row of rows) count[classify(daysSince(row.updated_at))]++; return count; }

/*
 * Resumo semanal automático no canal admin — mesma informação do
 * /cnh-admin, mas sem precisar ninguém lembrar de rodar o comando.
 */
async function postWeeklyReport() {
  const adminChannel = await client.channels.fetch(env.adminChannelId).catch(() => null);
  if (!adminChannel) return;
  const rows = await getAllRegistrations();
  const count = summarize(rows);
  const embed = new EmbedBuilder()
    .setColor(0x1d4ed8)
    .setTitle('📅 Resumo semanal • CNH Virtual')
    .addFields(
      { name: '🟢 Ativas', value: String(count.ativa), inline: true },
      { name: '🟡 Próximas', value: String(count.proximo), inline: true },
      { name: '🔴 Vencidas', value: String(count.vencida), inline: true },
      { name: '⚫ Inativas', value: String(count.inativa), inline: true }
    )
    .setFooter({ text: `Total cadastrado: ${rows.length}` })
    .setTimestamp();
  await adminChannel.send({ embeds: [embed] }).catch(() => null);
}

client.once(Events.ClientReady, async ready => {
  await registerCommands(env);
  await ensurePanelMessage(client, env);
  cron.schedule('0 9 * * *', () => runDailyAudit(client, env).catch(console.error), { timezone: env.timezone });
  /*
   * Toda segunda-feira às 9h05 (5 min depois da auditoria diária, para
   * o resumo já refletir qualquer mudança de status daquele dia).
   */
  cron.schedule('5 9 * * 1', () => postWeeklyReport().catch(console.error), { timezone: env.timezone });
  console.log(`Bot online como ${ready.user.tag}`);
  console.log(
    `[config] MEMBER_ROLE_ID=${env.memberRoleId || '(vazio)'} | GRANT_ROLE_ON_REGISTER=${env.grantRoleOnRegister} | REMOVE_ROLE_ON_EXPIRE=${env.removeRoleOnExpire}`
  );
});
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'cnh-painel') {
      if (!canUseStaff(interaction, env)) return interaction.reply({ content: 'Apenas a staff pode atualizar o painel.', ephemeral: true });
      const panelId = await ensurePanelMessage(client, env);
      return interaction.reply({ content: panelId ? `Painel confirmado. Mensagem: ${panelId}` : 'Não consegui confirmar o painel.', ephemeral: true });
    }
    if (interaction.commandName === 'cnh-status') {
      await interaction.deferReply({ ephemeral: true });
      const row = await getRegistration(interaction.user.id);
      if (!row) return interaction.editReply({ content: 'Você ainda não possui cadastro na CNH Virtual.' });
      const card = await generateCard(interaction.user, row);
      return interaction.editReply({ content: `Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)] });
    }
    if (['cnh-admin', 'cnh-vencidos', 'cnh-proximos', 'cnh-lista', 'cnh-exportar', 'cnh-excluir', 'cnh-simular-vencimento', 'cnh-forcar-auditoria', 'cnh-cargo'].includes(interaction.commandName) && !canUseStaff(interaction, env)) return interaction.reply({ content: 'Apenas a staff pode usar esse comando.', ephemeral: true });
    if (interaction.commandName === 'cnh-admin') {
      const rows = await getAllRegistrations();
      const count = summarize(rows);
      const embed = new EmbedBuilder().setColor(0x1d4ed8).setTitle('Painel administrativo • CNH Virtual').addFields({ name: 'Ativas', value: String(count.ativa), inline: true },{ name: 'Próximas', value: String(count.proximo), inline: true },{ name: 'Vencidas', value: String(count.vencida), inline: true },{ name: 'Inativas', value: String(count.inativa), inline: true });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (interaction.commandName === 'cnh-vencidos') {
      const rows = await getAllRegistrations();
      const text = rows.filter(row => ['vencida', 'inativa'].includes(classify(daysSince(row.updated_at)))).slice(0, 30).map(row => `• ${row.nome_completo} — ${daysSince(row.updated_at)} dias`).join('\n');
      return interaction.reply({ content: text || 'Nenhum cadastro vencido ou inativo encontrado.', ephemeral: true });
    }
    if (interaction.commandName === 'cnh-proximos') {
      const rows = await getAllRegistrations();
      const text = rows.filter(row => classify(daysSince(row.updated_at)) === 'proximo').slice(0, 30).map(row => `• ${row.nome_completo} — ${daysSince(row.updated_at)} dias`).join('\n');
      return interaction.reply({ content: text || 'Nenhum cadastro próximo do vencimento.', ephemeral: true });
    }
    if (interaction.commandName === 'cnh-lista') {
      await interaction.deferReply({ ephemeral: true });
      const rows = await getAllRegistrations();
      if (!rows.length) return interaction.editReply('Nenhuma CNH Virtual cadastrada ainda.');

      const STATUS_EMOJI = { ativa: '🟢', proximo: '🟡', vencida: '🔴', inativa: '⚫' };
      const sorted = [...rows].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
      const lines = sorted.map(row => {
        const state = classify(daysSince(row.updated_at));
        return `${STATUS_EMOJI[state]} **${row.nome_completo}** — \`${row.identificacao_empresa}\``;
      });

      // Discord limita ~4096 caracteres por descrição de embed e 10 embeds
      // por mensagem — divide em blocos de 15 linhas para nunca estourar.
      const CHUNK_SIZE = 15;
      const MAX_EMBEDS = 10;
      const chunks = [];
      for (let i = 0; i < lines.length; i += CHUNK_SIZE) chunks.push(lines.slice(i, i + CHUNK_SIZE));

      const embeds = chunks.slice(0, MAX_EMBEDS).map((chunk, index) =>
        new EmbedBuilder()
          .setColor(0xffbd59)
          .setTitle(index === 0 ? `🪪 CNH Virtual cadastradas (${rows.length})` : null)
          .setDescription(chunk.join('\n'))
      );

      const omitted = lines.length - Math.min(lines.length, CHUNK_SIZE * MAX_EMBEDS);
      const legend = '🟢 Ativa　🟡 Próxima do vencimento　🔴 Vencida　⚫ Inativa';
      const footerText = omitted > 0 ? `${legend} • ${omitted} cadastro(s) não exibido(s) por limite de espaço` : legend;
      embeds[embeds.length - 1].setFooter({ text: footerText });

      return interaction.editReply({ embeds });
    }

    if (interaction.commandName === 'cnh-exportar') {
      await interaction.deferReply({ ephemeral: true });
      const filtro = interaction.options.getString('filtro') || 'todos';
      const rows = await getAllRegistrations();

      const filtered = rows.filter(row => {
        const state = classify(daysSince(row.updated_at));
        if (filtro === 'vencidos') return state === 'vencida' || state === 'inativa';
        if (filtro === 'proximos') return state === 'proximo';
        if (filtro === 'ativos') return state === 'ativa';
        return true;
      });

      if (!filtered.length) return interaction.editReply(`Nenhum cadastro encontrado para o filtro "${filtro}".`);

      const csvContent = buildRegistrationsCsv(filtered);
      const FILTRO_LABEL = { todos: 'todos os cadastros', vencidos: 'vencidos/inativos', proximos: 'próximos do vencimento', ativos: 'ativos' };

      return interaction.editReply({
        content: `Exportação gerada: ${filtered.length} registro(s) (${FILTRO_LABEL[filtro]}).`,
        files: [new AttachmentBuilder(Buffer.from(csvContent, 'utf8'), { name: `cnh-${filtro}.csv` })]
      });
    }
    if (interaction.commandName === 'cnh-excluir') {
      const target = interaction.options.getUser('usuario', true);
      const existing = await getRegistration(target.id);
      if (!existing) return interaction.reply({ content: 'Esse usuário não possui CNH cadastrada.', ephemeral: true });
      await deleteRegistration(target.id);
      const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);
      if (logChannel) await logChannel.send(`🗑️ ${interaction.user} excluiu a CNH de ${target}.`).catch(() => null);
      return interaction.reply({ content: `CNH de ${target.tag} excluída com sucesso.`, ephemeral: true });
    }

    /*
     * ---- Comandos de teste (staff) ----
     * Existem para validar vencimento + remoção/concessão de cargo sem
     * precisar esperar os prazos reais (30/40 dias) ou o cron das 9h.
     */

    if (interaction.commandName === 'cnh-simular-vencimento') {
      const target = interaction.options.getUser('usuario', true);
      const dias = interaction.options.getInteger('dias') ?? 31;
      const existing = await getRegistration(target.id);
      if (!existing) return interaction.reply({ content: `${target.tag} não possui CNH cadastrada. Cadastre primeiro para poder simular.`, ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      await setRegistrationAge(target.id, dias);
      const row = await getRegistration(target.id);

      const adminChannel = await client.channels.fetch(env.adminChannelId).catch(() => null);
      const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);
      const guild = interaction.guild ?? await client.guilds.fetch(env.guildId).catch(() => null);
      const { days, state } = await auditRegistration(client, env, row, { adminChannel, logChannel, guild });

      const statusLabel = { ativa: '🟢 ativa', proximo: '🟡 próxima do vencimento', vencida: '🔴 vencida', inativa: '⚫ inativa' }[state];
      const roleNote = env.removeRoleOnExpire
        ? 'A remoção/concessão de cargo (se aplicável) já foi processada — confira o canal de log e os cargos do usuário.'
        : '⚠️ REMOVE_ROLE_ON_EXPIRE está desativado no ambiente, então o cargo não foi alterado — apenas o status foi simulado.';

      return interaction.editReply(
        `Simulação aplicada em ${target}.\nÚltima renovação agora aparenta ter **${days} dias** → status **${statusLabel}**.\n${roleNote}\n\nPara desfazer, rode novamente com \`dias: 0\`.`
      );
    }

    if (interaction.commandName === 'cnh-forcar-auditoria') {
      await interaction.deferReply({ ephemeral: true });
      const summary = await runDailyAudit(client, env);
      return interaction.editReply(
        `Auditoria executada manualmente.\n🟢 Ativas: ${summary.ativa} | 🟡 Próximas: ${summary.proximo} | 🔴 Vencidas: ${summary.vencida} | ⚫ Inativas: ${summary.inativa}\n\nConfira o canal de log para ver quem teve cargo removido nesta execução.`
      );
    }

    if (interaction.commandName === 'cnh-cargo') {
      const target = interaction.options.getUser('usuario', true);
      const acao = interaction.options.getString('acao', true);
      await interaction.deferReply({ ephemeral: true });
      const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);
      const guild = interaction.guild ?? await client.guilds.fetch(env.guildId).catch(() => null);

      if (acao === 'conceder') {
        await grantMemberRole(guild, target.id, env, { logChannel, reason: `Concedido manualmente por ${interaction.user.tag}` });
      } else {
        await revokeMemberRole(guild, target.id, env, { logChannel, reason: `Removido manualmente por ${interaction.user.tag}` });
      }

      return interaction.editReply(
        `Ação "${acao}" solicitada para ${target}. Confira o canal de log: se aparecer um aviso de ⚠️ falha, normalmente é a hierarquia de cargos do bot que precisa ser ajustada.`
      );
    }
  }
  if (interaction.isButton()) {
    if (interaction.customId === 'cnh_register') return interaction.showModal(buildModal('cnh_modal_register', 'Cadastro CNH Virtual'));
    if (interaction.customId === 'cnh_renew') return interaction.showModal(buildModal('cnh_modal_renew', 'Renovação CNH Virtual'));
    if (interaction.customId === 'cnh_status') {
      await interaction.deferReply({ ephemeral: true });
      const row = await getRegistration(interaction.user.id);
      if (!row) return interaction.editReply({ content: 'Você ainda não possui cadastro na CNH Virtual.' });
      const card = await generateCard(interaction.user, row);
      return interaction.editReply({ content: `Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)] });
    }
  }
  if (interaction.isModalSubmit()) {
    if (!['cnh_modal_register', 'cnh_modal_renew'].includes(interaction.customId)) return;
    const nomeCompleto = interaction.fields.getTextInputValue('nome_completo');
    const identificacaoEmpresa = interaction.fields.getTextInputValue('identificacao_empresa');
    const telefone = normalizePhone(interaction.fields.getTextInputValue('telefone'));
    const steamId = normalizeSteamId(interaction.fields.getTextInputValue('steam_id'));
    if (!isValidPhone(telefone)) return interaction.reply({ content: 'Telefone inválido. Use formato internacional, por exemplo: +55 12 91234 5678', ephemeral: true });
    if (!isValidSteamId(steamId)) return interaction.reply({ content: 'Steam ID inválido. Use o formato numérico longo, por exemplo: 7656119...', ephemeral: true });

    /*
     * A partir daqui o processamento é pesado (gerar a imagem do card,
     * baixar o avatar, subir um arquivo grande, mexer em cargo) e pode
     * facilmente passar dos 3s que o Discord dá para a resposta inicial.
     * Por isso confirmamos a interação (defer) ANTES de fazer qualquer
     * coisa pesada, e só respondemos de verdade (editReply) no final.
     */
    await interaction.deferReply({ ephemeral: true });

    try {
      const now = isoNow();
      await upsertRegistration({ discord_user_id: interaction.user.id, discord_tag: interaction.user.tag, nome_completo: nomeCompleto, identificacao_empresa: identificacaoEmpresa, telefone, steam_id: steamId, created_at: now, updated_at: now });
      const row = await getRegistration(interaction.user.id);
      const card = await generateCard(interaction.user, row);
      const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);

      /*
       * Concede o cargo de membro ativo sempre que o cadastro ou a
       * renovação forem concluídos com sucesso (controlado por
       * GRANT_ROLE_ON_REGISTER). Se o cargo tiver sido removido por
       * vencimento, isso também devolve o acesso na renovação.
       *
       * interaction.guild depende do cache interno do discord.js; em vez
       * de confiar cegamente nele, buscamos via API se estiver vazio —
       * isso evita a concessão falhar em silêncio logo após o bot
       * reiniciar ou em qualquer instabilidade momentânea de cache.
       */
      if (env.grantRoleOnRegister) {
        const guild = interaction.guild ?? await client.guilds.fetch(env.guildId).catch(() => null);
        const reason = interaction.customId === 'cnh_modal_register' ? 'CNH Virtual cadastrada' : 'CNH Virtual renovada';
        await grantMemberRole(guild, interaction.user.id, env, { logChannel, reason });
      }

      if (logChannel) await logChannel.send({ content: `${interaction.user} atualizou a CNH Virtual.`, files: [new AttachmentBuilder(card.path)] }).catch(() => null);
      const text = interaction.customId === 'cnh_modal_register' ? 'Cadastro concluído com sucesso.' : 'Renovação concluída com sucesso.';
      return await interaction.editReply({ content: `${text} Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)] });
    } catch (error) {
      console.error('[modalSubmit] Falha ao processar CNH:', error);
      return interaction.editReply({ content: 'Ocorreu um erro ao processar sua CNH. Tente novamente em instantes; se persistir, avise a staff.' }).catch(() => null);
    }
  }
  } catch (error) {
    console.error('[interactionCreate] Erro não tratado:', error);
    const genericMessage = 'Ocorreu um erro inesperado ao processar essa ação. Tente novamente; se persistir, avise a staff.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: genericMessage }).catch(() => null);
    } else {
      await interaction.reply({ content: genericMessage, ephemeral: true }).catch(() => null);
    }
  }
});
/*
 * Só loga no Discord depois que o schema/migrações do banco estiverem
 * 100% aplicados — evita a corrida em que uma interação chegava antes
 * do ALTER TABLE terminar (causava "no column named ..." em produção).
 */
databaseReady
  .then(() => client.login(env.token))
  .catch(error => {
    console.error('[db] Falha ao inicializar banco de dados, abortando:', error);
    process.exit(1);
  });
