const fs = require('fs');
const path = require('path');
const {
  createCanvas,
  loadImage,
  registerFont
} = require('canvas');

const { DATA_DIR } = require('./database');
const {
  addDays,
  brDate,
  daysSince,
  classify
} = require('../utils/date');

const ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

const TEMPLATE_PATH = path.join(
  ASSETS_DIR,
  'cnh-template.jpg'
);

const FONT_REGULAR = path.join(
  ASSETS_DIR,
  'NotoSans-Regular.ttf'
);

const FONT_BOLD = path.join(
  ASSETS_DIR,
  'NotoSans-Bold.ttf'
);

function registerLocalFonts() {
  if (fs.existsSync(FONT_REGULAR)) {
    registerFont(FONT_REGULAR, {
      family: 'CNH Regular'
    });
  }

  if (fs.existsSync(FONT_BOLD)) {
    registerFont(FONT_BOLD, {
      family: 'CNH Bold'
    });
  }
}

function getFont(weight, size) {
  return weight === 'bold'
    ? `${size}px "CNH Bold"`
    : `${size}px "CNH Regular"`;
}

function fitText(
  ctx,
  text,
  maxWidth,
  initialSize,
  weight = 'regular',
  minimumSize = 18
) {
  let size = initialSize;

  while (size >= minimumSize) {
    ctx.font = getFont(weight, size);

    if (
      ctx.measureText(String(text)).width <= maxWidth
    ) {
      return size;
    }

    size -= 1;
  }

  return minimumSize;
}

function drawText(ctx, text, options = {}) {
  const {
    x,
    y,
    maxWidth = 500,
    size = 28,
    weight = 'regular',
    color = '#ffffff',
    align = 'left',
    baseline = 'middle',
    minimumSize = 18
  } = options;

  const finalSize = fitText(
    ctx,
    text,
    maxWidth,
    size,
    weight,
    minimumSize
  );

  ctx.font = getFont(weight, finalSize);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  ctx.fillText(String(text), x, y);
}

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
}

function ensureAssets() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(
      [
        'Template não encontrado:',
        TEMPLATE_PATH,
        'Coloque cnh-template.jpg dentro de assets/.'
      ].join(' ')
    );
  }

  if (!fs.existsSync(FONT_REGULAR)) {
    console.warn(
      `Fonte regular não encontrada: ${FONT_REGULAR}`
    );
  }

  if (!fs.existsSync(FONT_BOLD)) {
    console.warn(
      `Fonte bold não encontrada: ${FONT_BOLD}`
    );
  }
}

async function drawAvatar(ctx, user) {
  try {
    const avatarUrl = user.displayAvatarURL({
      extension: 'png',
      size: 512
    });

    const avatar = await loadImage(avatarUrl);

    /*
     * Área correta da foto na imagem de 1728x1080.
     * O quadro original começa aproximadamente em:
     * x = 218, y = 367
     * largura = 283, altura = 282
     */
    const x = 220;
    const y = 368;
    const width = 276;
    const height = 278;

    ctx.save();

    ctx.beginPath();
    ctx.roundRect(
      x,
      y,
      width,
      height,
      18
    );

    ctx.clip();

    ctx.drawImage(
      avatar,
      x,
      y,
      width,
      height
    );

    ctx.restore();
  } catch (error) {
    console.error(
      'Erro ao carregar avatar:',
      error.message
    );
  }
}

async function generateCard(user, row) {
  registerLocalFonts();
  ensureAssets();
  ensureDirectory(DATA_DIR);

  const template = await loadImage(
    TEMPLATE_PATH
  );

  const canvas = createCanvas(
    template.width,
    template.height
  );

  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    template,
    0,
    0,
    template.width,
    template.height
  );

  await drawAvatar(ctx, user);

  const renewalDate = brDate(row.updated_at);

  const validityDate = brDate(
    addDays(row.updated_at, 30)
  );

  const days = daysSince(row.updated_at);
  const status = classify(days).toUpperCase();

  /*
   * Valores alinhados aos respectivos rótulos
   * do template original.
   *
   * Os rótulos permanecem na imagem.
   * O código desenha apenas os valores.
   */
  const valueX = 600;
  const valueWidth = 500;

  drawText(ctx, row.nome_completo, {
    x: valueX,
    y: 398,
    maxWidth: valueWidth,
    size: 27,
    color: '#ffffff'
  });

  drawText(ctx, row.telefone, {
    x: valueX,
    y: 462,
    maxWidth: valueWidth,
    size: 27,
    color: '#ffffff'
  });

  drawText(ctx, row.steam_id, {
    x: valueX,
    y: 526,
    maxWidth: valueWidth,
    size: 27,
    color: '#ffffff'
  });

  drawText(ctx, renewalDate, {
    x: valueX,
    y: 590,
    maxWidth: valueWidth,
    size: 27,
    color: '#ffffff'
  });

  drawText(ctx, validityDate, {
    x: valueX,
    y: 654,
    maxWidth: valueWidth,
    size: 27,
    color: '#ffffff'
  });

  /*
   * Identificação da empresa:
   * não deve ser desenhada dentro da foto.
   * Foi movida para a área inferior esquerda.
   */
  const companyId =
    row.identificacao_empresa ||
    `[C.EUCATUR] ${user.username}`;

  drawText(ctx, companyId, {
    x: 225,
    y: 710,
    maxWidth: 390,
    size: 22,
    color: '#fff0c6',
    minimumSize: 16
  });

  /*
   * O selo de status está aproximadamente
   * entre x = 1360 e 1515,
   * y = 350 e 505.
   */
  let statusColor = '#fff4c4';

  if (status === 'VENCIDA') {
    statusColor = '#ffe08a';
  }

  if (status === 'INATIVA') {
    statusColor = '#ffb4b4';
  }

  if (status === 'PROXIMO') {
    statusColor = '#dbeafe';
  }

  drawText(ctx, status === 'ATIVA' ? 'ATIVO' : status, {
    x: 1440,
    y: 452,
    maxWidth: 230,
    size: 31,
    weight: 'bold',
    color: statusColor,
    align: 'center',
    minimumSize: 20
  });

  const outputPath = path.join(
    DATA_DIR,
    `cnh-${user.id}.png`
  );

  fs.writeFileSync(
    outputPath,
    canvas.toBuffer('image/png')
  );

  return {
    path: outputPath,
    status,
    days
  };
}

module.exports = {
  generateCard,
  registerLocalFonts
};