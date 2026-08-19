/**
 * Captura de miniatura estática (thumbnail base64) de um vídeo, desenhando o
 * primeiro frame em um canvas 320x180. Usada pela Galeria para exibir a
 * imagem instantaneamente, sem precisar dar play no arquivo inteiro.
 */

export function captureVideoThumbnail(
  source: Blob | File | string,
  width = 320,
  height = 180
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url =
      typeof source === "string" ? source : URL.createObjectURL(source);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    const cleanup = () => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* noop */
      }
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.1, Math.max(0, (video.duration || 1) * 0.01));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D indisponivel");
        const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
        const dw = video.videoWidth * scale;
        const dh = video.videoHeight * scale;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err as Error);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar video para gerar miniatura."));
    };
  });
}