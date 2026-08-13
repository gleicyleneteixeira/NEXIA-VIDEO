"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Info,
  Loader2,
  Tv
} from "lucide-react";

interface UploadedImage {
  type: "svg" | "bitmap";
  url: string;
  content: string;
  name: string;
}

interface Point {
  x: number;
  y: number;
}

type HandStyle = "none" | "marker" | "pencil" | "crayon" | "brush" | "cyan";
type SketchStyle = "color" | "grayscale" | "ink";
type DrawOrder = "auto" | "left-to-right" | "top-to-bottom" | "random";
type BackgroundStyle = "white" | "grid" | "paper" | "blackboard" | "greenboard" | "grayboard" | "custom";
type LayerOrder = "image-then-text" | "text-then-image";

const HAND_ANCHORS: Record<Exclude<HandStyle, "none">, Point> = {
  marker: { x: 10, y: 30 },
  pencil: { x: 12, y: 10 },
  cyan: { x: 10, y: 10 },
  crayon: { x: 25, y: 25 },
  brush: { x: 25, y: 25 },
};

// Remove white/light-grey backgrounds from user uploaded hands (Chroma Key)
const makeImageTransparent = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Remove white or checkerboard gray background pixels
    const isLight = r > 215 && g > 215 && b > 215;
    if (isLight) {
      data[i+3] = 0; // Transparent
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

const getBitmapPosition = (
  imgWidth: number,
  imgHeight: number,
  hasText: boolean
): { x: number; y: number; width: number; height: number } => {
  if (hasText) {
    // Image occupies top 75% (max height 420px, shifted down slightly)
    const scale = Math.min(800 / imgWidth, 420 / imgHeight);
    const w = imgWidth * scale;
    const h = imgHeight * scale;
    return {
      x: (800 - w) / 2,
      y: (450 - h) / 2 + 15,
      width: w,
      height: h,
    };
  } else {
    // Image occupies full height (max height 560px)
    const scale = Math.min(800 / imgWidth, 560 / imgHeight);
    const w = imgWidth * scale;
    const h = imgHeight * scale;
    return {
      x: (800 - w) / 2,
      y: (600 - h) / 2,
      width: w,
      height: h,
    };
  }
};

// Predefined hand SVG shapes. Tip is located precisely at (25, 25) in a 150x150 canvas.
const HAND_SVGS: Record<"marker" | "pencil" | "crayon" | "brush", string> = {
  marker: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
      <!-- marker pen body -->
      <rect x="23" y="23" width="10" height="70" rx="2" transform="rotate(-40 25 25)" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/>
      <rect x="23" y="10" width="10" height="13" rx="1" transform="rotate(-40 25 25)" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M22,7 L28,7 L25,0 Z" transform="rotate(-40 25 25)" fill="#0f172a"/>
      
      <!-- hand drawing -->
      <!-- fingers wrapping -->
      <path d="M45,45 C55,35 65,40 68,48 C70,55 62,62 55,65" fill="#fbcfe8" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
      <path d="M49,53 C59,43 69,48 72,56 C75,63 67,70 60,73" fill="#fbcfe8" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
      
      <!-- thumb holding -->
      <path d="M28,45 C32,32 45,35 48,42 C51,48 42,55 35,53" fill="#fbcfe8" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
      
      <!-- hand main base -->
      <path d="M50,60 C70,50 95,65 110,85 C120,100 135,130 135,145 L75,145 C65,130 55,100 50,85 Z" fill="#fbcfe8" stroke="#1e293b" stroke-width="3"/>
      
      <!-- sleeve -->
      <path d="M75,145 L135,145 L140,150 L70,150 Z" fill="#1e1b4b"/>
    </svg>
  `,
  pencil: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
      <!-- yellow wood pencil -->
      <rect x="23" y="25" width="8" height="85" rx="1" transform="rotate(-45 25 25)" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
      <path d="M21,25 L29,25 L25,12 Z" transform="rotate(-45 25 25)" fill="#fed7aa" stroke="#ca8a04" stroke-width="1"/>
      <path d="M23,12 L27,12 L25,7 Z" transform="rotate(-45 25 25)" fill="#1e293b"/>
      <rect x="23" y="110" width="8" height="10" transform="rotate(-45 25 25)" fill="#f43f5e" rx="1"/> <!-- pink eraser -->
      <rect x="23" y="105" width="8" height="5" transform="rotate(-45 25 25)" fill="#94a3b8"/> <!-- metal band -->
      
      <!-- hand -->
      <path d="M45,45 C55,35 65,40 68,48 C70,55 62,62 55,65" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
      <path d="M28,45 C32,32 45,35 48,42 C51,48 42,55 35,53" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
      <path d="M50,60 C70,50 95,65 110,85 C120,100 135,130 135,145 L75,145 C65,130 55,100 50,85 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
    </svg>
  `,
  crayon: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
      <!-- red crayon -->
      <rect x="22" y="25" width="12" height="60" rx="1" transform="rotate(-35 25 25)" fill="#ec4899" stroke="#db2777" stroke-width="2"/>
      <path d="M20,25 L34,25 L27,10 Z" transform="rotate(-35 25 25)" fill="#ec4899"/>
      <rect x="24" y="35" width="8" height="40" transform="rotate(-35 25 25)" fill="#111"/> <!-- label -->
      
      <!-- hand -->
      <path d="M45,45 C55,35 65,40 68,48 C70,55 62,62 55,65" fill="#fbcfe8" stroke="#1e293b" stroke-width="3"/>
      <path d="M28,45 C32,32 45,35 48,42 C51,48 42,55 35,53" fill="#fbcfe8" stroke="#1e293b" stroke-width="3"/>
      <path d="M50,60 C70,50 95,65 110,85 C120,100 135,130 135,145 L75,145 C65,130 55,100 50,85 Z" fill="#fbcfe8" stroke="#1e293b" stroke-width="3"/>
    </svg>
  `,
  brush: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
      <!-- paintbrush -->
      <line x1="25" y1="25" x2="90" y2="90" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <path d="M20,20 L30,30 L25,25 Z" fill="#94a3b8" stroke="#475569" stroke-width="1"/> <!-- ferrule -->
      <path d="M12,12 C15,20 20,15 25,25 L20,20 Z" fill="#db2777"/> <!-- bristle tip colored pink -->
      
      <!-- hand -->
      <path d="M45,45 C55,35 65,40 68,48 C70,55 62,62 55,65" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
      <path d="M28,45 C32,32 45,35 48,42 C51,48 42,55 35,53" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
      <path d="M50,60 C70,50 95,65 110,85 C120,100 135,130 135,145 L75,145 C65,130 55,100 50,85 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="3"/>
    </svg>
  `,
};

interface EditorLayer {
  id: string;
  type: "image" | "text";
  name: string;
  url?: string;
  svgContent?: string;
  textValue?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SpeedPaintPage() {
  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [fps, setFps] = useState<30 | 60 | 120>(60);
  const [sketchDuration, setSketchDuration] = useState<number>(10);
  const [fillDuration, setFillDuration] = useState<number>(5);
  const [handStyle, setHandStyle] = useState<HandStyle>("marker");
  const [sketchStyle, setSketchStyle] = useState<SketchStyle>("color");
  const [drawOrder, setDrawOrder] = useState<DrawOrder>("auto");
  const [bgStyle, setBgStyle] = useState<BackgroundStyle>("white");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [noiseReduction, setNoiseReduction] = useState<number>(3); // filter stroke size threshold
  const [fadeExit, setFadeExit] = useState<boolean>(false);
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5); // thinner contour default
  const [boardBorder, setBoardBorder] = useState<string>("none");
  
  const [layersStrokes, setLayersStrokes] = useState<Point[][][]>([]);
  const [layersHatching, setLayersHatching] = useState<Point[][]>([]);
  
  const layerImagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Reorder layers list up/down
  const moveLayer = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;
    const updated = [...layers];
    const [removed] = updated.splice(index, 1);
    updated.splice(newIndex, 0, removed);
    setLayers(updated);
  };

  // Add a new image layer
  const addLoadedImageLayer = (file: File) => {
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const reader = new FileReader();
    
    if (isSvg) {
      reader.onload = (event) => {
        if (event.target?.result) {
          const newLayer: EditorLayer = {
            id: Math.random().toString(36).substring(2, 9),
            type: "image",
            name: file.name || "imagem.svg",
            url: URL.createObjectURL(file),
            svgContent: event.target.result as string,
            x: 100,
            y: 50,
            width: 600,
            height: 400
          };
          setLayers(prev => [...prev, newLayer]);
          setSelectedLayerId(newLayer.id);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        if (event.target?.result) {
          const newLayer: EditorLayer = {
            id: Math.random().toString(36).substring(2, 9),
            type: "image",
            name: file.name || "imagem.png",
            url: event.target.result as string,
            svgContent: "",
            x: 100,
            y: 50,
            width: 600,
            height: 400
          };
          setLayers(prev => [...prev, newLayer]);
          setSelectedLayerId(newLayer.id);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add a new text layer
  const addTextLayer = () => {
    const newLayer: EditorLayer = {
      id: Math.random().toString(36).substring(2, 9),
      type: "text",
      name: "Texto " + (layers.filter(l => l.type === "text").length + 1),
      textValue: "Nexia Video",
      fontSize: 45,
      fontFamily: "Caveat",
      textColor: "#8b5cf6",
      x: 200,
      y: 220,
      width: 400,
      height: 100
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  // Load Google Fonts for handwriting text
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Pacifico&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [hatchingPoints, setHatchingPoints] = useState<Point[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [playTime, setPlayTime] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handImages = useRef<Record<string, HTMLImageElement>>({});
  const animationFrameRef = useRef<number | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load hand images on mount
  useEffect(() => {
    // 1. Load static SVG vector hands
    Object.entries(HAND_SVGS).forEach(([key, svg]) => {
      const img = new Image();
      const svg64 = window.btoa(unescape(encodeURIComponent(svg)));
      img.src = `data:image/svg+xml;base64,${svg64}`;
      handImages.current[key] = img;
    });

    // 2. Load custom high-fidelity hand images uploaded by user (chroma keyed)
    const customHands = {
      marker: "/hands/marker_black.jpg",
      pencil: "/hands/pencil_yellow.jpg",
      cyan: "/hands/pencil_cyan.jpg",
    };

    Object.entries(customHands).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const transparentCanvas = makeImageTransparent(img);
        const transImg = new Image();
        transImg.src = transparentCanvas.toDataURL();
        handImages.current[key] = transImg;
      };
    });
  }, []);

  // Handle paste events to paste images from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            addLoadedImageLayer(file);
            break; // only process the first image found
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const traceTextStrokes = (
    textStr: string,
    fontSize: number,
    fontFamily: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Point[][] => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    
    // Clear white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);
    
    // Draw text in black centered in the bounding box
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${fontSize}px ${fontFamily}, cursive, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textStr, x + width / 2, y + height / 2);
    
    const imgData = ctx.getImageData(0, 0, 800, 600);
    const edges = runSobelEdges(imgData, 30); // lower threshold to capture font details
    const traced = traceEdges(edges, 2);
    const smoothed = traced.map(smoothStroke);
    // Sort text strokes left-to-right so it draws natural letter order!
    return sortStrokes(smoothed, "left-to-right");
  };

  // Recalculate outline paths when layers change
  useEffect(() => {
    if (layers.length === 0) {
      setLayersStrokes([]);
      setLayersHatching([]);
      setStrokes([]);
      setHatchingPoints([]);
      return;
    }

    const processLayers = async () => {
      setIsProcessing(true);
      const newLayersStrokes: Point[][][] = [];
      const newLayersHatching: Point[][] = [];
      let flattenedStrokes: Point[][] = [];

      for (const layer of layers) {
        let layerStrokes: Point[][] = [];
        
        if (layer.type === "image") {
          if (layer.svgContent) {
            // SVG
            const svgStrokes = parseSvgPaths(layer.svgContent, layer.x, layer.y, layer.width, layer.height);
            layerStrokes = sortStrokes(svgStrokes, drawOrder).filter(s => s.length >= noiseReduction);
          } else if (layer.url) {
            // Bitmap
            await new Promise((resolve) => {
              const img = new Image();
              img.src = layer.url!;
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext("2d");
                if (!ctx) { resolve(null); return; }
                
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, 800, 600);
                ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
                
                const imgData = ctx.getImageData(0, 0, 800, 600);
                const edges = runSobelEdges(imgData, 45);
                const traced = traceEdges(edges, noiseReduction);
                const smoothed = traced.map(smoothStroke);
                layerStrokes = sortStrokes(smoothed, drawOrder);
                resolve(null);
              };
            });
          }
        } else if (layer.type === "text" && layer.textValue) {
          // Text
          layerStrokes = traceTextStrokes(
            layer.textValue,
            layer.fontSize || 45,
            layer.fontFamily || "Caveat",
            layer.x,
            layer.y,
            layer.width,
            layer.height
          );
        }
        
        newLayersStrokes.push(layerStrokes);
        flattenedStrokes = [...flattenedStrokes, ...layerStrokes];

        // Generate hatching lines specifically for the layer's bounding box coordinates
        const spacing = 20;
        const pts: Point[] = [];
        let left = true;
        for (let y = layer.y; y <= layer.y + layer.height; y += spacing) {
          if (left) {
            pts.push({ x: layer.x, y });
            pts.push({ x: layer.x + layer.width, y });
          } else {
            pts.push({ x: layer.x + layer.width, y });
            pts.push({ x: layer.x, y });
          }
          left = !left;
        }
        newLayersHatching.push(pts);
      }

      setLayersStrokes(newLayersStrokes);
      setLayersHatching(newLayersHatching);
      setStrokes(flattenedStrokes); // kept for validation and play checks
      
      // Generate placeholder hatching points just in case
      const fillPts = generateHatching(800, 600, 20);
      setHatchingPoints(fillPts);
      
      setPlayTime(0);
      setIsPlaying(false);
      setIsProcessing(false);
    };

    processLayers();
  }, [layers, drawOrder, noiseReduction]);

  // Clean play loops on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // SVG parser logic
  const parseSvgPaths = (
    xmlText: string,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number
  ): Point[][] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "image/svg+xml");
    const shapeNodes = doc.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse");
    const parsedStrokes: Point[][] = [];
    
    // Scale parser based on viewBox to fit into custom layer bounding box
    const svgElement = doc.querySelector("svg");
    let viewBoxWidth = destWidth;
    let viewBoxHeight = destHeight;
    
    if (svgElement) {
      const viewBoxStr = svgElement.getAttribute("viewBox");
      if (viewBoxStr) {
        const parts = viewBoxStr.trim().split(/[\s,]+/).map(parseFloat);
        if (parts.length === 4) {
          viewBoxWidth = parts[2];
          viewBoxHeight = parts[3];
        }
      } else {
        const wStr = svgElement.getAttribute("width");
        const hStr = svgElement.getAttribute("height");
        if (wStr && hStr) {
          viewBoxWidth = parseFloat(wStr) || destWidth;
          viewBoxHeight = parseFloat(hStr) || destHeight;
        }
      }
    }
    
    const scaleX = destWidth / viewBoxWidth;
    const scaleY = destHeight / viewBoxHeight;
    const fitScale = Math.min(scaleX, scaleY);
    const offsetX = destX + (destWidth - viewBoxWidth * fitScale) / 2;
    const offsetY = destY + (destHeight - viewBoxHeight * fitScale) / 2;

    const scalePoint = (p: Point): Point => ({
      x: offsetX + p.x * fitScale,
      y: offsetY + p.y * fitScale
    });

    shapeNodes.forEach((node) => {
      const tagName = node.tagName.toLowerCase();
      
      if (tagName === "line") {
        const x1 = parseFloat(node.getAttribute("x1") || "0");
        const y1 = parseFloat(node.getAttribute("y1") || "0");
        const x2 = parseFloat(node.getAttribute("x2") || "0");
        const y2 = parseFloat(node.getAttribute("y2") || "0");
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(2, Math.floor(dist / 3));
        const pts: Point[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          pts.push(scalePoint({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }));
        }
        parsedStrokes.push(pts);
      } else if (tagName === "rect") {
        const x = parseFloat(node.getAttribute("x") || "0");
        const y = parseFloat(node.getAttribute("y") || "0");
        const w = parseFloat(node.getAttribute("width") || "0");
        const h = parseFloat(node.getAttribute("height") || "0");
        parsedStrokes.push([
          scalePoint({ x, y }),
          scalePoint({ x: x + w, y }),
          scalePoint({ x: x + w, y: y + h }),
          scalePoint({ x, y: y + h }),
          scalePoint({ x, y })
        ]);
      } else if (tagName === "circle" || tagName === "ellipse") {
        const cx = parseFloat(node.getAttribute("cx") || "0");
        const cy = parseFloat(node.getAttribute("cy") || "0");
        const rx = parseFloat(node.getAttribute("r") || node.getAttribute("rx") || "0");
        const ry = parseFloat(node.getAttribute("r") || node.getAttribute("ry") || "0");
        const pts: Point[] = [];
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          pts.push(scalePoint({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }));
        }
        parsedStrokes.push(pts);
      } else if (tagName === "polyline" || tagName === "polygon") {
        const pointsStr = node.getAttribute("points") || "";
        const pairs = pointsStr.trim().split(/[\s,]+/);
        const pts: Point[] = [];
        for (let i = 0; i < pairs.length; i += 2) {
          if (pairs[i] && pairs[i + 1]) {
            pts.push(scalePoint({ x: parseFloat(pairs[i]), y: parseFloat(pairs[i + 1]) }));
          }
        }
        if (tagName === "polygon" && pts.length > 0) {
          pts.push({ ...pts[0] });
        }
        parsedStrokes.push(pts);
      } else if (tagName === "path") {
        try {
          const pathEl = node.cloneNode(true) as SVGPathElement;
          const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          tempSvg.appendChild(pathEl);
          document.body.appendChild(tempSvg);
          
          const totalLength = pathEl.getTotalLength();
          const pts: Point[] = [];
          const step = 3;
          const stepsCount = Math.max(2, Math.floor(totalLength / step));
          
          for (let i = 0; i <= stepsCount; i++) {
            const prg = (i / stepsCount) * totalLength;
            const pt = pathEl.getPointAtLength(prg);
            pts.push(scalePoint({ x: pt.x, y: pt.y }));
          }
          
          document.body.removeChild(tempSvg);
          if (pts.length > 0) {
            parsedStrokes.push(pts);
          }
        } catch (err) {
          console.error("Failed to parse path tag:", err);
        }
      }
    });

    return parsedStrokes;
  };

  // Grayscale & Sobel contour extraction for bitmaps (with Box Blur Pre-filter)
  const runSobelEdges = (imageData: ImageData, threshold: number): boolean[][] => {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const gray = new Float32Array(w * h);
    
    // Grayscale
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 3x3 Box Blur pre-filter to smooth pixel edges and eliminate noise
    const blurred = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += gray[(y + dy) * w + (x + dx)];
          }
        }
        blurred[y * w + x] = sum / 9;
      }
    }
    
    const edges = Array.from({ length: h }, () => new Array(w).fill(false));
    const thSquared = threshold * threshold;
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -1 * blurred[(y - 1) * w + (x - 1)] + 1 * blurred[(y - 1) * w + (x + 1)] +
          -2 * blurred[y * w + (x - 1)]       + 2 * blurred[y * w + (x + 1)] +
          -1 * blurred[(y + 1) * w + (x - 1)] + 1 * blurred[(y + 1) * w + (x + 1)];
          
        const gy =
          -1 * blurred[(y - 1) * w + (x - 1)] - 2 * blurred[(y - 1) * w + x] - 1 * blurred[(y - 1) * w + (x + 1)] +
          1 * blurred[(y + 1) * w + (x - 1)] + 2 * blurred[(y + 1) * w + x] + 1 * blurred[(y + 1) * w + (x + 1)];
          
        const val = gx * gx + gy * gy;
        if (val > thSquared) {
          edges[y][x] = true;
        }
      }
    }
    
    return edges;
  };

  // 3-point moving average to smooth traced strokes coordinate steps
  const smoothStroke = (stroke: Point[]): Point[] => {
    if (stroke.length <= 2) return stroke;
    const smoothed: Point[] = [];
    smoothed.push(stroke[0]);
    
    for (let i = 1; i < stroke.length - 1; i++) {
      const prev = stroke[i - 1];
      const curr = stroke[i];
      const next = stroke[i + 1];
      smoothed.push({
        x: (prev.x + curr.x + next.x) / 3,
        y: (prev.y + curr.y + next.y) / 3
      });
    }
    
    smoothed.push(stroke[stroke.length - 1]);
    return smoothed;
  };

  // Connected component DFS pixel walk
  const traceEdges = (edges: boolean[][], filterMin: number): Point[][] => {
    const h = edges.length;
    if (h === 0) return [];
    const w = edges[0].length;
    const visited = Array.from({ length: h }, () => new Array(w).fill(false));
    const list: Point[][] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (edges[y][x] && !visited[y][x]) {
          const pts: Point[] = [];
          let cx = x;
          let cy = y;
          pts.push({ x: cx, y: cy });
          visited[cy][cx] = true;
          
          let tracing = true;
          while (tracing) {
            let nextX = -1;
            let nextY = -1;
            let minDist = Infinity;
            
            // Scan 8 neighbors
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                  if (edges[ny][nx] && !visited[ny][nx]) {
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                      minDist = d;
                      nextX = nx;
                      nextY = ny;
                    }
                  }
                }
              }
            }
            
            if (nextX !== -1 && nextY !== -1) {
              cx = nextX;
              cy = nextY;
              pts.push({ x: cx, y: cy });
              visited[cy][cx] = true;
            } else {
              // Try jumping gap (up to 3px)
              let foundNear = false;
              outerGap:
              for (let r = 2; r <= 3; r++) {
                for (let dy = -r; dy <= r; dy++) {
                  for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) < r && Math.abs(dy) < r) continue;
                    const ny = cy + dy;
                    const nx = cx + dx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                      if (edges[ny][nx] && !visited[ny][nx]) {
                        cx = nx;
                        cy = ny;
                        pts.push({ x: cx, y: cy });
                        visited[cy][cx] = true;
                        foundNear = true;
                        break outerGap;
                      }
                    }
                  }
                }
              }
              if (!foundNear) tracing = false;
            }
          }
          if (pts.length >= filterMin) {
            list.push(pts);
          }
        }
      }
    }
    return list;
  };

  // Sort strokes logic
  const sortStrokes = (list: Point[][], order: DrawOrder): Point[][] => {
    const copy = [...list];
    if (order === "random") {
      return copy.sort(() => Math.random() - 0.5);
    }
    
    // Auto order: sort longest outline strokes first, then sort left-to-right
    if (order === "auto") {
      return copy.sort((a, b) => {
        if (Math.abs(a.length - b.length) > 15) {
          return b.length - a.length; // draw longer paths first
        }
        // otherwise sort left to right
        return a[0].x - b[0].x;
      });
    }
    
    if (order === "left-to-right") {
      return copy.sort((a, b) => a[0].x - b[0].x);
    }
    
    if (order === "top-to-bottom") {
      return copy.sort((a, b) => a[0].y - b[0].y);
    }
    
    return copy;
  };

  // Hatching pattern logic for fill phase
  const generateHatching = (w: number, h: number, spacing: number): Point[] => {
    const pts: Point[] = [];
    let left = true;
    for (let y = 0; y <= h; y += spacing) {
      if (left) {
        pts.push({ x: 0, y });
        pts.push({ x: w, y });
      } else {
        pts.push({ x: w, y });
        pts.push({ x: 0, y });
      }
      left = !left;
    }
    return pts;
  };

  // Drag State Ref for direct canvas layer dragging
  const dragStateRef = useRef<{ layerId: string; offsetX: number; offsetY: number } | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 800;
    const clickY = ((e.clientY - rect.top) / rect.height) * 600;
    
    // Find clicked layer (checking top-most visually first)
    const hitLayer = [...layers].reverse().find(l => {
      return (
        clickX >= l.x &&
        clickX <= l.x + l.width &&
        clickY >= l.y &&
        clickY <= l.y + l.height
      );
    });
    
    if (hitLayer) {
      setSelectedLayerId(hitLayer.id);
      dragStateRef.current = {
        layerId: hitLayer.id,
        offsetX: clickX - hitLayer.x,
        offsetY: clickY - hitLayer.y
      };
    } else {
      setSelectedLayerId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 800;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 600;
    
    const { layerId, offsetX, offsetY } = dragStateRef.current;
    
    let newX = Math.round(mouseX - offsetX);
    let newY = Math.round(mouseY - offsetY);
    
    // Constrain bounds so it doesn't get dragged outside logical 800x600 canvas
    newX = Math.max(0, Math.min(800 - 50, newX));
    newY = Math.max(0, Math.min(600 - 50, newY));
    
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, x: newX, y: newY } : l));
  };

  const handleCanvasMouseUpOrLeave = () => {
    dragStateRef.current = null;
  };

  // Start Playing
  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      setIsPlaying(true);
      const startTime = Date.now() - playTime * 1000;
      
      const loop = () => {
        const totalDuration = sketchDuration + fillDuration;
        const curTime = (Date.now() - startTime) / 1000;
        
        if (curTime >= totalDuration) {
          setPlayTime(totalDuration);
          setIsPlaying(false);
          drawFrame(totalDuration);
        } else {
          setPlayTime(curTime);
          drawFrame(curTime);
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(loop);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setPlayTime(0);
    drawFrame(0);
  };

  const drawBoardBorder = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (boardBorder === "none") return;
    
    ctx.save();
    if (boardBorder === "chalk") {
      // Chalk drawn border line
      ctx.strokeStyle = bgStyle === "white" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 8, 5, 8]);
      ctx.strokeRect(5, 5, w - 10, h - 10);
    } else if (boardBorder === "wood") {
      // Wood picture frame
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
      
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 8;
      ctx.strokeRect(7, 7, w - 14, h - 14);
      
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 12, w - 24, h - 24);
    } else if (boardBorder === "neon") {
      // Glowing purple neon frame
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 10;
      ctx.strokeRect(6, 6, w - 12, h - 12);
    } else if (boardBorder === "drawn") {
      // Sketchy pencil outlines
      ctx.strokeStyle = bgStyle === "white" ? "#1e293b" : "#cbd5e1";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.strokeRect(9, 9, w - 18, h - 18);
    }
    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (bgStyle === "custom" && customBgUrl) {
      const bgImg = new Image();
      bgImg.src = customBgUrl;
      if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, w, h);
        return;
      }
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    
    if (bgStyle === "grid") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      const size = 30;
      for (let x = 0; x < w; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (bgStyle === "paper") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
      for (let i = 0; i < 800; i += 2) {
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2 + 1, Math.random() * 3 + 1);
      }
    } else if (bgStyle === "blackboard") {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 400; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 1, Math.random() * 3 + 1);
      }
    } else if (bgStyle === "greenboard") {
      ctx.fillStyle = "#0f3e21";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      for (let i = 0; i < 250; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 4 + 1, Math.random() * 4 + 1);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.random() * 40 - 20, sy + Math.random() * 40 - 20);
        ctx.stroke();
      }
    } else if (bgStyle === "grayboard") {
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      for (let i = 0; i < 300; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 1, Math.random() * 3 + 1);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.random() * 50 - 25, sy + Math.random() * 50 - 25);
        ctx.stroke();
      }
    }
  };

  const drawStrokesUpTo = (
    ctx: CanvasRenderingContext2D,
    strokesList: Point[][],
    fraction: number,
    color: string,
    width: number
  ): { lastPoint: Point; angle: number } | null => {
    if (!strokesList || strokesList.length === 0) return null;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    let totalPts = 0;
    strokesList.forEach(s => totalPts += s.length);
    const limit = Math.floor(fraction * totalPts);
    
    let drawnPts = 0;
    let lastPoint: Point = strokesList[0][0];
    let angle = 0;
    
    for (const stroke of strokesList) {
      if (drawnPts >= limit) break;
      ctx.beginPath();
      
      const ptsToDraw = Math.min(stroke.length, limit - drawnPts);
      if (ptsToDraw > 0) {
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < ptsToDraw; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
        lastPoint = stroke[ptsToDraw - 1];
        
        if (ptsToDraw > 1) {
          const p1 = stroke[ptsToDraw - 1];
          const p2 = stroke[ptsToDraw - 2];
          angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        }
      }
      drawnPts += stroke.length;
    }
    ctx.restore();
    return { lastPoint, angle };
  };

  const drawRevealMask = (
    rCtx: CanvasRenderingContext2D,
    hatchingPts: Point[],
    fillFraction: number,
    thickWidth: number
  ): { lastPoint: Point; angle: number } | null => {
    if (!hatchingPts || hatchingPts.length === 0) return null;
    
    rCtx.save();
    rCtx.strokeStyle = "#000000";
    rCtx.lineWidth = thickWidth;
    rCtx.lineCap = "round";
    rCtx.lineJoin = "round";
    
    const limit = Math.floor(fillFraction * hatchingPts.length);
    const pairsLimit = Math.floor(limit / 2) * 2;
    
    let lastPoint: Point = hatchingPts[0];
    let angle = 0;
    
    for (let i = 0; i < pairsLimit; i += 2) {
      if (i + 1 < hatchingPts.length) {
        rCtx.beginPath();
        rCtx.moveTo(hatchingPts[i].x, hatchingPts[i].y);
        rCtx.lineTo(hatchingPts[i+1].x, hatchingPts[i+1].y);
        rCtx.stroke();
        lastPoint = hatchingPts[i+1];
        
        const p1 = hatchingPts[i+1];
        const p2 = hatchingPts[i];
        angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
      }
    }
    rCtx.restore();
    return { lastPoint, angle };
  };

  const drawLayerContent = (ctx: CanvasRenderingContext2D, layer: EditorLayer) => {
    if (layer.type === "image" && layer.url) {
      let img = layerImagesRef.current[layer.id];
      if (!img) {
        img = new Image();
        img.src = layer.url;
        layerImagesRef.current[layer.id] = img;
      }
      if (img.complete) {
        if (sketchStyle === "grayscale") {
          ctx.filter = "grayscale(100%)";
        }
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
        ctx.filter = "none";
      }
    } else if (layer.type === "text" && layer.textValue) {
      ctx.fillStyle = sketchStyle === "grayscale" ? "#555" : (layer.textColor || "#000");
      ctx.font = `bold ${layer.fontSize || 45}px ${layer.fontFamily || "Caveat"}, cursive, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(layer.textValue, layer.x + layer.width / 2, layer.y + layer.height / 2);
    }
  };

  // Trigger frame rendering on canvas
  const drawFrame = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.save();
    // High-DPI Sharpness: Draw on a 1600x1200 grid and scale context by 2
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    const w = 800; // logical dimensions
    const h = 600; // logical dimensions
    
    // Draw Background
    drawBackground(ctx, w, h);
    
    const N = layers.length;
    if (N === 0) {
      // Draw Board Border even if empty
      drawBoardBorder(ctx, w, h);
      ctx.restore();
      return;
    }
    
    const isEditingPreview = (t === 0 && !isPlaying && !isRecording);
    
    const totalDuration = sketchDuration + fillDuration;
    const layerDuration = totalDuration / N;
    const layerSketchDuration = (sketchDuration / totalDuration) * layerDuration;
    const layerFillDuration = (fillDuration / totalDuration) * layerDuration;
    
    let finalDrawingPoint: Point = { x: w / 2, y: h / 2 };
    let handAngle = -Math.PI / 4; // default angle
    
    // Offscreen Canvas for color reveal clipping
    const revealCanvas = document.createElement("canvas");
    revealCanvas.width = w;
    revealCanvas.height = h;
    const rCtx = revealCanvas.getContext("2d");
    
    for (let i = 0; i < N; i++) {
      const layer = layers[i];
      const layerStrokes = layersStrokes[i] || [];
      const layerHatching = layersHatching[i] || [];
      
      const layerStartTime = i * layerDuration;
      const layerEndTime = (i + 1) * layerDuration;
      
      // Outline style
      const strokeColor = sketchStyle === "grayscale" ? "#555" : (sketchStyle === "ink" ? "#000" : "var(--primary)");
      
      if (t < layerStartTime && !isEditingPreview) {
        // Not started yet - draw nothing for this layer
        continue;
      }
      
      if (isEditingPreview || t > layerEndTime) {
        // Fully complete - draw outlines and full color
        drawStrokesUpTo(ctx, layerStrokes, 1.0, strokeColor, strokeWidth);
        
        // Draw full color content
        drawLayerContent(ctx, layer);
      } else {
        // Active animating layer
        const localT = t - layerStartTime;
        
        if (localT <= layerSketchDuration) {
          // 1. Sketching phase
          const fraction = Math.min(1.0, localT / layerSketchDuration);
          const sketchResult = drawStrokesUpTo(ctx, layerStrokes, fraction, strokeColor, strokeWidth);
          
          if (sketchResult) {
            finalDrawingPoint = sketchResult.lastPoint;
            handAngle = sketchResult.angle;
          }
        } else {
          // 2. Filling phase
          // Draw full outlines first
          drawStrokesUpTo(ctx, layerStrokes, 1.0, strokeColor, strokeWidth);
          
          // Draw color using hatching mask reveal
          const fillFraction = Math.min(1.0, (localT - layerSketchDuration) / layerFillDuration);
          if (rCtx) {
            rCtx.clearRect(0, 0, w, h);
            
            // Draw original layer color/style inside reveal canvas
            drawLayerContent(rCtx, layer);
            
            // Mask layer content using hatching reveal
            rCtx.globalCompositeOperation = "destination-in";
            const hatchResult = drawRevealMask(rCtx, layerHatching, fillFraction, strokeWidth * 6);
            
            if (hatchResult) {
              finalDrawingPoint = hatchResult.lastPoint;
              handAngle = hatchResult.angle;
            }
            
            // Composite reveal canvas onto main canvas
            ctx.drawImage(revealCanvas, 0, 0);
          }
        }
      }
    }
    
    // Draw Board Border
    drawBoardBorder(ctx, w, h);
    
    // Draw Hand Sprite
    if (handStyle !== "none" && t < totalDuration && !isEditingPreview) {
      const handImg = handImages.current[handStyle];
      if (handImg && handImg.complete) {
        ctx.save();
        ctx.translate(finalDrawingPoint.x, finalDrawingPoint.y);
        const rotAngle = handAngle + Math.PI / 4;
        ctx.rotate(rotAngle);
        const anchor = HAND_ANCHORS[handStyle] || { x: 25, y: 25 };
        ctx.drawImage(handImg, -anchor.x, -anchor.y, 120, 120);
        ctx.restore();
      }
    }
    
    // Draw selection border in editor mode (if active and editing)
    if (selectedLayerId && !isRecording) {
      const selected = layers.find(l => l.id === selectedLayerId);
      if (selected) {
        ctx.save();
        ctx.strokeStyle = "rgba(139, 92, 246, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(selected.x, selected.y, selected.width, selected.height);
        const dotSize = 8;
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(selected.x - dotSize / 2, selected.y - dotSize / 2, dotSize, dotSize);
        ctx.fillRect(selected.x + selected.width - dotSize / 2, selected.y - dotSize / 2, dotSize, dotSize);
        ctx.fillRect(selected.x - dotSize / 2, selected.y + selected.height - dotSize / 2, dotSize, dotSize);
        ctx.fillRect(selected.x + selected.width - dotSize / 2, selected.y + selected.height - dotSize / 2, dotSize, dotSize);
        ctx.restore();
      }
    }
    
    // Apply final fade out exit transition
    if (fadeExit && t >= (totalDuration - 0.5)) {
      const fadeFraction = Math.max(0, 1 - (t - (totalDuration - 0.5)) / 0.5);
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeFraction})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    
    ctx.restore();
  };

  // Handle uploaded files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addLoadedImageLayer(e.target.files[0]);
    }
  };

  const handleCustomBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCustomBgUrl(url);
      setBgStyle("custom");
    }
  };

  // Video recording logic
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;
    
    setIsRecording(true);
    setIsPlaying(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    setPlayTime(0);
    
    const chunks: Blob[] = [];
    const stream = canvas.captureStream(fps);
    
    // Choose appropriate mime type supported by the user browser
    let options = { mimeType: "video/webm;codecs=vp9" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "" }; // default fallback
        }
      }
    }
    
    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `whiteboard_animation_${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start();
    
    // Trigger play loop for recording
    const startTime = Date.now();
    const totalDuration = sketchDuration + fillDuration;
    
    const recordLoop = () => {
      const curTime = (Date.now() - startTime) / 1000;
      
      if (curTime >= totalDuration) {
        drawFrame(totalDuration);
        recorder.stop();
      } else {
        setPlayTime(curTime);
        drawFrame(curTime);
        requestAnimationFrame(recordLoop);
      }
    };
    
    requestAnimationFrame(recordLoop);
  };

  // Draw initial blank screen on canvas change
  useEffect(() => {
    drawFrame(playTime);
  }, [
    layersStrokes,
    layersHatching,
    handStyle,
    bgStyle,
    bgColor,
    customBgUrl,
    sketchStyle,
    fadeExit,
    selectedLayerId,
    layers,
    boardBorder,
    playTime
  ]);

  return (
    <div className="max-w-7xl mx-auto stagger pb-16 flex flex-col lg:flex-row gap-6">
      
      {/* Settings Panel */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-5">
        
        {/* Layer Manager Panel */}
        <div className="glass-card rounded-[var(--radius)] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-tight mb-1 flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            Criador de Elementos
          </h2>
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary py-2 px-3 text-xs flex-1 font-bold flex items-center justify-center gap-1.5 rounded-lg"
            >
              <Upload className="w-3.5 h-3.5" />
              + Imagem
            </button>
            <button
              onClick={addTextLayer}
              className="btn-primary py-2 px-3 text-xs flex-1 font-bold flex items-center justify-center gap-1.5 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              + Texto
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml, image/png, image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          
          {/* Layers List */}
          {layers.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Linha do Tempo de Camadas (Ordem de Desenho)
              </label>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedLayerId === layer.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-[var(--primary-glow)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {layer.type === "image" ? (
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-pink)] shrink-0" />
                      )}
                      <span className="font-semibold text-white truncate max-w-[120px]">
                        {layer.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(index, "up"); }}
                        disabled={index === 0}
                        className="p-1 hover:text-[var(--primary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:pointer-events-none"
                        title="Mover para trás (Desenhar antes)"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(index, "down"); }}
                        disabled={index === layers.length - 1}
                        className="p-1 hover:text-[var(--primary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:pointer-events-none"
                        title="Mover para frente (Desenhar depois)"
                      >
                        ▼
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLayers(layers.filter(l => l.id !== layer.id)); }}
                        className="p-1 text-red-400 hover:text-red-300 font-bold"
                        title="Remover Camada"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Layer Properties */}
        {selectedLayerId && layers.find(l => l.id === selectedLayerId) && (() => {
          const layer = layers.find(l => l.id === selectedLayerId)!;
          return (
            <div className="glass-card rounded-[var(--radius)] p-5 flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-tight mb-1 flex items-center gap-2 border-b border-[var(--border)] pb-2.5 text-white">
                <Sliders className="w-4 h-4 text-[var(--primary)]" />
                Configurar: {layer.name}
              </h2>
              
              {layer.type === "text" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1">Escreva seu Texto</label>
                    <input
                      type="text"
                      value={layer.textValue || ""}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, textValue: e.target.value } : l));
                      }}
                      className="input-field py-1.5 rounded-lg text-xs"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Tamanho da Fonte</label>
                      <span className="text-xs font-bold text-[var(--primary)]">{layer.fontSize || 45}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      value={layer.fontSize || 45}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, fontSize: parseInt(e.target.value) } : l));
                      }}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1">Estilo da Fonte</label>
                    <select
                      value={layer.fontFamily || "Caveat"}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, fontFamily: e.target.value } : l));
                      }}
                      className="input-field py-1.5 rounded-lg text-xs"
                    >
                      <option value="Caveat">Caveat (Manuscrito Quente)</option>
                      <option value="Dancing Script">Dancing Script (Cursivo Elegante)</option>
                      <option value="Pacifico">Pacifico (Retrô Negrito)</option>
                      <option value="Arial">Arial (Padrão Sem Serifa)</option>
                      <option value="Georgia">Georgia (Serifada Clássica)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold">Cor do Texto:</span>
                    <input
                      type="color"
                      value={layer.textColor || "#8b5cf6"}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, textColor: e.target.value } : l));
                      }}
                      className="w-8 h-6 bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </>
              )}
              
              {/* Position and Scale Sliders */}
              <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                      <span>Posição X</span>
                      <span>{layer.x}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="800"
                      value={layer.x}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, x: parseInt(e.target.value) } : l));
                      }}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                      <span>Posição Y</span>
                      <span>{layer.y}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="600"
                      value={layer.y}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, y: parseInt(e.target.value) } : l));
                      }}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                      <span>Largura</span>
                      <span>{layer.width}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="800"
                      value={layer.width}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, width: parseInt(e.target.value) } : l));
                      }}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                      <span>Altura</span>
                      <span>{layer.height}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      value={layer.height}
                      onChange={(e) => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, height: parseInt(e.target.value) } : l));
                      }}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Configurations Box */}
        <div className="glass-card rounded-[var(--radius)] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold tracking-tight mb-1 flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
            <Sliders className="w-4 h-4 text-[var(--primary)]" />
            Ajustes do Efeito
          </h2>

          {/* FPS select */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Taxa de Quadros (FPS)</label>
            <div className="grid grid-cols-3 gap-2">
              {([30, 60, 120] as const).map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFps(rate)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                    fps === rate
                      ? "tab-active border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                      : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)] text-white"
                  }`}
                >
                  {rate} fps
                </button>
              ))}
            </div>
          </div>

          {/* Sketch Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Duração do Contorno</label>
              <span className="text-xs font-bold text-[var(--primary)]">{sketchDuration}s</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={sketchDuration}
              onChange={(e) => setSketchDuration(parseInt(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          {/* Color Fill Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Duração do Preenchimento</label>
              <span className="text-xs font-bold text-[var(--primary)]">{fillDuration}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={fillDuration}
              onChange={(e) => setFillDuration(parseInt(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          {/* Hand Style Selector Cards */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Estilo de Mão</label>
            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
              {/* Card 1: None */}
              <button
                type="button"
                onClick={() => setHandStyle("none")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${
                  handStyle === "none"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Sem mão (Apenas revelar)"
              >
                <div className="w-8 h-8 rounded-full border border-dashed border-[var(--text-secondary)]/50 flex items-center justify-center text-[10px] text-[var(--text-secondary)] font-bold">
                  Ø
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Sem Mão</span>
              </button>

              {/* Card 2: Marker */}
              <button
                type="button"
                onClick={() => setHandStyle("marker")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden p-1 ${
                  handStyle === "marker"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Canetão Preto"
              >
                <div className="w-9 h-9 flex items-center justify-center overflow-hidden pointer-events-none bg-slate-100 rounded border border-[var(--border)] p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/hands/marker_black.jpg" alt="Canetão" className="w-full h-full object-contain" />
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Canetão</span>
              </button>

              {/* Card 3: Yellow Pencil */}
              <button
                type="button"
                onClick={() => setHandStyle("pencil")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden p-1 ${
                  handStyle === "pencil"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Lápis Amarelo"
              >
                <div className="w-9 h-9 flex items-center justify-center overflow-hidden pointer-events-none bg-slate-100 rounded border border-[var(--border)] p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/hands/pencil_yellow.jpg" alt="Lápis" className="w-full h-full object-contain" />
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Lápis</span>
              </button>

              {/* Card 4: Cyan Pencil */}
              <button
                type="button"
                onClick={() => setHandStyle("cyan")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden p-1 ${
                  handStyle === "cyan"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Lápis Ciano"
              >
                <div className="w-9 h-9 flex items-center justify-center overflow-hidden pointer-events-none bg-slate-100 rounded border border-[var(--border)] p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/hands/pencil_cyan.jpg" alt="Lápis Ciano" className="w-full h-full object-contain" />
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Ciano</span>
              </button>

              {/* Card 5: Crayon */}
              <button
                type="button"
                onClick={() => setHandStyle("crayon")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden p-1 ${
                  handStyle === "crayon"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Giz de Cera Rosa"
              >
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden scale-[1.3] pointer-events-none">
                  <div dangerouslySetInnerHTML={{ __html: HAND_SVGS.crayon }} className="w-full h-full" />
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Giz Cera</span>
              </button>

              {/* Card 6: Brush */}
              <button
                type="button"
                onClick={() => setHandStyle("brush")}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden p-1 ${
                  handStyle === "brush"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
                title="Pincel de Pintura"
              >
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden scale-[1.3] pointer-events-none">
                  <div dangerouslySetInnerHTML={{ __html: HAND_SVGS.brush }} className="w-full h-full" />
                </div>
                <span className="text-[8px] text-[var(--text-secondary)] mt-1 truncate max-w-full">Pincel</span>
              </button>
            </div>
          </div>

          {/* Sketch Style Selector Cards */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Estilo de Traço</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Color */}
              <button
                type="button"
                onClick={() => setSketchStyle("color")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  sketchStyle === "color"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 mb-1 border border-white/10" />
                <span className="text-[9px] font-semibold text-white">Colorido</span>
              </button>

              {/* Grayscale */}
              <button
                type="button"
                onClick={() => setSketchStyle("grayscale")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  sketchStyle === "grayscale"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-700 mb-1 border border-white/10" />
                <span className="text-[9px] font-semibold text-white">Cinza</span>
              </button>

              {/* Ink Outline */}
              <button
                type="button"
                onClick={() => setSketchStyle("ink")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  sketchStyle === "ink"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-[var(--primary-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/30"
                }`}
              >
                <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <span className="text-[9px] font-semibold text-white">Contorno</span>
              </button>
            </div>
          </div>

          {/* Background settings */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Estilo de Fundo</label>
            <select
              value={bgStyle}
              onChange={(e) => setBgStyle(e.target.value as BackgroundStyle)}
              className="input-field py-2 rounded-lg text-xs mb-2"
            >
              <option value="white">Cor Sólida (Branco/Escolher)</option>
              <option value="grid">Caderno Quadriculado</option>
              <option value="paper">Textura de Papel</option>
              <option value="blackboard">Lousa Escura (Blackboard)</option>
              <option value="greenboard">Lousa Verde Escolar (Greenboard)</option>
              <option value="grayboard">Lousa Cinza de Giz (Slate Grayboard)</option>
              <option value="custom">Imagem de Fundo Customizada</option>
            </select>

            {/* Border Style */}
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Moldura do Quadro (Borda)</label>
              <select
                value={boardBorder}
                onChange={(e) => setBoardBorder(e.target.value)}
                className="input-field py-2 rounded-lg text-xs"
              >
                <option value="none">Sem Moldura (Padrão)</option>
                <option value="chalk">Giz Desenhado (Lousa)</option>
                <option value="wood">Moldura de Madeira Rústica</option>
                <option value="neon">Neon Roxo Brilhante</option>
                <option value="drawn">Traço Duplo de Lápis</option>
              </select>
            </div>

            {bgStyle === "white" && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[var(--text-secondary)] font-semibold">Cor de Fundo:</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-6 bg-transparent border-0 cursor-pointer"
                />
              </div>
            )}

            {bgStyle === "custom" && (
              <button
                onClick={() => bgFileInputRef.current?.click()}
                className="btn-secondary w-full py-1.5 px-3 rounded-lg text-[11px] font-bold mt-1 text-center"
              >
                Carregar Imagem de Fundo
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCustomBgChange}
                />
              </button>
            )}
          </div>

          {/* Draw Order */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Ordem do Desenho</label>
            <select
              value={drawOrder}
              onChange={(e) => setDrawOrder(e.target.value as DrawOrder)}
              className="input-field py-2 rounded-lg text-xs"
            >
              <option value="auto">Automática (Contornos Primeiro)</option>
              <option value="left-to-right">Esquerda para a Direita</option>
              <option value="top-to-bottom">De Cima para Baixo</option>
              <option value="random">Aleatória / Caótica</option>
            </select>
          </div>

          {/* Noise filter */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block mb-1.5">Redução de Ruído no Contorno</label>
            <select
              value={noiseReduction}
              onChange={(e) => setNoiseReduction(parseInt(e.target.value))}
              className="input-field py-2 rounded-lg text-xs"
            >
              <option value="1">Sem redução (Mais detalhes)</option>
              <option value="3">Automática (Padrão)</option>
              <option value="5">Alta (Ignorar pequenos traços)</option>
              <option value="8">Máxima (Somente silhuetas principais)</option>
            </select>
          </div>

          {/* Stroke Width Slider */}
          <div className="border-t border-[var(--border)] pt-3.5 mt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Espessura do Contorno</label>
              <span className="text-xs font-bold text-[var(--primary)]">{strokeWidth}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          {/* Fade exit */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 mt-1">
            <div>
              <span className="text-[11px] font-bold text-white block">Efeito de saída gradual</span>
              <span className="text-[10px] text-[var(--text-secondary)]">O desenho desvanece no final do vídeo.</span>
            </div>
            <input
              type="checkbox"
              checked={fadeExit}
              onChange={(e) => setFadeExit(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Preview Player & Canvas */}
      <div className="flex-1 flex flex-col gap-5">
        
        {/* Canvas Display */}
        <div className="glass-card rounded-[var(--radius-lg)] overflow-hidden flex flex-col flex-1 relative bg-[#09090e] border border-[var(--border)] shadow-2xl">
          <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-[var(--primary)]" />
              Monitor de Visualização (800x600 px)
            </span>
            {isRecording && (
              <span className="badge badge-pink animate-pulse font-bold flex items-center gap-1.5 text-[10px]">
                Gravando Vídeo...
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-6 min-h-[360px] md:min-h-[480px]">
            {layers.length > 0 ? (
              <div className="relative shadow-2xl border border-[var(--border)] rounded-md overflow-hidden max-w-full">
                <canvas
                  ref={canvasRef}
                  width={1600}
                  height={1200}
                  className="w-full aspect-[4/3] bg-white block max-w-full max-h-[500px] cursor-move"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUpOrLeave}
                  onMouseLeave={handleCanvasMouseUpOrLeave}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const clickX = ((touch.clientX - rect.left) / rect.width) * 800;
                    const clickY = ((touch.clientY - rect.top) / rect.height) * 600;
                    const hitLayer = [...layers].reverse().find(l => clickX >= l.x && clickX <= l.x + l.width && clickY >= l.y && clickY <= l.y + l.height);
                    if (hitLayer) {
                      setSelectedLayerId(hitLayer.id);
                      dragStateRef.current = { layerId: hitLayer.id, offsetX: clickX - hitLayer.x, offsetY: clickY - hitLayer.y };
                    }
                  }}
                  onTouchMove={(e) => {
                    if (!dragStateRef.current) return;
                    const touch = e.touches[0];
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = ((touch.clientX - rect.left) / rect.width) * 800;
                    const mouseY = ((touch.clientY - rect.top) / rect.height) * 600;
                    const { layerId, offsetX, offsetY } = dragStateRef.current;
                    let newX = Math.round(mouseX - offsetX);
                    let newY = Math.round(mouseY - offsetY);
                    newX = Math.max(0, Math.min(800 - 50, newX));
                    newY = Math.max(0, Math.min(600 - 50, newY));
                    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, x: newX, y: newY } : l));
                  }}
                  onTouchEnd={() => { dragStateRef.current = null; }}
                />
              </div>
            ) : (
              <div className="text-center p-12 max-w-md">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent-pink)]/5 flex items-center justify-center mx-auto mb-4 border border-[var(--primary)]/10">
                  <Sparkles className="w-7 h-7 text-[var(--primary)]" />
                </div>
                <h3 className="font-bold text-base mb-1.5 text-white">Nenhuma imagem carregada</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Use o painel lateral para fazer o upload de um arquivo SVG vetorial ou uma imagem bitmap (PNG/JPG) e transformar em animação de desenho.
                </p>
              </div>
            )}
          </div>

          {/* Time indicator bar */}
          {layers.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)]/50 flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
              <span>{playTime.toFixed(1)}s / {(sketchDuration + fillDuration).toFixed(1)}s</span>
              <span>{strokes.length} traçados extraídos</span>
            </div>
          )}
        </div>

        {/* Player controls */}
        {layers.length > 0 && (
          <div className="glass-card rounded-[var(--radius)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Control buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePlayToggle}
                disabled={isProcessing || isRecording}
                className="btn-primary py-2.5 px-4 rounded-[10px] text-xs font-bold flex items-center gap-2 shrink-0 shadow-md"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Assistir Preview
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isProcessing || isRecording}
                className="btn-secondary py-2.5 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5"
                title="Reiniciar animação"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar
              </button>
            </div>

            {/* Export buttons */}
            <div className="w-full sm:w-auto">
              <button
                onClick={handleExportVideo}
                disabled={isProcessing || isRecording || strokes.length === 0}
                className="btn-primary bg-gradient-to-r from-[var(--accent-pink)] to-[var(--primary)] hover:from-[var(--accent-pink)] hover:to-[var(--primary-hover)] w-full sm:w-auto py-2.5 px-5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                {isRecording ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Renderizando Vídeo...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Exportar Vídeo (.webm)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info Helper box */}
        <div className="glass-card rounded-[var(--radius)] p-4 border-l-4 border-l-[var(--primary)] flex gap-3">
          <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Dica sobre arquivos</span>
            Para obter melhores resultados no efeito de whiteboard, dê preferência a arquivos **SVG vetoriais**. Caso use **PNG ou JPG**, prefira ilustrações com linhas bem definidas e fundo contrastante (como esboços pretos em fundo branco), pois a extração dos contornos será muito mais precisa.
          </div>
        </div>

      </div>

    </div>
  );
}
