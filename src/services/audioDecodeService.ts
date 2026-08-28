export const AudioDecodeService = {
  cache: new Map<string, AudioBuffer>(),

  keyFor(fileOrUrl: File | string): string {
    if (typeof fileOrUrl === "string") return fileOrUrl;
    return `file:${fileOrUrl.name}:${fileOrUrl.size}:${fileOrUrl.lastModified}`;
  },

  async getArrayBuffer(fileOrUrl: File | string): Promise<ArrayBuffer> {
    if (typeof fileOrUrl === "string") {
      const response = await fetch(fileOrUrl);
      if (!response.ok) throw new Error(`Falha ao buscar mídia: ${response.status}`);
      return await response.arrayBuffer();
    }
    return await fileOrUrl.arrayBuffer();
  },

  async getAudioBuffer(fileOrUrl: File | string): Promise<AudioBuffer | null> {
    const key = this.keyFor(fileOrUrl);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const arrayBuffer = await this.getArrayBuffer(fileOrUrl);
    const AudioContextCtor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextCtor();

    try {
      const buffer = await audioCtx.decodeAudioData(arrayBuffer);
      this.cache.set(key, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      if (audioCtx.state !== "closed") await audioCtx.close().catch(() => {});
    }
  },

  async getAudioPeaks(fileOrUrl: File | string, samplesCount = 200): Promise<number[]> {
    const buffer = await this.getAudioBuffer(fileOrUrl);
    if (!buffer) return [];

    const rawData = buffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samplesCount) || 1;
    const peaks: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        const v = rawData[start + j] || 0;
        sum += v * v;
      }
      peaks.push(Math.sqrt(sum / blockSize));
    }

    return peaks;
  },

  async getSourceFrames(fileOrUrl: File | string, fps: number): Promise<number> {
    const buffer = await this.getAudioBuffer(fileOrUrl);
    if (!buffer) return 0;
    return Math.max(1, Math.round(buffer.duration * fps));
  },
};

export interface SilenceEdges {
  lead: number;
  tail: number;
}

export function detectSilenceEdges(
  peaks: number[],
  threshold = 0.02,
  minSilenceSamples = 8,
): SilenceEdges {
  let lead = 0;
  while (lead < peaks.length && peaks[lead] < threshold) lead++;
  if (lead < minSilenceSamples) lead = 0;

  let tail = 0;
  while (tail < peaks.length && peaks[peaks.length - 1 - tail] < threshold) tail++;
  if (tail < minSilenceSamples) tail = 0;

  return { lead, tail };
}
