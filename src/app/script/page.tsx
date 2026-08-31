"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Sparkles,
  Lightbulb,
  ChevronRight,
  User,
  Save,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Puzzle,
  AlertTriangle,
  CheckCircle,
  Zap,
  History,
  Mic,
} from "lucide-react";
import { useOpenRouterModel } from "@/hooks/useOpenRouterModel";
import { useBusinessProfiles } from "@/hooks/useBusinessProfiles";
import { setPendingPostImport } from "@/lib/editor/pendingPost";
import { setPendingBrief } from "@/lib/pendingBrief";
import { refineSingleVariationWithAi } from "@/services/scriptAiRefiner";
import { generateScriptsWithRealAI } from "@/services/aiScriptService";
import { ScriptHistoryService, variationToSaved, savedVariationToVariation } from "@/services/scriptHistoryService";
import type { SavedScriptProject } from "@/services/scriptHistoryService";
import ScriptHistoryPanel from "@/components/ScriptHistoryPanel";
import { Variation } from "@/components/ContentCard";
import ScriptVariationView from "@/components/ScriptVariationView";
import { useSpeechToText } from "@/hooks/useSpeechToText";

const ScriptTranscriptionTab = dynamic(
  () => import("@/components/ScriptTranscriptionTab"),
  {
    ssr: false,
    loading: () => (
      <div className="glass-card rounded-[var(--radius)] p-8 flex items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando transcricao...
      </div>
    ),
  }
);

const MediaGalleryTab = dynamic(
  () => import("@/components/MediaGalleryTab"),
  {
    ssr: false,
    loading: () => (
      <div className="glass-card rounded-[var(--radius)] p-8 flex items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando galeria...
      </div>
    ),
  }
);

const DownloadMediaTab = dynamic(
  () => import("@/components/DownloadMediaTab"),
  {
    ssr: false,
    loading: () => (
      <div className="glass-card rounded-[var(--radius)] p-8 flex items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando download...
      </div>
    ),
  }
);

const objectives = [
  { value: "Converter em Vendas", label: "Converter em Vendas", emoji: "🎯" },
  { value: "Atrair Seguidores", label: "Atrair Seguidores", emoji: "👥" },
  { value: "Viralizar", label: "Viralizar / Visualizacoes", emoji: "🚀" },
  { value: "Gerar Engajamento", label: "Gerar Engajamento", emoji: "💬" },
  { value: "Outros", label: "Outros", emoji: "✏️" },
];

const durations = [
  { value: "15s", label: "15s", desc: "Ultra-rapido", emoji: "⚡" },
  { value: "30s", label: "30s", desc: "Padrao Reels/TikTok", emoji: "📱" },
  { value: "60s", label: "60s", desc: "Desenvolvimento Completo", emoji: "🎬" },
  { value: "90s_plus", label: "90s+ (Aprofundado / Sem Limite)", desc: "Sem limite", emoji: "📖" },
];

// Simple Toast component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)]"
    : type === "error" ? "bg-[var(--danger)]/15 border-[var(--danger)]/30 text-[var(--danger)]"
    : "bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]";

  const Icon = type === "success" ? CheckCircle : type === "error" ? AlertTriangle : Sparkles;

  return (
    <div className={`fixed top-6 right-6 z-50 animate-slide-up`}>
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-[12px] border shadow-lg backdrop-blur-md ${bgColor}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100">×</button>
      </div>
    </div>
  );
}

