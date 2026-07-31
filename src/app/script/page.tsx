"use client";

import { useState } from "react";
import {
  Sparkles,
  Wand2,
  FileText,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  Check,
  Key,
  ExternalLink,
  Target,
  Hash,
  AlertTriangle,
} from "lucide-react";
import ScriptCard, { type Roteiro } from "@/components/ScriptCard";

const templates = [
  { id: "Tutorial", name: "Tutorial", description: "Vídeo educativo passo a passo" },
  { id: "Review", name: "Review", description: "Análise de produto ou serviço" },
  { id: "Vlog", name: "Vlog", description: "Registro pessoal do dia a dia" },
  { id: "Entrevista", name: "Entrevista", description: "Conversa com convidados" },
  { id: "Shorts", name: "Shorts", description: "Conteúdo rápido e direto" },
];

const tones = [
  "Informal e Descontraído",
  "Profissional e Corporativo",
  "Engraçado e Humorístico",
  "Inspirador e Motivacional",
  "Educativo e Didático",
];

const quantidades = [1, 3, 5];

export default function ScriptPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("");
  const [tema, setTema] = useState("");
  const [quantidade, setQuantidade] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!tema.trim()) return;
    setIsGenerating(true);
    setError(null);
    setRoteiros([]);

    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema,
          quantidade,
          tipoVideo: selectedTemplate,
          tomVoz: selectedTone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar roteiros.");
      }

      setRoteiros(data.roteiros || []);
    } catch (err) {
      console.log("[v0] Falha na geração:", err);
      setError(
        err instanceof Error ? err.message : "Erro inesperado ao gerar roteiros."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-[var(--accent-pink)]" />
          <h1 className="text-3xl font-bold">
            Roteiro & <span className="gradient-text">IA</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Descreva sua ideia e deixe a IA gerar roteiros completos e prontos para
          gravar
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Configuration */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tema / Ideia Central */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--accent-pink)]" />
              Tema / Ideia Central
            </h3>
            <textarea
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Como economizar em produtos de casa"
              className="input-field min-h-[100px] resize-none"
              rows={4}
            />
          </div>

          {/* Quantidade de Roteiros */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-[var(--accent-cyan)]" />
              Quantidade de Roteiros
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {quantidades.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantidade(q)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    quantidade === q
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
                  }`}
                >
                  {q} {q === 1 ? "roteiro" : "roteiros"}
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--primary)]" />
              Tipo de Vídeo
            </h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() =>
                    setSelectedTemplate(
                      selectedTemplate === template.id ? "" : template.id
                    )
                  }
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedTemplate === template.id
                      ? "bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-pink)]/20 border border-[var(--primary)]/30"
                      : "bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-transparent"
                  }`}
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent-cyan)]" />
              Tom de Voz
            </h3>
            <div className="flex flex-wrap gap-2">
              {tones.map((tone) => (
                <button
                  key={tone}
                  onClick={() =>
                    setSelectedTone(selectedTone === tone ? "" : tone)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTone === tone
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Status */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--accent-green)]" />
                Status da IA
              </h3>
              <a
                href="/settings"
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                Configurar
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-3 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20">
              <p className="text-sm text-[var(--accent-green)] flex items-center gap-2">
                <Check className="w-4 h-4" />
                Grok (xAI) Conectado
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!tema.trim() || isGenerating}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Gerando com IA...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Gerar Roteiros Completos
              </>
            )}
          </button>
        </div>

        {/* Right - Output */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="glass-card rounded-xl p-4 border border-[var(--accent-red)]/30 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--accent-red)] shrink-0" />
              <p className="text-sm text-[var(--accent-red)]">{error}</p>
            </div>
          )}

          {/* Loading skeletons */}
          {isGenerating &&
            Array.from({ length: quantidade }).map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-4 animate-pulse space-y-3"
              >
                <div className="h-6 w-1/2 rounded bg-[var(--surface-hover)]" />
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="h-20 rounded bg-[var(--surface-hover)]" />
                  <div className="h-20 rounded bg-[var(--surface-hover)]" />
                  <div className="h-20 rounded bg-[var(--surface-hover)]" />
                  <div className="h-20 rounded bg-[var(--surface-hover)]" />
                </div>
              </div>
            ))}

          {/* Empty state */}
          {!isGenerating && roteiros.length === 0 && !error && (
            <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-pink)]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[var(--primary)]" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                Seus roteiros aparecerão aqui
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm text-pretty">
                Preencha o tema, escolha a quantidade e clique em &quot;Gerar
                Roteiros Completos&quot; para receber roteiros estruturados prontos
                para gravar.
              </p>
            </div>
          )}

          {/* Generated cards */}
          {roteiros.map((roteiro, i) => (
            <ScriptCard
              key={i}
              roteiro={roteiro}
              index={i + 1}
              total={roteiros.length}
            />
          ))}

          {/* Next Step */}
          {roteiros.length > 0 && (
            <div className="flex justify-end">
              <a
                href="/mass-production"
                className="btn-primary flex items-center gap-2"
              >
                Próximo: Criação em Massa
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
