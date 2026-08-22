const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { DATA_DIR } = require('./database');
const { addDays, brDate, daysSince, classify } = require('../utils/date');

const ROOT = path.join(__dirname, '..', '..');
const ASSET_DIR = path.join(ROOT, 'assets');
const TEMPLATE_PATH = path.join(ASSET_DIR, 'cnh-template.jpg');
const FONT_REGULAR = path.join(ASSET_DIR, 'NotoSans-Regular.ttf');
const FONT_BOLD = path.join(ASSET_DIR, 'NotoSans-Bold.ttf');

function registerLocalFonts() {
  if (fs.existsSync(FONT_REGULAR)) registerFont(FONT_REGULAR, { family: 'Noto Sans Local' });
  if (fs.existsSync(FONT_BOLD)) registerFont(FONT_BOLD, { family: 'Noto Sans Local Bold' });
}

function font(weight, size) {
  return weight === 'bold'
    ? `${size}px "Noto Sans Local Bold"`
    : `${size}px "Noto Sans Local"`;
}

function fitText(ctx, text, maxWidth, baseSize, weight = 'regular') {
  let size = baseSize;
  do {
    ctx.font = font(weight, size);
    if (ctx.measureText(String(text)).width <= maxWidth || size <= 18) break;
    size -= 1;
  } while (size > 18);
  return size;
}

async function generateCard(user, row) {
  registerLocalFonts();

  const template = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0, template.width, template.height);

  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(159, 263, 180, 225, 16);
    ctx.clip();
    ctx.drawImage(avatar, 159, 263, 180, 225);
    ctx.restore();
  } catch {}

  const renewalDate = brDate(row.updated_at);
  const validityDate = brDate(addDays(row.updated_at, 30));
  const days = daysSince(row.updated_at);
  const status = classify(days).toUpperCase();

  let statusColor = '#fff6cf';
  if (status === 'VENCIDA') statusColor = '#ffe08a';
  if (status === 'INATIVA') statusColor = '#ffb4b4';
  if (status === 'PROXIMO') statusColor = '#dbeafe';

  const nameX = 428;
  const valueX = 428;
  const nameY = 294;
  const gap = 62;
  const maxWidth = 420;

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  let s = fitText(ctx, row.nome_completo, maxWidth, 28, 'regular');
  ctx.font = font('regular', s);
  ctx.fillText(String(row.nome_completo), valueX, nameY);

  s = fitText(ctx, row.telefone, maxWidth, 28, 'regular');
  ctx.font = font('regular', s);
  ctx.fillText(String(row.telefone), valueX, nameY + gap);

  s = fitText(ctx, row.steam_id, maxWidth, 28, 'regular');
  ctx.font = font('regular', s);
  ctx.fillText(String(row.steam_id), valueX, nameY + gap * 2);

  ctx.font = font('regular', 28);
  ctx.fillText(renewalDate, valueX, nameY + gap * 3);
  ctx.fillText(validityDate, valueX, nameY + gap * 4);

  ctx.fillStyle = '#eadfbf';
  s = fitText(ctx, row.identificacao_empresa || user.username, 460, 24, 'regular');
  ctx.font = font('regular', s);
  ctx.fillText(String(row.identificacao_empresa || user.username), 430, 652);

  ctx.fillStyle = statusColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font('bold', 28);
  ctx.fillText(status === 'ATIVA' ? 'ATIVO' : status, 899, 347);
  ctx.textAlign = 'left';

  const out = path.join(DATA_DIR, `cnh-${user.id}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return { path: out, status, days };
}

module.exports = { generateCard, registerLocalFonts };
