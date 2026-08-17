/**
 * Renderizador Canvas dinâmico das artes dos posts.
 *
 * Combina: foto de fundo (ou gradiente da marca), overlay de marca, logo sem
 * fundo, chips com cores primária/secundária/destaque e o gancho do post.
 * Tudo é desenhado em um <canvas> offscreen e devolvido como dataURL PNG.
 */

export interface RenderArtOptions {
  width: number;
  height: number;
  /** Foto de fundo (dataURL ou URL). Opcional — sem foto usa gradiente. */
  background?: string | null;
  primary: string;
  secondary: string;
  accent: string;
  logoUrl?: string | null;
  hook: string;
  dayNumber: number;
  pillarLabel: string;
  format: string;
  callToAction: string;
  brandName?: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });

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

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.slice(0, maxLines);
};

const fitFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  start: number,
  lineHeight: number,
  fontFamily: string,
  weight: string
): number => {
  let size = start;
  while (size > 16) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth, 4);
    const totalH = lines.length * size * lineHeight;
    const fits = lines.every((l) => ctx.measureText(l).width <= maxWidth);
    if (fits && totalH <= maxHeight) return size;
    size -= 4;
  }
  return size;
};

const hexToRgba = (hex: string, alpha: number): string => {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawTextEllipsis = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void => {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let t = text;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  ctx.fillText(`${t}…`, x, y);
};

/**
 * Renderiza a arte do post em um canvas offscreen. Lança erro se o fundo
 * (imagem) não puder ser desenhado — nesse caso use gradiente (background null).
 */
export async function renderPostArt(options: RenderArtOptions): Promise<HTMLCanvasElement> {
  const {
    width,
    height,
    background,
    primary,
    secondary,
    accent,
    logoUrl,
    hook,
    dayNumber,
    pillarLabel,
    format,
    callToAction,
    brandName,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  // ── Fundo: foto (cover) ou gradiente da marca ──
  let bgImage: HTMLImageElement | null = null;
  if (background) {
    try {
      bgImage = await loadImage(background);
    } catch {
      bgImage = null;
    }
  }

  if (bgImage) {
    drawCover(ctx, bgImage, width, height);
    const dim = ctx.createLinearGradient(0, height * 0.3, 0, height);
    dim.addColorStop(0, "rgba(8, 8, 13, 0.05)");
    dim.addColorStop(1, "rgba(8, 8, 13, 0.88)");
    ctx.fillStyle = dim;
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, secondary);
    grad.addColorStop(0.55, primary);
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    const tint = ctx.createLinearGradient(0, height * 0.4, 0, height);
    tint.addColorStop(0, "rgba(8, 8, 13, 0.2)");
    tint.addColorStop(1, "rgba(8, 8, 13, 0.8)");
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);
  }

  const pad = Math.round(width * 0.06);
  const isTall = height / width > 1.3;

  // ── Glow sutil da marca no topo ──
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.12,
    0,
    width / 2,
    height * 0.12,
    width * 0.5
  );
  glow.addColorStop(0, hexToRgba(primary, 0.35));
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.4);

  // ── Topo: logo (esquerda) + chip de formato (direita) ──
  let logoImg: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImg = await loadImage(logoUrl);
    } catch {
      logoImg = null;
    }
  }
  const chipH = Math.round(width * 0.075);

  if (logoImg) {
    const logoH = chipH * 1.5;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 18;
    ctx.drawImage(logoImg, pad, pad, Math.min(logoW, width * 0.42), logoH);
    ctx.restore();
  } else {
    ctx.fillStyle = hexToRgba(secondary, 0.85);
    roundedRect(ctx, pad, pad, Math.min(width * 0.4, width), chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${chipH * 0.5}px Inter, Arial, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(brandName || "NEXIA VIDEO", pad + chipH * 0.6, pad + chipH / 2 + 1);
  }

  // chip do formato no topo-direito
  ctx.fillStyle = hexToRgba(accent, 0.95);
  roundedRect(ctx, width - pad - Math.min(width * 0.34, 320), pad, Math.min(width * 0.34, 320), chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${chipH * 0.45}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  drawTextEllipsis(
    ctx,
    format.toUpperCase(),
    width - pad - Math.min(width * 0.34, 320) + chipH * 0.5,
    pad + chipH / 2 + 1,
    Math.min(width * 0.34, 320) - chipH
  );

  // ── Painel central com o gancho ──
  const panelW = width - pad * 2;
  const panelTop = isTall ? height * 0.36 : height * 0.38;
  const textMaxH = isTall ? height * 0.34 : height * 0.42;
  const lineHeightRatio = 1.18;

  ctx.font = "800 72px Inter, Arial, sans-serif";
  const fontSize = fitFontSize(ctx, hook, panelW - pad * 1.2, textMaxH, isTall ? 96 : 72, lineHeightRatio, "Inter, Arial, sans-serif", "800");
  ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  const lines = wrapText(ctx, hook, panelW - pad * 1.2, 4);

  const lineH = fontSize * lineHeightRatio;
  const textH = lines.length * lineH;
  const panelH = textH + (isTall ? chipH * 2 : chipH * 1.6);

  const panelX = pad;
  const panelY = panelTop;
  ctx.fillStyle = "rgba(13, 13, 22, 0.82)";
  roundedRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();

  // barra lateral de destaque
  ctx.fillStyle = primary;
  roundedRect(ctx, panelX, panelY + 18, 12, panelH - 36, 6);
  ctx.fill();

  // selo do dia + pilar
  ctx.fillStyle = hexToRgba(primary, 0.95);
  const chipDayW = Math.min(width * 0.6, 420);
  const chipDayH = chipH * 0.72;
  roundedRect(ctx, panelX + 34, panelY + (isTall ? 22 : 16), chipDayW, chipDayH, chipDayH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${chipDayH * 0.42}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(`DIA ${dayNumber} · ${pillarLabel.toUpperCase()}`, panelX + 34 + chipDayH * 0.55, panelY + (isTall ? 22 : 16) + chipDayH / 2 + 1);

  // gancho
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 14;
  let ty = panelY + (isTall ? 22 : 16) + chipDayH + lineH * 0.82;
  ctx.textAlign = "center";
  for (const line of lines) {
    ctx.fillText(line, width / 2, ty);
    ty += lineH;
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // ── CTA (base) ──
  const ctaY = isTall ? height - pad * 1.6 : height - pad * 1.4;
  ctx.fillStyle = hexToRgba(accent, 1);
  const ctaText = callToAction || "Salve para não perder";
  ctx.font = `800 ${Math.round(width * 0.035)}px Inter, Arial, sans-serif`;
  const ctaMax = width * 0.72;
  const ctaTextW = Math.min(ctx.measureText(ctaText).width, ctaMax);
  const ctaH = Math.round(width * 0.09);
  roundedRect(ctx, (width - ctaTextW - ctaH * 1.4) / 2, ctaY, ctaTextW + ctaH * 1.4, ctaH, ctaH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(width * 0.032)}px Inter, Arial, sans-serif`;
  ctx.fillText(ctaText, width / 2 - ctaTextW / 2, ctaY + ctaH / 2 + 1);

  // marca d'água
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 ${Math.round(width * 0.022)}px Inter, Arial, sans-serif`;
  ctx.fillText(brandName || "NEXIA VIDEO", pad, ctaY + ctaH + Math.round(width * 0.045));

  return canvas;
}

/** Renderiza a arte e devolve como dataURL PNG. */
export async function renderPostArtDataUrl(options: RenderArtOptions): Promise<string> {
  const canvas = await renderPostArt(options);
  return canvas.toDataURL("image/png");
}