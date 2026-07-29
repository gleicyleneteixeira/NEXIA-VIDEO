/**
 * Video Concatenation Utility
 * Combina múltiplos vídeos em um único usando Canvas + MediaRecorder
 */

interface ConcatenateOptions {
  videos: string[]; // Array de URLs dos vídeos
  width?: number;
  height?: number;
  mimeType?: string;
}

interface ConcatenateResult {
  blob: Blob;
  url: string;
  duration: number;
}

/**
 * Concatena múltiplos vídeos em um único arquivo
 */
export async function concatenateVideos(
  options: ConcatenateOptions
): Promise<ConcatenateResult> {
  const {
    videos,
    width = 1920,
    height = 1080,
    mimeType = "video/webm;codecs=vp9",
  } = options;

  return new Promise((resolve, reject) => {
    // Create hidden elements
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = "none";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      document.body.removeChild(canvas);
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Create video element for playback
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.style.display = "none";
    document.body.appendChild(video);

    // Setup MediaRecorder
    const stream = canvas.captureStream(30); // 30 FPS
    const chunks: Blob[] = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Cleanup
      document.body.removeChild(canvas);
      document.body.removeChild(video);

      // Calculate total duration
      let totalDuration = 0;
      videoElements.forEach((v) => {
        totalDuration += v.duration;
      });

      resolve({
        blob,
        url,
        duration: totalDuration,
      });
    };

    recorder.onerror = (e) => {
      document.body.removeChild(canvas);
      document.body.removeChild(video);
      reject(e);
    };

    // Load all videos first
    const videoElements: HTMLVideoElement[] = [];
    let loadedCount = 0;

    const onAllLoaded = async () => {
      recorder.start();

      // Process each video sequentially
      for (const videoEl of videoElements) {
        await processVideo(videoEl, canvas, ctx, width, height);
      }

      recorder.stop();
    };

    const loadVideo = (src: string): Promise<HTMLVideoElement> => {
      return new Promise((resolveVideo, rejectVideo) => {
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.crossOrigin = "anonymous";

        v.onloadeddata = () => {
          loadedCount++;
          if (loadedCount === videos.length) {
            resolveVideo(v);
          }
        };

        v.onerror = () => rejectVideo(new Error(`Failed to load: ${src}`));
        v.src = src;
      });
    };

    // Load all videos
    Promise.all(videos.map(loadVideo))
      .then((loadedVideos) => {
        videoElements.push(...loadedVideos);
        onAllLoaded();
      })
      .catch((err) => {
        document.body.removeChild(canvas);
        document.body.removeChild(video);
        reject(err);
      });
  });
}

/**
 * Processa um vídeo individual, desenhando frame a frame no canvas
 */
async function processVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  return new Promise((resolve) => {
    video.currentTime = 0;
    video.play();

    const drawFrame = () => {
      if (video.ended || video.paused) {
        resolve();
        return;
      }

      // Calculate aspect ratio preservation
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = targetWidth / targetHeight;

      let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

      if (videoRatio > canvasRatio) {
        // Video is wider than canvas
        drawWidth = targetWidth;
        drawHeight = targetWidth / videoRatio;
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
      } else {
        // Video is taller than canvas
        drawHeight = targetHeight;
        drawWidth = targetHeight * videoRatio;
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // Clear canvas with black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw video frame centered
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      requestAnimationFrame(drawFrame);
    };

    video.onplaying = () => {
      drawFrame();
    };

    video.onended = () => {
      resolve();
    };
  });
}

/**
 * Converte WebM para MP4 usando transcodificação básica
 * Nota: Para conversão completa MP4, seria necessário FFmpeg.wasm
 */
export async function webmToMp4(webmBlob: Blob): Promise<Blob> {
  // Por enquanto, retorna o WebM
  // Para conversão real, integrar FFmpeg.wasm
  return webmBlob;
}

/**
 * Gera thumbnail de um vídeo
 */
export async function generateThumbnail(
  videoUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 1; // 1 segundo
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        resolve("");
      }
    };

    video.src = videoUrl;
  });
}

/**
 * Calcula a duração total de múltiplos vídeos
 */
export async function getTotalDuration(videoUrls: string[]): Promise<number> {
  let total = 0;

  for (const url of videoUrls) {
    const duration = await getVideoDuration(url);
    total += duration;
  }

  return total;
}

function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
    video.src = url;
  });
}

/**
 * Formata segundos para MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
