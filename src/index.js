const cron = require('node-cron');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  AttachmentBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { env, validateEnv } = require('./config/env');
const { isoNow, daysSince, classify } = require('./utils/date');
const { canUseStaff } = require('./utils/permissions');
const { normalizePhone, isValidPhone, normalizeSteamId, isValidSteamId } = require('./utils/validation');
const { registerCommands } = require('./commands/registerCommands');
const { ensureBaseCard, generateCard } = require('./services/cardService');
const { ensurePanelMessage } = require('./services/panelService');
const { runDailyAudit } = require('./services/auditService');
const { upsertRegistration, getRegistration, getAllRegistrations } = require('./services/registrationService');

validateEnv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

function buildModal(customId, title) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome_completo')
          .setLabel('Nome Completo')
          .setPlaceholder('Fulano de Tal da Silva')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('identificacao_empresa')
          .setLabel('Identificação padrão da empresa')
          .setPlaceholder('[EMPRESA] Fulano - 12345')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('telefone')
          .setLabel('Telefone')
          .setPlaceholder('+55 12 91234 5678')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('steam_id')
          .setLabel('Steam ID')
          .setPlaceholder('7656119...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function summarize(rows) {
  const count = { ativa: 0, proximo: 0, vencida: 0, inativa: 0 };
  for (const row of rows) count[classify(daysSince(row.updated_at))]++;
  return count;
}

client.once(Events.ClientReady, async ready => {
  await ensureBaseCard();
  await registerCommands(env);
  await ensurePanelMessage(client, env);
  cron.schedule('0 9 * * *', () => runDailyAudit(client, env).catch(console.error), { timezone: env.timezone });
  console.log(`Bot online como ${ready.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'cnh-painel') {
      if (!canUseStaff(interaction, env)) return interaction.reply({ content: 'Apenas a staff pode atualizar o painel.', ephemeral: true });
      const panelId = await ensurePanelMessage(client, env);
      return interaction.reply({ content: panelId ? `Painel confirmado. Mensagem: ${panelId}` : 'Não consegui confirmar o painel.', ephemeral: true });
    }

    if (interaction.commandName === 'cnh-status') {
      const row = await getRegistration(interaction.user.id);
      if (!row) return interaction.reply({ content: 'Você ainda não possui cadastro na CNH Virtual.', ephemeral: true });
      const card = await generateCard(interaction.user, row);
      return interaction.reply({ content: `Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)], ephemeral: true });
    }

    if (['cnh-admin', 'cnh-vencidos', 'cnh-proximos'].includes(interaction.commandName) && !canUseStaff(interaction, env)) {
      return interaction.reply({ content: 'Apenas a staff pode usar esse comando.', ephemeral: true });
    }

    if (interaction.commandName === 'cnh-admin') {
      const rows = await getAllRegistrations();
      const count = summarize(rows);
      const embed = new EmbedBuilder()
        .setColor(0x1d4ed8)
        .setTitle('Painel administrativo • CNH Virtual')
        .addFields(
          { name: 'Ativas', value: String(count.ativa), inline: true },
          { name: 'Próximas', value: String(count.proximo), inline: true },
          { name: 'Vencidas', value: String(count.vencida), inline: true },
          { name: 'Inativas', value: String(count.inativa), inline: true }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'cnh-vencidos') {
      const rows = await getAllRegistrations();
      const filtered = rows.filter(row => ['vencida', 'inativa'].includes(classify(daysSince(row.updated_at))));
      const text = filtered.slice(0, 30).map(row => `• ${row.nome_completo} — ${daysSince(row.updated_at)} dias`).join('\n');
      return interaction.reply({ content: text || 'Nenhum cadastro vencido ou inativo encontrado.', ephemeral: true });
    }

    if (interaction.commandName === 'cnh-proximos') {
      const rows = await getAllRegistrations();
      const text = rows.filter(row => classify(daysSince(row.updated_at)) === 'proximo').slice(0, 30).map(row => `• ${row.nome_completo} — ${daysSince(row.updated_at)} dias`).join('\n');
      return interaction.reply({ content: text || 'Nenhum cadastro próximo do vencimento.', ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'cnh_register') return interaction.showModal(buildModal('cnh_modal_register', 'Cadastro CNH Virtual'));
    if (interaction.customId === 'cnh_renew') return interaction.showModal(buildModal('cnh_modal_renew', 'Renovação CNH Virtual'));
    if (interaction.customId === 'cnh_status') {
      const row = await getRegistration(interaction.user.id);
      if (!row) return interaction.reply({ content: 'Você ainda não possui cadastro na CNH Virtual.', ephemeral: true });
      const card = await generateCard(interaction.user, row);
      return interaction.reply({ content: `Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)], ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    if (!['cnh_modal_register', 'cnh_modal_renew'].includes(interaction.customId)) return;

    const nomeCompleto = interaction.fields.getTextInputValue('nome_completo');
    const identificacaoEmpresa = interaction.fields.getTextInputValue('identificacao_empresa');
    const telefone = normalizePhone(interaction.fields.getTextInputValue('telefone'));
    const steamId = normalizeSteamId(interaction.fields.getTextInputValue('steam_id'));

    if (!isValidPhone(telefone)) {
      return interaction.reply({
        content: 'Telefone inválido. Use formato internacional, por exemplo: +55 12 91234 5678',
        ephemeral: true
      });
    }

    if (!isValidSteamId(steamId)) {
      return interaction.reply({
        content: 'Steam ID inválido. Use o formato numérico longo, por exemplo: 7656119...',
        ephemeral: true
      });
    }

    const now = isoNow();
    await upsertRegistration({
      discord_user_id: interaction.user.id,
      discord_tag: interaction.user.tag,
      nome_completo: nomeCompleto,
      identificacao_empresa: identificacaoEmpresa,
      telefone,
      steam_id: steamId,
      created_at: now,
      updated_at: now
    });

    const row = await getRegistration(interaction.user.id);
    const card = await generateCard(interaction.user, row);
    const logChannel = await client.channels.fetch(env.logChannelId).catch(() => null);
    if (logChannel) {
      await logChannel.send({ content: `${interaction.user} atualizou a CNH Virtual.`, files: [new AttachmentBuilder(card.path)] }).catch(() => null);
    }

    const text = interaction.customId === 'cnh_modal_register' ? 'Cadastro concluído com sucesso.' : 'Renovação concluída com sucesso.';
    return interaction.reply({ content: `${text} Status atual: ${card.status}.`, files: [new AttachmentBuilder(card.path)], ephemeral: true });
  }
});

client.login(env.token);
