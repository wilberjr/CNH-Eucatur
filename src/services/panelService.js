const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { env } = require('../config/env');

const PANEL_STORE = path.join(env.dataDir, 'panel-message.json');
if (!fs.existsSync(env.dataDir)) fs.mkdirSync(env.dataDir, { recursive: true });

const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'assets');
const PREVIEW_PATH = path.join(ASSETS_DIR, 'cnh-preview.jpg');

/*
 * Cor dourada extraída do próprio template (título "CNH Virtual"),
 * para o embed conversar visualmente com o card gerado.
 */
const BRAND_COLOR = 0xffbd59;

function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🚍 CNH Virtual — Consórcio Eucatur')
    .setDescription(
      [
        'Sua carteira virtual de motorista do consórcio. Cadastre-se, mantenha os dados em dia e continue circulando pelas rotas oficiais.',
        '',
        '**📋 Como funciona**',
        '🔹 Cadastro leva menos de 1 minuto',
        '🔹 Renovação obrigatória a cada **30 dias**',
        '🔹 CNH vencida = acesso aos canais internos suspenso até renovar',
        '',
        '**📝 Dados solicitados**',
        '👤 **Nome completo**',
        '🏷️ **Identificação da empresa** — `[EMPRESA] Nome - Matrícula`',
        '📞 **Telefone** — formato internacional, ex: `+55 12 91234 5678`',
        '🎮 **Steam ID** — ex: `7656119...`'
      ].join('\n')
    )
    .setFooter({ text: 'Consórcio Eucatur • Renovação obrigatória a cada 30 dias' });

  const files = [];

  if (fs.existsSync(PREVIEW_PATH)) {
    files.push(new AttachmentBuilder(PREVIEW_PATH, { name: 'cnh-preview.jpg' }));
    embed.setImage('attachment://cnh-preview.jpg');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cnh_register').setLabel('Cadastrar').setEmoji('📝').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cnh_renew').setLabel('Renovar').setEmoji('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cnh_status').setLabel('Meu status').setEmoji('🪪').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row], files };
}

function loadStoredPanelMessageId() { if (!fs.existsSync(PANEL_STORE)) return ''; try { return JSON.parse(fs.readFileSync(PANEL_STORE, 'utf8')).messageId || ''; } catch { return ''; } }
function saveStoredPanelMessageId(messageId) { fs.writeFileSync(PANEL_STORE, JSON.stringify({ messageId }, null, 2)); }

async function ensurePanelMessage(client, runtimeEnv) {
  const channel = await client.channels.fetch(runtimeEnv.panelChannelId).catch(() => null);
  if (!channel) return '';
  let messageId = runtimeEnv.panelMessageId || loadStoredPanelMessageId();
  let message = null;
  if (messageId) message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    if (recent) message = recent.find(msg => msg.author.id === client.user.id && msg.embeds?.[0]?.title === 'CNH Virtual • Consórcio Eucatur') || recent.find(msg => msg.author.id === client.user.id && msg.embeds?.[0]?.title === '🚍 CNH Virtual — Consórcio Eucatur') || null;
  }
  if (message) { await message.edit(panelPayload()).catch(() => null); saveStoredPanelMessageId(message.id); return message.id; }
  const sent = await channel.send(panelPayload()).catch(() => null);
  if (sent) saveStoredPanelMessageId(sent.id);
  return sent?.id || '';
}

module.exports = { panelPayload, ensurePanelMessage };
