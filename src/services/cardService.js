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
     * Área do quadro da foto na imagem final (template 2400x1500):
     * x: 340 até 655
     * y: 530 até 875
     */
    const x = 340;
    const y = 530;
    const width = 315;
    const height = 345;

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
   * Coordenadas conferidas pixel a pixel na imagem real do template
   * (cnh-template.jpg, 2400x1500). Os rótulos já existem no template;
   * o texto do rótulo mais longo ("Data de Renovação:") termina em
   * x≈1245, então os valores começam em x=1280 para não sobrepor.
   * Os y foram medidos no centro vertical de cada linha de rótulo.
   */
  const valueX = 1280;
  const valueWidth = 360;

  drawValue(ctx, row.nome_completo, {
    x: valueX,
    y: 549,
    maxWidth: valueWidth,
    size: 34
  });

  drawValue(ctx, row.telefone, {
    x: valueX,
    y: 625,
    maxWidth: valueWidth,
    size: 34
  });

  drawValue(ctx, row.steam_id, {
    x: valueX,
    y: 701,
    maxWidth: valueWidth,
    size: 30
  });

  drawValue(ctx, renewalDate, {
    x: valueX,
    y: 780,
    maxWidth: valueWidth,
    size: 34
  });

  drawValue(ctx, validityDate, {
    x: valueX,
    y: 852,
    maxWidth: valueWidth,
    size: 34
  });

  /*
   * Identificação da empresa abaixo do quadro da foto
   * (quadro termina em y≈875, área livre até o topo dos caminhões).
   */
  const companyId =
    row.identificacao_empresa ||
    `[C.EUCATUR] ${user.username}`;

  drawValue(ctx, companyId, {
    x: 340,
    y: 905,
    maxWidth: 315,
    size: 22,
    color: '#f8edc9'
  });

  /*
   * Selo de status: sobrepõe o "ATIVO" estático do template,
   * centrado no mesmo local (x≈1753, y≈621, acima do círculo dourado).
   * Como esse texto já vem "gravado" no fundo da imagem, primeiro
   * pintamos um retângulo na cor de fundo por baixo, para que status
   * diferentes de ATIVO (ex: VENCIDA) não fiquem sobrepostos ao
   * texto original do template.
   */
  const statusLabel =
    status === 'ATIVA' ? 'ATIVO' : status;

  ctx.save();
  ctx.font = getFont('bold', 32);
  const statusTextWidth = ctx.measureText(
    statusLabel
  ).width;
  const patchWidth = Math.max(
    statusTextWidth + 40,
    140
  );

  ctx.fillStyle = '#141f29';
  ctx.beginPath();
  ctx.roundRect(
    1753 - patchWidth / 2,
    596,
    patchWidth,
    52,
    10
  );
  ctx.fill();
  ctx.restore();

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
    statusLabel,
    {
      x: 1753,
      y: 621,
      maxWidth: 220,
      size: 32,
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