/**
 * Motor de remoção de fundo sólido de logos (100% Canvas, sem IA).
 *
 * Combina dois métodos descritos no escopo:
 *  - Pixel Flood: flood fill a partir das bordas, removendo apenas a região
 *    contígua que "toca" o fundo — preserva elementos internos do logo.
 *  - Luma Threshold: camada complementar que remove pixels com cor próxima
 *    ao fundo detectado nas bordas, limpando fringes de anti-aliasing.
 */

export interface RemoveBackgroundOptions {
  /** Tolerância de cor 0..100 (padrão 35). */
  tolerance?: number;
  /** flood = região contígua; threshold = cor global; auto = flood + fringe. */
  mode?: "auto" | "flood" | "threshold";
  /** Reduz imagens maiores que isso para acelerar o processamento. */
  maxDimension?: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const toHex = (c: RgbColor): string =>
  `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const colorDistance = (a: RgbColor, b: RgbColor): number => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const loadImage = (source: string | Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const isBlob = typeof source !== "string";
    const url = isBlob ? URL.createObjectURL(source as Blob) : (source as string);
    const img = new Image();
    img.onload = () => {
      if (isBlob) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (isBlob) URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar a imagem"));
    };
    img.src = url;
  });

interface PreparedCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

const prepareCanvas = (img: HTMLImageElement, maxDimension: number): PreparedCanvas => {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, width, height };
};

const sampleCorners = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sample: number
): RgbColor[] => {
  const corners: RgbColor[] = [];
  const positions: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [cx, cy] of positions) {
    const sums = { r: 0, g: 0, b: 0 };
    let count = 0;
    for (let y = Math.max(0, cy - sample); y <= Math.min(height - 1, cy + sample); y++) {
      for (let x = Math.max(0, cx - sample); x <= Math.min(width - 1, cx + sample); x++) {
        const idx = (y * width + x) * 4;
        sums.r += data[idx];
        sums.g += data[idx + 1];
        sums.b += data[idx + 2];
        count++;
      }
    }
    if (count > 0) {
      corners.push({
        r: Math.round(sums.r / count),
        g: Math.round(sums.g / count),
        b: Math.round(sums.b / count),
      });
    }
  }
  return corners;
};

const floodFillBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: RgbColor,
  maxDist: number
): void => {
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack: number[] = [];

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length > 0) {
    const idx = stack.pop() as number;
    const px = idx * 4;
    const pixel = { r: data[px], g: data[px + 1], b: data[px + 2] };
    if (colorDistance(pixel, bg) <= maxDist) {
      data[px + 3] = 0;
      const x = idx % width;
      const y = Math.floor(idx / width);
      push(x - 1, y);
      push(x + 1, y);
      push(x, y - 1);
      push(x, y + 1);
    }
  }
};

const thresholdBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: RgbColor,
  maxDist: number
): void => {
  const total = width * height;
  for (let idx = 0; idx < total; idx++) {
    const px = idx * 4;
    const pixel = { r: data[px], g: data[px + 1], b: data[px + 2] };
    if (colorDistance(pixel, bg) <= maxDist) {
      data[px + 3] = 0;
    }
  }
};

/** Remove fringes de anti-aliasing: pixels perto do fundo vizinhos a transparência. */
const cleanFringe = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: RgbColor,
  maxDist: number
): void => {
  const total = width * height;
  const alpha = new Uint8Array(total);
  for (let i = 0; i < total; i++) alpha[i] = data[i * 4 + 3];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (alpha[idx] === 0) continue;
      const px = idx * 4;
      const pixel = { r: data[px], g: data[px + 1], b: data[px + 2] };
      if (colorDistance(pixel, bg) > maxDist) continue;
      let hasTransparent = false;
      for (let dy = -1; dy <= 1 && !hasTransparent; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (alpha[ny * width + nx] === 0) {
            hasTransparent = true;
            break;
          }
        }
      }
      if (hasTransparent) data[px + 3] = 0;
    }
  }
};

/**
 * Detecta a cor média de fundo da logo amostrando os 4 cantos da imagem.
 */
export async function detectLogoBackground(source: string | Blob): Promise<string> {
  const img = await loadImage(source);
  const { ctx, width, height } = prepareCanvas(img, 1600);
  const data = ctx.getImageData(0, 0, width, height).data;
  const corners = sampleCorners(data, width, height, 3);
  const avg: RgbColor = { r: 0, g: 0, b: 0 };
  for (const c of corners) {
    avg.r += c.r;
    avg.g += c.g;
    avg.b += c.b;
  }
  const n = Math.max(1, corners.length);
  return toHex({ r: Math.round(avg.r / n), g: Math.round(avg.g / n), b: Math.round(avg.b / n) });
}

/**
 * Remove o fundo sólido da logo e devolve uma PNG transparente (dataURL).
 *
 * @param source Arquivo ou dataURL da imagem original.
 * @param options tolerance (0..100), mode e maxDimension.
 */
export async function removeLogoSolidBackground(
  source: string | Blob,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  const tolerance = Math.max(0, Math.min(100, options.tolerance ?? 35));
  const mode = options.mode ?? "auto";
  const maxDimension = options.maxDimension ?? 1200;

  const img = await loadImage(source);
  const { canvas, ctx, width, height } = prepareCanvas(img, maxDimension);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const corners = sampleCorners(data, width, height, 3);
  const bg: RgbColor = { r: 0, g: 0, b: 0 };
  for (const c of corners) {
    bg.r += c.r;
    bg.g += c.g;
    bg.b += c.b;
  }
  const n = Math.max(1, corners.length);
  bg.r = Math.round(bg.r / n);
  bg.g = Math.round(bg.g / n);
  bg.b = Math.round(bg.b / n);

  const maxDist = tolerance * 2.55;

  if (mode === "threshold") {
    thresholdBackground(data, width, height, bg, maxDist);
  } else if (mode === "flood") {
    floodFillBackground(data, width, height, bg, maxDist);
  } else {
    // auto: flood preserva o interior; fringe limpa as bordas anti-aliased.
    floodFillBackground(data, width, height, bg, maxDist);
    cleanFringe(data, width, height, bg, maxDist * 1.4);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}