export default function ScriptPage() {
  const router = useRouter();
  const { selectedModel, apiKey, apiKeys } = useOpenRouterModel();
  const {
    profiles,
    selectedProfile,
    selectedId,
    setSelectedId,
    isSaving,
    saveProfile,
    deleteProfile,
    clearSelection,
  } = useBusinessProfiles();

  // Step control
  const [step, setStep] = useState<"profile" | "generate">(selectedId ? "generate" : "profile");

  // Step 1 — Profile form
  const [formName, setFormName] = useState("");
  const [formNicho, setFormNicho] = useState("");
  const [formPublico, setFormPublico] = useState("");
  const [formProduto, setFormProduto] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Step 2 — Generation
  const [theme, setTheme] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const speech = useSpeechToText({
    lang: "pt-BR",
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setTheme((prev) => (prev.trim() ? prev.trim() + " " + text : text));
        setInterimTranscript("");
      } else {
        setInterimTranscript(text);
      }
    },
  });
  const [scriptMode, setScriptMode] = useState<"idea" | "extracted_audio" | "raw_text">("idea");
  const [quantity, setQuantity] = useState(3);
  const [duracao, setDuracao] = useState("30s");
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [customObjective, setCustomObjective] = useState("");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"video" | "fragmented">("video");
  const [isMounted, setIsMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [subTab, setSubTab] = useState<"create" | "transcribe" | "download" | "gallery" | "history">("create");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── Step 1 Handlers ───────────────────────────────────────────────

  const handleSelectProfile = (id: string) => {
    const p = profiles.find((p) => p.id === id);
    if (p) {
      setSelectedId(id);
      setFormName(p.name);
      setFormNicho(p.nicho);
      setFormPublico(p.publico);
      setFormProduto(p.produto);
      setIsEditing(true);
    }
  };

  const handleNewProfile = () => {
    clearSelection();
    setFormName("");
    setFormNicho("");
    setFormPublico("");
    setFormProduto("");
    setIsEditing(true);
  };

  const handleSaveAndContinue = async () => {
    if (!formName.trim()) return;
    const result = await saveProfile(
      formName,
      formNicho,
      formPublico,
      formProduto,
      isEditing && selectedId ? selectedId : undefined
    );
    if (result) {
      setSelectedId(result.id);
      setIsEditing(false);
      setStep("generate");
    }
  };

  const handleUseSelectedProfile = () => {
    if (!selectedId) return;
    const p = profiles.find((p) => p.id === selectedId);
    if (p) {
      setFormName(p.name);
      setFormNicho(p.nicho);
      setFormPublico(p.publico);
      setFormProduto(p.produto);
      setIsEditing(false);
    }
    setStep("generate");
  };

  const handleDeleteProfile = async () => {
    if (!selectedId) return;
    if (!confirm("Excluir este perfil?")) return;
    const ok = await deleteProfile(selectedId);
    if (ok) {
      setFormName("");
      setFormNicho("");
      setFormPublico("");
      setFormProduto("");
      setIsEditing(false);
    }
  };

  // ─── Step 2 Handlers ───────────────────────────────────────────────

  const toggleObjective = (value: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const getCleanObjectives = () => {
    const hasCustom = selectedObjectives.includes("Outros");
    const cleanObjectives = selectedObjectives.filter((v) => v !== "Outros");
    if (hasCustom && customObjective.trim()) {
      cleanObjectives.push(customObjective.trim());
    }
    return cleanObjectives;
  };

  const handlePolish = async (variation: Variation, index: number) => {
    if (!apiKey && apiKeys.length === 0) {
      setToast({
        message: "Configure sua API Key do OpenRouter em Configuracoes > Modelos de IA para refinar.",
        type: "error",
      });
      return;
    }
    try {
      const painOrDesire =
        variation.painOrDesire ||
        variation.dor ||
        variation.development ||
        "";
      const solution = variation.solution || variation.desejo || "";

      const refined = await refineSingleVariationWithAi(
        {
          headline: variation.headline,
          hook: variation.hook,
          painOrDesire,
          solution,
          cta: variation.cta,
        },
        { model: selectedModel, apiKey, apiKeys }
      );

      setVariations((prev) => {
        const next = [...prev];
        const current = next[index];
        if (!current) return prev;
        const hook = refined.hook ?? current.hook;
        const pain = refined.painOrDesire ?? current.painOrDesire ?? painOrDesire;
        const sol = refined.solution ?? current.solution ?? solution;
        const cta = refined.cta ?? current.cta;
        next[index] = {
          ...current,
          headline: refined.headline ?? current.headline,
          hook,
          painOrDesire: pain,
          solution: sol,
          development: [pain, sol].filter(Boolean).join("\n\n") || current.development,
          cta,
          seoCaption: (refined as Record<string, string>).fullScriptText || [hook, pain, sol, cta].filter(Boolean).join("\n\n"),
          caption: (refined as Record<string, string>).fullScriptText || [hook, pain, sol, cta].filter(Boolean).join("\n\n"),
        };
        return next;
      });
      setToast({ message: "Variacao refinada com IA!", type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao refinar com IA.";
      setToast({ message: msg, type: "error" });
    }
  };

  const handleLoadProject = (project: SavedScriptProject) => {
    if (!project || project.variations.length === 0) return;
    setTheme(project.topic);
    setVariations(project.variations.map((v) => savedVariationToVariation(v)));
    setViewMode("video");
    setSubTab("create");
    setToast({
      message: `${project.variations.length} roteiros carregados na tela!`,
      type: "success",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTranscriptionAsBriefing = (text: string) => {
    if (!text.trim()) return;
    setTheme(text.trim());
    setSubTab("create");
    setToast({
      message: "Transcricao preenchida como briefing. Clique em Gerar para criar os roteiros!",
      type: "success",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSendTranscriptToContentCreator = (text: string) => {
    if (!text.trim()) return;
    setPendingBrief(text.trim());
    setToast({
      message: "Transcricao enviada ao Calendario (Criador de Conteudo)!",
      type: "success",
    });
    router.push("/calendar");
  };

  const handleSendToTimeline = (variation: Variation) => {
    setPendingPostImport({
      imageDataUrl: "",
      hook: variation.hook,
      dayNumber: 0,
      pillarLabel: "Roteiro",
      format: "script",
      scriptTexts: [
        variation.hook,
        variation.painOrDesire ||
          variation.development ||
          [variation.dor, variation.desejo].filter(Boolean).join("\n\n"),
        variation.solution || variation.desejo || "",
        variation.cta,
      ].filter(Boolean),
    });
    router.push("/editor");
  };

  const handleGenerateWithAI = async () => {
    if (!theme.trim()) {
      alert("Preencha o Tema/Ideia Central do video!");
      return;
    }
    if (apiKey.trim() === "" && apiKeys.length === 0) {
      alert("Configure sua API Key do OpenRouter em Configuracoes > Modelos de IA!");
      return;
    }
    if (!selectedProfile) {
      alert("Nenhum perfil selecionado!");
      return;
    }

    const cleanObjectives = getCleanObjectives();
    const count = Math.max(1, Math.min(20, quantity));

    setIsGenerating(true);
    setError(null);

    console.log("🚀 Enviando briefing integral para a IA...");

    try {
      const aiVariations = await generateScriptsWithRealAI({
        topic: theme,
        niche: selectedProfile.nicho || "",
        count,
        duracao,
        objectives: cleanObjectives,
        publicoAlvo: selectedProfile.publico || "",
        produtoServico: selectedProfile.produto || "",
        model: selectedModel,
        apiKey,
        apiKeys: apiKeys.length > 0 ? apiKeys : apiKey ? [apiKey] : [],
        mode: scriptMode,
        rawContent: theme,
      });

      if (!aiVariations || aiVariations.length === 0) {
        throw new Error("A IA nao retornou roteiros validos.");
      }

      const nextVariations = aiVariations as Variation[];
      setVariations(nextVariations);
      setViewMode("video");
      setToast({
        message: `${nextVariations.length} roteiros completos gerados com IA!`,
        type: "success",
      });

      void (async () => {
        try {
          await ScriptHistoryService.saveProject({
            topic: theme,
            niche: (selectedProfile && selectedProfile.nicho) || "",
            variationsCount: nextVariations.length,
            variations: nextVariations.map((v, i) =>
              variationToSaved({ ...v }, i)
            ),
          });
          setHistoryRefresh((n) => n + 1);
        } catch (e) {
          console.error("Falha ao salvar no historico local:", e);
        }
      })();
    } catch (error: unknown) {
      console.error("Erro na geração via IA:", error);
      const message = error instanceof Error ? error.message : "Erro ao gerar conteudo com IA.";
      setError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsGenerating(false); // NUNCA FICA TRAVADO
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (!isMounted) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-64 bg-zinc-900 rounded-[var(--radius)]"></div>
      </div>
    );
  }

  const hasAi = !!apiKey || apiKeys.length > 0;

  return (
    <div className="max-w-7xl mx-auto stagger">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/15">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerador de <span className="gradient-text">Conteudo</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] mt-1">
          Multi-variacoes de roteiro com IA
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          step === "profile"
            ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25 shadow-sm shadow-[var(--primary)]/5"
            : "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20"
        }`}>
          {!isMounted ? (
            <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">1</span>
          ) : step === "generate" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">1</span>
          )}
          Perfil
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          step === "generate"
            ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25 shadow-sm shadow-[var(--primary)]/5"
            : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
        }`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
            step === "generate" ? "bg-[var(--primary)] text-white" : "bg-[var(--border)] text-[var(--text-secondary)]"
          }`}>2</span>
          Gerar Conteudo
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — Profile Selection / Creation
      ═══════════════════════════════════════════════════════════════ */}
      {step === "profile" && (
        <div className="max-w-xl animate-slide-up">
          <div className="glass-card rounded-[var(--radius)] p-6 space-y-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-bold">Perfil de Negocio</h2>
            </div>

            {profiles.length > 0 && !isEditing && (
              <div className="space-y-3">
                <label className="block text-xs text-[var(--text-secondary)] font-medium uppercase tracking-widest">
                  Perfil Salvo
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="input-field w-full px-4 py-3 rounded-[12px] text-sm"
                >
                  <option value="">Selecionar Perfil Salvo...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedId && !isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleUseSelectedProfile}
                      className="btn-primary flex-1 py-3 rounded-[12px] text-sm flex items-center justify-center gap-2"
                    >
                      Avancar com este perfil
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeleteProfile}
                      className="px-3 py-3 rounded-[12px] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
                      title="Excluir Perfil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="divider" />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent-orange)]" />
                <span className="text-sm font-semibold">
                  {isEditing && selectedId ? "Editar Perfil" : "Criar Novo Perfil"}
                </span>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                  Nome do Perfil <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Autoescola Nexa Drive"
                  className="input-field w-full px-4 py-3 rounded-[12px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                  Nicho / Area
                </label>
                <input
                  type="text"
                  value={formNicho}
                  onChange={(e) => setFormNicho(e.target.value)}
                  placeholder="Ex: Saude, Financas, Fitness..."
                  className="input-field w-full px-4 py-3 rounded-[12px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                  Publico-Alvo
                </label>
                <input
                  type="text"
                  value={formPublico}
                  onChange={(e) => setFormPublico(e.target.value)}
                  placeholder="Ex: Empreendedores, Maes, Estudantes..."
                  className="input-field w-full px-4 py-3 rounded-[12px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                  Produto / Oferta
                </label>
                <input
                  type="text"
                  value={formProduto}
                  onChange={(e) => setFormProduto(e.target.value)}
                  placeholder="Ex: Curso, Consultoria, E-book..."
                  className="input-field w-full px-4 py-3 rounded-[12px] text-sm"
                />
              </div>
              <button
                onClick={handleSaveAndContinue}
                disabled={isSaving || !formName.trim()}
                className="btn-primary w-full py-3.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar e Continuar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2 — Content Configuration & Generation
      ═══════════════════════════════════════════════════════════════ */}
      {step === "generate" && (
        <div className="space-y-4">
          {/* Sub-tabs: Criar Roteiro / Histórico de Roteiros */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubTab("create")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all ${
                subTab === "create"
                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Criar Roteiro
            </button>
            <button
              onClick={() => setSubTab("transcribe")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all ${
                subTab === "transcribe"
                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Mic className="w-4 h-4" />
              Extrair de Video/Audio
            </button>
            <button
              onClick={() => setSubTab("download")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all ${
                subTab === "download"
                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Download className="w-4 h-4" />
              Baixar Midia
            </button>
            <button
              onClick={() => setSubTab("gallery")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all ${
                subTab === "gallery"
                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Galeria
            </button>
            <button
              onClick={() => setSubTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all ${
                subTab === "history"
                  ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <History className="w-4 h-4" />
              Historico
            </button>
          </div>

          {subTab === "create" ? (
            <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Active Profile Banner */}
            <div className="glass-card rounded-[var(--radius)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[8px] bg-[var(--accent-green)]/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-medium">Perfil Ativo</p>
                    <p className="text-sm font-semibold truncate">{selectedProfile?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep("profile")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/30 transition-all flex-shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Trocar
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="glass-card rounded-[var(--radius)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-[var(--accent-orange)]" />
                <h2 className="text-sm font-bold text-white">Tema / Ideia Central</h2>
              </div>

              {/* Origem do conteúdo: roteiro livre vs remodelagem de vídeo viral */}
              <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] mb-3">
                <button
                  type="button"
                  onClick={() => setScriptMode("idea")}
                  className={`flex-1 px-2 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                    scriptMode === "idea"
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  Criar Roteiro Livre
                </button>
                <button
                  type="button"
                  onClick={() => setScriptMode("extracted_audio")}
                  className={`flex-1 px-2 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                    scriptMode === "extracted_audio"
                      ? "bg-[var(--accent-orange)] text-white"
                      : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  Remodelar Vídeo Viral
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder={
                    scriptMode === "idea"
                      ? "Ex: 3 erros que destroem seu trafego pago..."
                      : "Cole a transcricao do video viral que ja funcionou..."
                  }
                  className="input-field w-full h-28 px-4 py-3 pr-12 rounded-[12px] resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!speech.isSupported) {
                      alert("Reconhecimento de voz nao suportado neste navegador. Use Chrome ou Edge.");
                      return;
                    }
                    speech.toggle();
                  }}
                  title={
                    speech.isListening
                      ? "Ouvindo... Fale sua ideia (clique para parar)"
                      : "Ditar por voz (WhatsApp-style)"
                  }
                  disabled={!speech.isSupported}
                  className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    speech.isListening
                      ? "bg-red-500 text-white pulse-rec"
                      : speech.isSupported
                        ? "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/50"
                        : "bg-[var(--surface)] border border-[var(--border)] text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              {speech.isListening && (
                <div className="mt-2 text-[11px] text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {interimTranscript ? (
                    <span className="italic truncate">&ldquo;{interimTranscript}&rdquo;</span>
                  ) : (
                    <span>Ouvindo... Fale sua ideia</span>
                  )}
                </div>
              )}
              {speech.error && (
                <p className="mt-2 text-[11px] text-red-400">{speech.error}</p>
              )}
              <div className="mt-2 p-2.5 rounded-[8px] bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/80 flex items-start gap-2">
                <span className="text-sm shrink-0">💡</span>
                <div>
                  <strong className="text-purple-300">Dica de Criacao:</strong>
                  <p className="mt-1 leading-relaxed">
                    <span className="text-zinc-300">• <strong>Com IA:</strong> pode colar textos longos, comentarios ou desabafos completos. Quanto mais contexto, mais coerente fica o roteiro.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="glass-card rounded-[var(--radius)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-white">Configuracoes</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Quantidade de Videos</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="input-field w-full px-4 py-2.5 rounded-[12px]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Duracao do Video
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {durations.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDuracao(d.value)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-[10px] border text-center transition-all duration-200 ${
                          duracao === d.value
                            ? "bg-[var(--primary)]/15 border-[var(--primary)]/35 text-white shadow-sm shadow-[var(--primary)]/8"
                            : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
                        }`}
                      >
                        <span className="text-base">{d.emoji}</span>
                        <span className="text-xs font-bold">{d.label}</span>
                        <span className="text-[9px] opacity-60 leading-tight">{d.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
                    Objetivo do Video
                    {selectedObjectives.length > 0 && (
                      <span className="ml-1.5 text-[var(--primary)]">{selectedObjectives.length} selecionado{selectedObjectives.length > 1 ? "s" : ""}</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {objectives.map((obj) => {
                      const isSelected = selectedObjectives.includes(obj.value);
                      return (
                        <button
                          key={obj.value}
                          onClick={() => toggleObjective(obj.value)}
                          className={`text-left px-3 py-2 rounded-full border text-xs transition-all duration-200 ${
                            isSelected
                              ? "bg-[var(--primary)]/15 border-[var(--primary)]/35 text-white shadow-sm shadow-[var(--primary)]/8"
                              : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
                          }`}
                        >
                          <span className="mr-1">{obj.emoji}</span> {obj.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedObjectives.includes("Outros") && (
                    <input
                      type="text"
                      value={customObjective}
                      onChange={(e) => setCustomObjective(e.target.value)}
                      placeholder="Descreva o objetivo..."
                      className="input-field w-full mt-2 px-4 py-2.5 rounded-[12px]"
                    />
                  )}
                  {selectedObjectives.length > 0 && (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                      Os objetivos serao distribuidos e alternados entre os {quantity} videos gerados.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Generate — 100% IA, geração sempre via API (sem templates locais) */}
            <button
              onClick={handleGenerateWithAI}
              disabled={isGenerating || !theme.trim()}
              className="w-full py-3 px-4 rounded-[14px] font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>Gerar {quantity} Variacoes com IA</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 text-center leading-relaxed">
              {hasAi
                ? `Gerado pela IA (${selectedModel || "google/gemini-2.5-flash:free"}) a partir do seu briefing completo, em 3 atos coerentes.`
                : "Este botao precisa de uma API Key. Configure em Configuracoes > Modelos de IA."}
            </p>
          </div>

          {/* Right — Results */}
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-4 p-4 rounded-[12px] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm">
                {error}
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative mb-6">
                  <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)]" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full bg-[var(--primary)]/10 blur-xl" />
                </div>
                <p className="text-lg font-bold text-white mb-1">Iniciando geracao...</p>
                <p className="text-sm text-[var(--text-secondary)]">Preparando sua solicitacao</p>
              </div>
            )}

            {!isGenerating && variations.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                <div className="w-20 h-20 rounded-[20px] bg-[var(--primary)]/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-lg font-bold mb-1">Nenhum conteudo gerado ainda</p>
                <p className="text-sm">Preencha o tema e clique em gerar</p>
              </div>
            )}

            {variations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{variations.length} Variacoes Geradas</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-0.5">
                      <button
                        onClick={() => setViewMode("video")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-200 ${
                          viewMode === "video"
                            ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-white"
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Por Video
                      </button>
                      <button
                        onClick={() => setViewMode("fragmented")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-200 ${
                          viewMode === "fragmented"
                            ? "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-white"
                        }`}
                      >
                        <Puzzle className="w-3.5 h-3.5" />
                        Fragmentado
                      </button>
                    </div>
                    <button
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-white transition-colors group"
                    >
                      <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      Regenerar
                    </button>
                  </div>
                </div>

                <ScriptVariationView
                  variations={variations}
                  theme={theme}
                  viewMode={viewMode}
                  onSendToTimeline={handleSendToTimeline}
                  onPolish={handlePolish}
                />
              </div>
            )}
          </div>
        </div>
        ) : subTab === "transcribe" ? (
          <ScriptTranscriptionTab
            onUseAsBriefing={handleTranscriptionAsBriefing}
            onSendToContentCreator={handleSendTranscriptToContentCreator}
          />
        ) : subTab === "download" ? (
          <DownloadMediaTab />
        ) : subTab === "gallery" ? (
          <MediaGalleryTab />
        ) : (
          <ScriptHistoryPanel refreshToken={historyRefresh} onLoad={handleLoadProject} />
        )}
        </div>
      )}
    </div>
  );
}
