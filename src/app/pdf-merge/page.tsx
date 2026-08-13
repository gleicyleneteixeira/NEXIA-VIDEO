"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Download,
  FileText
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface PDFItem {
  id: string;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  coverUrl: string;
  pageCount: number;
}

// Generate secure or fallback random ID
const generateId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Format file sizes nicely
const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function PDFMergePage() {
  const [pdfItems, setPdfItems] = useState<PDFItem[]>([]);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragOverZone, setIsDragOverZone] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF.js dynamically from CDN
  useEffect(() => {
    const loadScripts = async () => {
      try {
        if ((window as any).pdfjsLib) {
          setPdfjsLoaded(true);
          return;
        }

        let script = document.getElementById("pdfjs-script") as HTMLScriptElement;
        if (!script) {
          script = document.createElement("script");
          script.id = "pdfjs-script";
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
          document.head.appendChild(script);
        }

        const checkLoaded = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(checkLoaded);
            const pdfjs = (window as any).pdfjsLib;
            pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
            setPdfjsLoaded(true);
          }
        }, 100);
      } catch (error) {
        console.error("Failed to load PDF.js:", error);
      }
    };

    loadScripts();
  }, []);

  // Process files selected or dropped
  const processFiles = async (files: FileList | File[]) => {
    setProcessing(true);
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      setProcessing(false);
      return;
    }

    setProgress({ current: 0, total: pdfFiles.length });
    const newItems: PDFItem[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        let coverUrl = "";
        let pageCount = 0;

        if ((window as any).pdfjsLib) {
          try {
            const pdfjs = (window as any).pdfjsLib;
            // Create a copy of the buffer to avoid detaching issues
            const bufferCopy = arrayBuffer.slice(0);
            const loadingTask = pdfjs.getDocument({ data: bufferCopy });
            const pdf = await loadingTask.promise;
            pageCount = pdf.numPages;

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.4 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              coverUrl = canvas.toDataURL("image/jpeg", 0.75);
            }
          } catch (err) {
            console.error(`Failed to render cover for ${file.name}:`, err);
          }
        }

        newItems.push({
          id: generateId(),
          name: file.name,
          size: file.size,
          arrayBuffer,
          coverUrl: coverUrl || "",
          pageCount: pageCount || 1,
        });
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }

      setProgress((prev) => ({ ...prev, current: i + 1 }));
    }

    setPdfItems((prev) => [...prev, ...newItems]);
    setProcessing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Drag and drop zone handlers
  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverZone(true);
  };

  const handleDragLeaveZone = () => {
    setIsDragOverZone(false);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverZone(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Card reordering handlers (HTML5 Drag and Drop)
  const handleCardDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Standard style effect for drag
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverItemIndex(index);
    }
  };

  const handleCardDragLeave = () => {
    setDragOverItemIndex(null);
  };

  const handleCardDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverItemIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...pdfItems];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    
    setPdfItems(updated);
    setDraggedIndex(null);
  };

  // Button-based reordering
  const moveLeft = (index: number) => {
    if (index === 0) return;
    const updated = [...pdfItems];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPdfItems(updated);
  };

  const moveRight = (index: number) => {
    if (index === pdfItems.length - 1) return;
    const updated = [...pdfItems];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPdfItems(updated);
  };

  // Duplicate handler
  const duplicateItem = (index: number) => {
    const item = pdfItems[index];
    const duplicated: PDFItem = {
      ...item,
      id: generateId(),
      name: `${item.name.replace(/\.pdf$/i, "")} (Cópia).pdf`,
      // Create a clean copy of the ArrayBuffer
      arrayBuffer: item.arrayBuffer.slice(0),
    };
    
    const updated = [...pdfItems];
    updated.splice(index + 1, 0, duplicated);
    setPdfItems(updated);
  };

  // Delete handler
  const deleteItem = (index: number) => {
    const updated = pdfItems.filter((_, i) => i !== index);
    setPdfItems(updated);
  };

  const clearAll = () => {
    setPdfItems([]);
  };

  // Merging and Downloading
  const handleMergeAndDownload = async () => {
    if (pdfItems.length === 0) return;
    setMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of pdfItems) {
        // Load original document (needs new ArrayBuffer slice so it doesn't get locked)
        const pdf = await PDFDocument.load(item.arrayBuffer.slice(0));
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      
      // Download file in browser
      const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `pdf_mesclado_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error merging PDFs:", err);
      alert("Ocorreu um erro ao juntar os arquivos PDF. Certifique-se de que os PDFs não estão corrompidos ou protegidos por senha.");
    } finally {
      setMerging(false);
    }
  };

  const totalPages = pdfItems.reduce((acc, item) => acc + item.pageCount, 0);

  return (
    <div className="max-w-7xl mx-auto stagger pb-16">
      {/* Title Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Juntar <span className="gradient-text">PDF</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] max-w-2xl">
          Faça upload de múltiplos arquivos PDF de uma vez só, reorganize a ordem arrastando as capas ou usando os controles, duplique arquivos se necessário e junte tudo num único download instantâneo.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOverZone}
        onDragLeave={handleDragLeaveZone}
        onDrop={handleDropZone}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-card rounded-[var(--radius-lg)] p-12 text-center cursor-pointer border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${
          isDragOverZone
            ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01] shadow-[var(--shadow-glow)]"
            : "border-[var(--border)] hover:border-[var(--primary)]/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={processing || merging}
        />
        
        {processing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin mb-4" />
            <h3 className="font-bold text-base mb-1 text-white">Processando arquivos...</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Extraindo páginas e gerando capas ({progress.current}/{progress.total})
            </p>
            {/* Progress bar */}
            <div className="w-48 bg-[var(--border)] h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] h-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent-pink)]/5 flex items-center justify-center mb-4 border border-[var(--primary)]/10">
              <Upload className="w-7 h-7 text-[var(--primary)]" />
            </div>
            <h3 className="font-bold text-lg mb-1.5 text-white">Selecione ou arraste seus PDFs</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Arraste vários PDFs aqui ou clique para procurar no seu computador.
            </p>
            {!pdfjsLoaded && (
              <span className="text-[10px] text-[var(--text-secondary)] mt-3 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[var(--primary)]" /> Carregando biblioteca de visualização...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid and Actions if we have files */}
      {pdfItems.length > 0 && (
        <div className="mt-10 animate-fade-in">
          {/* Action Toolbar */}
          <div className="glass-card rounded-[var(--radius)] p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/15">
                <FileText className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Lista de Arquivos</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {pdfItems.length} {pdfItems.length === 1 ? "arquivo" : "arquivos"} no total • {totalPages} {totalPages === 1 ? "página" : "páginas"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={clearAll}
                disabled={merging}
                className="btn-secondary py-2.5 px-4 rounded-[10px] text-xs font-semibold w-full sm:w-auto"
              >
                Limpar Tudo
              </button>
              
              <button
                onClick={handleMergeAndDownload}
                disabled={merging}
                className="btn-primary py-2.5 px-5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 w-full sm:w-auto shadow-lg"
              >
                {merging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Juntando PDFs...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Juntar e Baixar PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {pdfItems.map((item, index) => {
              const isDragged = draggedIndex === index;
              const isOver = dragOverItemIndex === index;
              
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, index)}
                  onDragOver={(e) => handleCardDragOver(e, index)}
                  onDragLeave={handleCardDragLeave}
                  onDrop={(e) => handleCardDrop(e, index)}
                  className={`glass-card rounded-[var(--radius)] overflow-hidden flex flex-col group/card cursor-grab active:cursor-grabbing border relative transition-all duration-300 ${
                    isDragged ? "opacity-35 scale-95 border-dashed border-[var(--primary)]" : ""
                  } ${
                    isOver ? "border-[var(--primary)] translate-y-[-4px] shadow-[var(--shadow-glow)]" : "border-[var(--border)]"
                  }`}
                >
                  {/* Card Index Badge */}
                  <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-[var(--border)] flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {index + 1}
                  </div>

                  {/* Thumbnail Cover Area */}
                  <div className="aspect-[3/4] bg-[#0c0c14] flex items-center justify-center overflow-hidden border-b border-[var(--border)] relative">
                    {item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverUrl}
                        alt={`Capa de ${item.name}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4">
                        <FileText className="w-12 h-12 text-[var(--text-secondary)] opacity-35 mb-2" />
                        <span className="text-[10px] text-[var(--text-secondary)] text-center">Pré-visualização indisponível</span>
                      </div>
                    )}

                    {/* Hover controls overlay */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 z-10 gap-3">
                      {/* Drag handle hint */}
                      <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase mb-1">Arraste para ordenar</span>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateItem(index); }}
                          title="Duplicar arquivo"
                          className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-white hover:text-[var(--primary)] hover:border-[var(--primary)]/40 flex items-center justify-center transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteItem(index); }}
                          title="Excluir arquivo"
                          className="w-9 h-9 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Manual Move Buttons for Mobile/Keyboard fallback */}
                      <div className="flex items-center gap-1.5 mt-2 border-t border-[var(--border)] pt-3 w-full justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveLeft(index); }}
                          disabled={index === 0}
                          title="Mover para esquerda"
                          className="w-8 h-8 rounded-md bg-[var(--surface-hover)] disabled:opacity-20 disabled:hover:text-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium px-1">Mover</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveRight(index); }}
                          disabled={index === pdfItems.length - 1}
                          title="Mover para direita"
                          className="w-8 h-8 rounded-md bg-[var(--surface-hover)] disabled:opacity-20 disabled:hover:text-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold text-xs text-white truncate mb-1" title={item.name}>
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-auto pt-1">
                      <span>{formatSize(item.size)}</span>
                      <span className="badge badge-primary py-0.5 px-1.5 text-[9px] rounded-md font-bold">
                        {item.pageCount} {item.pageCount === 1 ? "pág" : "págs"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
