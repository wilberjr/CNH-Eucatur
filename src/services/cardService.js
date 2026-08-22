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
  value,
  maxWidth,
  initialSize,
  weight = 'regular',
  minimumSize = 14
) {
  let size = initialSize;

  while (size > minimumSize) {
    ctx.font = getFont(weight, size);

    if (
      ctx.measureText(String(value)).width <= maxWidth
    ) {
      return size;
    }

    size -= 1;
  }

  return minimumSize;
}

function drawValue(ctx, value, options) {
  const {
    x,
    y,
    maxWidth,
    size = 20,
    color = '#ffffff',
    weight = 'regular',
    align = 'left'
  } = options;

  const finalSize = fitText(
    ctx,
    value,
    maxWidth,
    size,
    weight
  );

  ctx.font = getFont(weight, finalSize);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  ctx.fillText(
    String(value),
    x,
    y
  );
}

function ensureFiles() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(
      `Arquivo não encontrado: ${TEMPLATE_PATH}`
    );
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }
}

async function drawAvatar(ctx, user) {
  try {
    const avatar = await loadImage(
      user.displayAvatarURL({
        extension: 'png',
        size: 512
      })
    );

    /*
     * Área do quadro da foto na imagem final:
     * x: 158 até 357
     * y: 264 até 465
     */
    const x = 158;
    const y = 264;
    const width = 199;
    const height = 201;

    ctx.save();

    ctx.beginPath();
    ctx.roundRect(
      x,
      y,
      width,
      height,
      14
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
  ensureFiles();

  const template = await loadImage(
    TEMPLATE_PATH
  );

  /*
   * O Canvas usa a resolução real da imagem.
   * Não use 1280x720 fixo aqui.
   */
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

  const days = daysSince(row.updated_at);
  const status = classify(days).toUpperCase();

  const renewalDate = brDate(
    row.updated_at
  );

  const validityDate = brDate(
    addDays(row.updated_at, 30)
  );

  /*
   * Coordenadas conferidas na imagem final 1258x689.
   * Os rótulos já existem no template.
   * Aqui são desenhados somente os valores.
   */
  const valueX = 600;
  const valueWidth = 450;

  drawValue(ctx, row.nome_completo, {
    x: valueX,
    y: 398,
    maxWidth: valueWidth,
    size: 24
  });

  drawValue(ctx, row.telefone, {
    x: valueX,
    y: 450,
    maxWidth: valueWidth,
    size: 24
  });

  drawValue(ctx, row.steam_id, {
    x: valueX,
    y: 504,
    maxWidth: valueWidth,
    size: 21
  });

  drawValue(ctx, renewalDate, {
    x: valueX,
    y: 558,
    maxWidth: valueWidth,
    size: 24
  });

  drawValue(ctx, validityDate, {
    x: valueX,
    y: 612,
    maxWidth: valueWidth,
    size: 24
  });

  /*
   * Identificação da empresa abaixo do quadro da foto.
   */
  const companyId =
    row.identificacao_empresa ||
    `[C.EUCATUR] ${user.username}`;

  drawValue(ctx, companyId, {
    x: 158,
    y: 509,
    maxWidth: 270,
    size: 15,
    color: '#f8edc9'
  });

  /*
   * Selo de status à direita.
   */
  let statusColor = '#fff6cf';

  if (status === 'VENCIDA') {
    statusColor = '#ffe08a';
  }

  if (status === 'INATIVA') {
    statusColor = '#ffb4b4';
  }

  if (status === 'PROXIMO') {
    statusColor = '#dbeafe';
  }

  drawValue(
    ctx,
    status === 'ATIVA' ? 'ATIVO' : status,
    {
      x: 1025,
      y: 348,
      maxWidth: 130,
      size: 22,
      weight: 'bold',
      color: statusColor,
      align: 'center'
    }
  );

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