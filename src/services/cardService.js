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
  const canvas = createCanvas(1100, 650);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 1100, 650);
  gradient.addColorStop(0, '#0d1b2a');
  gradient.addColorStop(0.34, '#8b5a1e');
  gradient.addColorStop(0.70, '#e8bf67');
  gradient.addColorStop(1, '#0a6175');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1100, 650);

  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + i * 0.008})`;
    ctx.fillRect(50 + i * 105, 0, 2, 650);
  }

  ctx.fillStyle = 'rgba(10,15,23,0.42)';
  ctx.roundRect(30, 30, 1040, 590, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.roundRect(30, 30, 1040, 590, 24);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 56px Sans';
  ctx.fillText('CNH Virtual', 70, 118);
  ctx.fillStyle = '#dcfce7';
  ctx.font = 'bold 30px Sans';
  ctx.fillText('Consórcio Eucatur', 72, 158);
  ctx.fillStyle = '#bfdbfe';
  ctx.font = 'bold 22px Sans';
  ctx.fillText('Documento corporativo de atividade mensal', 72, 192);

  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.roundRect(72, 228, 250, 290, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.stroke();
  ctx.fillStyle = '#dbeafe';
  ctx.font = 'bold 28px Sans';
  ctx.fillText('FOTO', 160, 386);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Sans';
  ctx.fillText('Nome completo', 360, 258);
  ctx.fillText('Telefone', 360, 344);
  ctx.fillText('Steam ID', 360, 430);
  ctx.fillText('Validade', 360, 516);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 24px Sans';
  ctx.fillText('Status', 820, 516);
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText('ATIVA', 820, 550);

  fs.writeFileSync(CARD_PATH, canvas.toBuffer('image/png'));
}

async function generateCard(user, row) {
  await ensureBaseCard();
  const base = await loadImage(CARD_PATH);
  const canvas = createCanvas(1100, 650);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0, 1100, 650);

  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, 92, 240, 210, 210);
  } catch {}

  const validity = addDays(row.updated_at, 30);
  const days = daysSince(row.updated_at);
  const status = classify(days).toUpperCase();
  const color = status === 'ATIVA' ? '#bbf7d0' : status === 'VENCIDA' ? '#fde68a' : status === 'INATIVA' ? '#fecaca' : '#bfdbfe';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Sans';
  ctx.fillText(trim(row.nome, 30), 360, 300);
  ctx.font = '28px Sans';
  ctx.fillText(trim(row.telefone, 32), 360, 386);
  ctx.fillText(trim(row.steam_id, 30), 360, 472);
  ctx.fillText(brDate(validity), 360, 558);

  ctx.fillStyle = '#c7d2fe';
  ctx.font = 'bold 24px Sans';
  ctx.fillText(`Discord: ${trim(user.username, 18)}`, 72, 570);
  ctx.fillText(`Última atualização: ${brDate(row.updated_at)}`, 360, 602);

  ctx.fillStyle = color;
  ctx.font = 'bold 28px Sans';
  ctx.fillText(status, 820, 550);

  const out = path.join(DATA_DIR, `cnh-${user.id}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return { path: out, status, days };
}

module.exports = { ensureBaseCard, generateCard };
