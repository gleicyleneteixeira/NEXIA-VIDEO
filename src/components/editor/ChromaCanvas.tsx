"use client";

import { useEffect, useRef } from "react";
import type { ChromaKey } from "@/lib/editor";

const VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
varying vec2 vTextureCoord;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTextureCoord = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 uKeyColor;      // Cor selecionada normalizada (RGB 0.0 - 1.0)
uniform float uSimilarity;   // Intensidade (0.0 a 1.0)
uniform float uSmoothness;   // Suavização de borda
uniform float uSpill;        // Redução de spill

// Conversão para espaço de cor YCbCr para melhor separação de tom
vec3 rgbToYCbCr(vec3 rgb) {
    float y  =  0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float cb = -0.168736 * rgb.r - 0.331264 * rgb.g + 0.5 * rgb.b;
    float cr =  0.5 * rgb.r - 0.418688 * rgb.g - 0.081312 * rgb.b;
    return vec3(y, cb, cr);
}

void main() {
    vec4 color = texture2D(uSampler, vTextureCoord);
    vec3 ycbcr = rgbToYCbCr(color.rgb);
    vec3 keyYCbCr = rgbToYCbCr(uKeyColor);

    // Distância cromática ignorando variação pura de luz
    float mask = distance(ycbcr.gb, keyYCbCr.gb);

    // Interpolação suave do canal Alpha
    float alpha = smoothstep(uSimilarity, uSimilarity + uSmoothness, mask);

    // Tratamento de Green/Color Spill nas bordas
    float spillVal = max(color.g - max(color.r, color.b), 0.0);
    color.g -= spillVal * uSpill;

    gl_FragColor = vec4(color.rgb * alpha, color.a * alpha);
}
`;

interface ChromaCanvasProps {
  id: string;
  mediaRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null>;
  chroma: ChromaKey;
  width: number;
  height: number;
  filter?: string;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[Chroma WebGL] Erro no shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[Chroma WebGL] Erro ao linkar:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || "#00ff00").replace("#", "");
  const r = parseInt(clean.slice(0, 2) || "00", 16) / 255;
  const g = parseInt(clean.slice(2, 4) || "ff", 16) / 255;
  const b = parseInt(clean.slice(4, 6) || "00", 16) / 255;
  return [
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 1,
    Number.isFinite(b) ? b : 0,
  ];
}

/**
 * Per-ítem Chroma Key renderizado por WebGL em tempo real: o elemento de mídia
 * (vídeo ou imagem) continua na DOM apenas como fonte de decodificação/áudio
 * (ele é ocultado pelo Preview com opacity 0), e este canvas compõe o frame
 * atual através do shader de remoção de cor (espaço YCbCr + smoothstep).
 * Uniforms são atualizados a cada frame para refletir os sliders ao vivo.
 */
export default function ChromaCanvas({ id, mediaRef, chroma, width, height, filter }: ChromaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mantém o chroma mais recente acessível ao loop rAF sem recriar o contexto.
  const chromaRef = useRef(chroma);
  useEffect(() => {
    chromaRef.current = chroma;
  }, [chroma]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(width * dpr));
    const H = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    }) || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn("[Chroma] WebGL indisponível — sem remoção via GPU.");
      return;
    }

    const program = createProgram(gl);
    if (!program) return;

    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uKeyColor = gl.getUniformLocation(program, "uKeyColor");
    const uSimilarity = gl.getUniformLocation(program, "uSimilarity");
    const uSmoothness = gl.getUniformLocation(program, "uSmoothness");
    const uSpill = gl.getUniformLocation(program, "uSpill");

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // O canvas possui canal alpha e será mesclado premultiplicado pelo
    // navegador (o próprio shader já premultiplica), então limpa para zero.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let raf = 0;
    let lastUploadedTime = -1;

    const draw = () => {
      const el = mediaRef.current;
      if (el) {
        const isVideo = el instanceof HTMLVideoElement;
        const hasPixels = isVideo ? el.videoWidth > 0 : (el as HTMLImageElement).naturalWidth > 0;
        if (hasPixels) {
          const current = isVideo ? el.currentTime : 0;
          const playing = !isVideo || !el.paused;
          // Só re-uploada o frame quando há mudança real (reproduzindo ou seek).
          if (playing || current !== lastUploadedTime) {
            lastUploadedTime = current;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            try {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
            } catch {
              /* frame ainda não decodificado — tenta no próximo tick */
            }
          }
          const [r, g, b] = hexToRgb(chromaRef.current.targetColor);
          gl.uniform3f(uKeyColor, r, g, b);
          gl.uniform1f(uSimilarity, chromaRef.current.similarity ?? 0.45);
          gl.uniform1f(uSmoothness, chromaRef.current.smoothness ?? 0.08);
          gl.uniform1f(uSpill, chromaRef.current.spillReduction ?? 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [id, width, height, mediaRef]);

  return (
    <canvas
      ref={canvasRef}
      data-chroma-canvas={id}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={filter ? { filter } : undefined}
    />
  );
}