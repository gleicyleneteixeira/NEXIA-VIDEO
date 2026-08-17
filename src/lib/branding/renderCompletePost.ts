/**
 * Renderizador da arte "post completo" 1080×1080 com 4 layouts dinâmicos
 * (padrão agência/Canva), alternados pelo dia do calendário:
 *   A (split-hero)        – foto em moldura arredondada + badge + gancho
 *   B (giant-number)      – número gigante em destaque + dicas essenciais
 *   C (photo-overlay)     – foto full com degradê profundo + card elegante
 *   D (checklist-card)    – tag, título serifa e lista com checkmarks
 * Combinam tipografia serifa (ganchos/perguntas) com sans-serif (leitura).
 */

export interface BrandStyleConfig {
  handle: string;
  primaryColor: string; // Ex: '#0F172A'
  secondaryColor: string; // Ex: '#FFFFFF'
  accentColor: string; // Ex: '#38BDF8'
  logoDataUrl?: string; // Logo processada com fundo transparente
}

const CANVAS_SIZE = 1080;
const SERIF = "Georgia, serif";
const SANS = "Inter, system-ui, sans-serif";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });

/** Desenha a imagem recortada (cover) dentro da área w×h. */
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
): void => {
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let dw: number;
  let dh: number;
  if (imgRatio > canvasRatio) {
    dh = h;
    dw = h * imgRatio;
  } else {
    dw = w;
    dh = w / imgRatio;
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

/** Quebra o texto em linhas respeitando maxWidth (font já definida). */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Desenha texto com quebra à esquerda e retorna o próximo y. */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number
): number {
  const lines = wrapLines(ctx, text, maxWidth);
  const shown = maxLines ? lines.slice(0, maxLines) : lines;
  let cy = y;
  ctx.textAlign = "left";
  for (const line of shown) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

/** Desenha texto centralizado com quebra e retorna o próximo y. */
function drawWrappedTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number
): number {
  const lines = wrapLines(ctx, text, maxWidth);
  const shown = maxLines ? lines.slice(0, maxLines) : lines;
  let cy = y;
  ctx.textAlign = "center";
  for (const line of shown) {
    ctx.fillText(line, centerX, cy);
    cy += lineHeight;
  }
  return cy;
}

/** Desenha uma pill/badge arredondada. Retorna a largura desenhada. */
function drawPill(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  height: number,
  fill: string,
  textColor: string,
  font?: string,
  center = false
): number {
  ctx.font = font || `bold 20px ${SANS}`;
  const width = ctx.measureText(label).width + 48;
  const rx = center ? x - width / 2 : x;
  const radius = height / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(rx, y, width, height, radius);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rx + width / 2, y + height / 2 + 2);
  return width;
}

/** Desenha a logo no topo esquerdo, com backdrop escuro opcional para legibilidade. */
async function drawLogo(
  ctx: CanvasRenderingContext2D,
  logoDataUrl: string | undefined,
  x: number,
  y: number,
  maxHeight: number,
  backdrop: "dark" | "none" = "dark"
): Promise<void> {
  if (!logoDataUrl) return;
  try {
    const img = await loadImage(logoDataUrl);
    const scale = Math.min(maxHeight / img.height, 1.6);
    const w = img.width * scale;
    const h = img.height * scale;
    if (backdrop === "dark") {
      ctx.fillStyle = "rgba(9, 9, 11, 0.55)";
      ctx.beginPath();
      ctx.roundRect(x - 16, y - 16, w + 32, h + 32, 18);
      ctx.fill();
    }
    ctx.drawImage(img, x, y, w, h);
  } catch {
    /* logo não carrega: segue sem */
  }
}

