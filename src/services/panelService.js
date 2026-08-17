const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { env } = require('../config/env');

const PANEL_STORE = path.join(env.dataDir, 'panel-message.json');
if (!fs.existsSync(env.dataDir)) fs.mkdirSync(env.dataDir, { recursive: true });

function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x0f766e)
    .setTitle('CNH Virtual • Consórcio Eucatur')
    .setDescription('Cadastro e renovação mensal da sua CNH Virtual. Mantenha seus dados atualizados para continuar regular na empresa.')
    .addFields(
      { name: 'Nome Completo', value: 'Ex.: Fulano de Tal da Silva', inline: false },
      { name: 'Identificação padrão da empresa', value: 'Ex.: [EMPRESA] Fulano - 12345', inline: false },
      { name: 'Telefone', value: 'Aceita formato internacional. Ex.: +55 12 91234 5678', inline: false },
      { name: 'Steam ID', value: 'Use o formato numérico longo. Ex.: 7656119...', inline: false }
    )
    .setFooter({ text: 'Consórcio Eucatur • Painel permanente' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cnh_register').setLabel('Cadastrar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cnh_renew').setLabel('Renovar').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cnh_status').setLabel('Meu status').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

function loadStoredPanelMessageId() {
  if (!fs.existsSync(PANEL_STORE)) return '';
  try {
    const data = JSON.parse(fs.readFileSync(PANEL_STORE, 'utf8'));
    return data.messageId || '';
  } catch {
    return '';
  }
}

function saveStoredPanelMessageId(messageId) {
  fs.writeFileSync(PANEL_STORE, JSON.stringify({ messageId }, null, 2));
}

async function ensurePanelMessage(client, runtimeEnv) {
  const channel = await client.channels.fetch(runtimeEnv.panelChannelId).catch(() => null);
  if (!channel) return '';

  let messageId = runtimeEnv.panelMessageId || loadStoredPanelMessageId();
  let message = null;

  if (messageId) message = await channel.messages.fetch(messageId).catch(() => null);

  if (!message) {
    const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    if (recent) {
      message = recent.find(msg => msg.author.id === client.user.id && msg.embeds?.[0]?.title === 'CNH Virtual • Consórcio Eucatur') || null;
    }
  }

  if (message) {
    await message.edit(panelPayload()).catch(() => null);
    saveStoredPanelMessageId(message.id);
    return message.id;
  }

  const sent = await channel.send(panelPayload()).catch(() => null);
  if (sent) saveStoredPanelMessageId(sent.id);
  return sent?.id || '';
}

module.exports = { panelPayload, ensurePanelMessage };
