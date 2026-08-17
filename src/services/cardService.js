const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { DATA_DIR } = require('./database');
const { addDays, brDate, daysSince, classify } = require('../utils/date');
const { trim } = require('../utils/text');

const ROOT = path.join(__dirname, '..', '..');
const ASSET_DIR = path.join(ROOT, 'assets');
const CARD_PATH = path.join(ASSET_DIR, 'base-card.png');

if (!fs.existsSync(ASSET_DIR)) fs.mkdirSync(ASSET_DIR, { recursive: true });

async function ensureBaseCard() {
  if (fs.existsSync(CARD_PATH)) return;
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, '#0d1b2a');
  gradient.addColorStop(0.34, '#8b5a1e');
  gradient.addColorStop(0.70, '#e8bf67');
  gradient.addColorStop(1, '#0a6175');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1280, 720);

  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + i * 0.007})`;
    ctx.fillRect(60 + i * 100, 0, 2, 720);
  }

  ctx.fillStyle = 'rgba(10,15,23,0.44)';
  ctx.roundRect(36, 36, 1208, 648, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.roundRect(36, 36, 1208, 648, 28);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 58px Sans';
  ctx.fillText('CNH Virtual', 72, 118);
  ctx.fillStyle = '#dcfce7';
  ctx.font = 'bold 32px Sans';
  ctx.fillText('Consórcio Eucatur', 74, 160);
  ctx.fillStyle = '#bfdbfe';
  ctx.font = 'bold 22px Sans';
  ctx.fillText('Documento corporativo de atividade mensal', 74, 194);

  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.roundRect(74, 230, 260, 300, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.stroke();
  ctx.fillStyle = '#dbeafe';
  ctx.font = 'bold 30px Sans';
  ctx.fillText('FOTO', 168, 395);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Sans';
  ctx.fillText('Nome Completo', 380, 252);
  ctx.fillText('Identificação da Empresa', 380, 336);
  ctx.fillText('Telefone', 380, 420);
  ctx.fillText('Steam ID', 380, 504);
  ctx.fillText('Validade', 380, 588);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 24px Sans';
  ctx.fillText('Status', 980, 588);
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText('ATIVA', 980, 622);

  fs.writeFileSync(CARD_PATH, canvas.toBuffer('image/png'));
}

async function generateCard(user, row) {
  await ensureBaseCard();
  const base = await loadImage(CARD_PATH);
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0, 1280, 720);

  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 96, 245, 215, 215);
  } catch {}

  const validity = addDays(row.updated_at, 30);
  const days = daysSince(row.updated_at);
  const status = classify(days).toUpperCase();
  const color = status === 'ATIVA' ? '#bbf7d0' : status === 'VENCIDA' ? '#fde68a' : status === 'INATIVA' ? '#fecaca' : '#bfdbfe';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Sans';
  ctx.fillText(trim(row.nome_completo, 42), 380, 290);
  ctx.font = '28px Sans';
  ctx.fillText(trim(row.identificacao_empresa, 42), 380, 374);
  ctx.fillText(trim(row.telefone, 42), 380, 458);
  ctx.fillText(trim(row.steam_id, 42), 380, 542);
  ctx.fillText(brDate(validity), 380, 626);

  ctx.fillStyle = '#c7d2fe';
  ctx.font = 'bold 22px Sans';
  ctx.fillText(`Discord: ${trim(user.username, 20)}`, 74, 596);
  ctx.fillText(`Última atualização: ${brDate(row.updated_at)}`, 380, 668);

  ctx.fillStyle = color;
  ctx.font = 'bold 28px Sans';
  ctx.fillText(status, 980, 622);

  const out = path.join(DATA_DIR, `cnh-${user.id}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return { path: out, status, days };
}

module.exports = { ensureBaseCard, generateCard };