/** Rodapé universal com o @ da marca. */
function drawFooter(ctx: CanvasRenderingContext2D, handle: string, accent: string): void {
  if (!handle) return;
  const text = handle.startsWith("@") ? handle : `@${handle}`;
  ctx.fillStyle = accent;
  ctx.font = `600 34px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CANVAS_SIZE / 2, 1012);
}

/** Extrai até 3 itens de checklist a partir do corpo do post. */
function getChecklistItems(body: string): string[] {
  const lines = (body || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences = (body || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  const pool = lines.length > 1 ? lines : sentences;
  const items = pool.slice(0, 3);
  const fallbacks = [
    "Conteúdo que gera conexão",
    "Constância e autoridade",
    "Vendas naturais e recorrentes",
  ];
  let i = items.length;
  while (items.length < 3) {
    items.push(fallbacks[i]);
    i += 1;
  }
  return items;
}

/**
 * Renderiza o post completo (1080×1080) alternando entre 4 layouts ricos e
 * devolve como dataURL PNG.
 */
export async function renderCompletePostImage(
  hookText: string,
  bgPhotoUrl: string,
  brand: BrandStyleConfig,
  dayNumber: number,
  pillar: string,
  bodyText = ""
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  const primary = brand.primaryColor || "#0f172a";
  const secondary = brand.secondaryColor || "#ffffff";
  const accent = brand.accentColor || "#f97316";

  let photo: HTMLImageElement | null = null;
  if (bgPhotoUrl) {
    try {
      photo = await loadImage(bgPhotoUrl);
    } catch {
      photo = null;
    }
  }

  const layoutType = dayNumber % 4;

  // --- LAYOUT A (0): SPLIT HERO ---
  if (layoutType === 0) {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(60, 60, 960, 470, 28);
      ctx.clip();
      drawCover(ctx, photo, 960, 470);
      ctx.restore();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(60, 60, 960, 470, 28);
      ctx.stroke();
    }

    await drawLogo(ctx, brand.logoDataUrl, 96, 96, 80, "dark");

    drawPill(ctx, pillar.toUpperCase(), 80, 588, 52, accent, "#ffffff");

    ctx.fillStyle = secondary;
    ctx.font = `bold 50px ${SERIF}`;
    ctx.textBaseline = "alphabetic";
    drawWrappedText(ctx, hookText, 80, 696, 920, 68, 3);

    drawFooter(ctx, brand.handle, accent);
    return canvas.toDataURL("image/png");
  }

  // --- LAYOUT B (1): GIANT NUMBER ---
  if (layoutType === 1) {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (photo) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      drawCover(ctx, photo, CANVAS_SIZE, CANVAS_SIZE);
      ctx.restore();
    }

    await drawLogo(ctx, brand.logoDataUrl, 80, 80, 84, "dark");

    const match = hookText.match(/\d+/);
    const bigNumber = match ? match[0] : `${(dayNumber % 5) + 3}`;

    drawPill(ctx, "DICAS ESSENCIAIS", 320, 150, 48, accent, "#ffffff");

    ctx.fillStyle = accent;
    ctx.font = "900 220px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(bigNumber, 90, 400);

    ctx.fillStyle = accent;
    ctx.fillRect(94, 448, 120, 8);

    ctx.fillStyle = secondary;
    ctx.font = `bold 50px ${SERIF}`;
    drawWrappedText(ctx, hookText, 90, 520, 900, 68, 3);

    drawFooter(ctx, brand.handle, accent);
    return canvas.toDataURL("image/png");
  }

  // --- LAYOUT C (2): PHOTO OVERLAY CLEAN ---
  if (layoutType === 2) {
    if (photo) {
      drawCover(ctx, photo, CANVAS_SIZE, CANVAS_SIZE);
    } else {
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    const grad = ctx.createLinearGradient(0, 240, 0, CANVAS_SIZE);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.15)");
    grad.addColorStop(0.5, "rgba(0, 0, 0, 0.70)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    await drawLogo(ctx, brand.logoDataUrl, 70, 70, 80, "dark");

    const cardX = 120;
    const cardY = 340;
    const cardW = 840;
    const cardH = 440;
    ctx.fillStyle = "rgba(9, 9, 11, 0.58)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();

    drawPill(
      ctx,
      `DIA ${dayNumber} • ${pillar.toUpperCase()}`,
      CANVAS_SIZE / 2,
      cardY + 46,
      52,
      accent,
      "#ffffff",
      undefined,
      true
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 46px ${SERIF}`;
    ctx.textBaseline = "alphabetic";
    drawWrappedTextCentered(ctx, hookText, CANVAS_SIZE / 2, cardY + 178, cardW - 110, 64, 3);

    drawFooter(ctx, brand.handle, accent);
    return canvas.toDataURL("image/png");
  }

  // --- LAYOUT D (3): CHECKLIST CARD ---
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  await drawLogo(ctx, brand.logoDataUrl, 80, 80, 84, "none");

  drawPill(ctx, pillar.toUpperCase(), 80, 100, 48, accent, "#ffffff");

  ctx.fillStyle = secondary;
  ctx.font = `bold 46px ${SERIF}`;
  ctx.textBaseline = "alphabetic";
  const titleEndY = drawWrappedText(ctx, hookText, 80, 210, 560, 58, 2);

  const items = getChecklistItems(bodyText);
  let iy = Math.max(titleEndY + 44, 390);
  for (let i = 0; i < items.length; i++) {
    const cy = iy - 12;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(110, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(99, cy);
    ctx.lineTo(107, cy + 8);
    ctx.lineTo(123, cy - 10);
    ctx.stroke();

    ctx.fillStyle = secondary;
    ctx.font = "600 27px Inter, system-ui, sans-serif";
    const itemEndY = drawWrappedText(ctx, items[i], 154, iy, 460, 36, 2);
    iy = itemEndY + 52;
  }

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(660, 330, 340, 480, 24);
    ctx.clip();
    drawCover(ctx, photo, 340, 480);
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(660, 330, 340, 480, 24);
    ctx.stroke();
  }

  drawFooter(ctx, brand.handle, accent);
  return canvas.toDataURL("image/png");
}
