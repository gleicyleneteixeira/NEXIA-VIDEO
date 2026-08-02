"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Lightbulb,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  Save,
  Loader2,
  User,
  Megaphone,
  FileText,
  Cpu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOpenRouterModel } from "@/hooks/useOpenRouterModel";

type VideoObjective = "vendas" | "seguidores" | "viralizar" | "engajamento" | "outros" | "";

interface UserProfile {
  nicho: string;
  publico_alvo: string;
  produto_servico: string;
}

const objectives = [
  { value: "vendas", label: "💰 Vendas / Conversão", description: "Gerar vendas ou leads" },
  { value: "seguidores", label: "👥 Atrair Seguidores", description: "Crescer a base de seguidores" },
  { value: "viralizar", label: "🔥 Viralizar / Visualizações", description: "Máximo de views" },
  { value: "engajamento", label: "💬 Engajamento / Comentários", description: "Gerar interação" },
  { value: "outros", label: "📝 Outros", description: "Personalizar objetivo" },
];

export default function PreProductionPage() {
  // OpenRouter model
  const {
    selectedModel,
    setSelectedModel,
    models,
    isLoadingModels,
    apiKey,
    setApiKey,
    defaultModel,
    searchQuery,
    setSearchQuery,
  } = useOpenRouterModel();

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    nicho: "",
    publico_alvo: "",
    produto_servico: "",
  });

  // Form state
  const [videoObjective, setVideoObjective] = useState<VideoObjective>("");
  const [customObjective, setCustomObjective] = useState("");
  const [centralIdea, setCentralIdea] = useState("");
  const [videoCount, setVideoCount] = useState(1);

  // UI state
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [hook, setHook] = useState("");

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          nicho: profile.nicho,
          publico_alvo: profile.publico_alvo,
          produto_servico: profile.produto_servico,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.warn("Erro ao salvar perfil:", error);
      }
    } catch (err) {
      console.warn("Erro ao salvar perfil:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load profile from Supabase on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_profiles")
          .select("nicho, publico_alvo, produto_servico")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setProfile({
            nicho: data.nicho || "",
            publico_alvo: data.publico_alvo || "",
            produto_servico: data.produto_servico || "",
          });
        }
      } catch (err) {
        console.log("Perfil não encontrado ou erro ao carregar:", err);
      }
    };
    loadProfile();
  }, []);

  const handleGenerate = async () => {
    if (!centralIdea.trim()) {
      alert("Preencha a Ideia Central do vídeo!");
      return;
    }

    setIsGenerating(true);

    // Construir prompt com contexto
    const objectiveLabel = videoObjective === "outros"
      ? customObjective
      : objectives.find((o) => o.value === videoObjective)?.label || "";

    const contextParts: string[] = [];
    if (profile.nicho) contextParts.push(`Nicho: ${profile.nicho}`);
    if (profile.publico_alvo) contextParts.push(`Público-alvo: ${profile.publico_alvo}`);
    if (profile.produto_servico) contextParts.push(`Produto/Serviço: ${profile.produto_servico}`);
    if (objectiveLabel) contextParts.push(`Objetivo: ${objectiveLabel}`);

    const contextStr = contextParts.length > 0
      ? `\n\nContexto adicional:\n${contextParts.join("\n")}`
      : "";

    const prompt = `Crie um roteiro completo de vídeo com a seguinte ideia central: "${centralIdea}"

Estrutura obrigatória (Copywriting AIDA):
1. HOOK (Gancho - primeiros 3 segundos): Chame a atenção imediatamente
2. DOR (Problema): Identifique a dor ou necessidade do público
3. DESEJO (Solução): Apresente a solução ou desejo
4. CTA (Chamada para a ação): Finalize com uma chamada clara

${contextStr}

Gere ${videoCount > 1 ? `${videoCount} variações de roteiro` : "o roteiro"} no formato:
[GANCHO - 0:00-0:03]
...
[INTRODUÇÃO - 0:03-0:15]
...
[DESENVOLVIMENTO - 0:15-1:30]
...
[CONCLUSÃO/CTA - 1:30-1:45]
...`;

    // Simular geração (substituir por chamada real à API de IA)
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "ContentHub - Gerador de Roteiros",
        },
        body: JSON.stringify({
          model: selectedModel || defaultModel,
          messages: [
            {
              role: "system",
              content: "Você é um roteirista profissional especializado em criar roteiros para vídeos de YouTube e redes sociais. Use o formato AIDA (Atenção, Interesse, Desejo, Ação).",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Erro ao gerar roteiro");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Extrair gancho (primeira linha ou até 150 chars)
      const lines = content.split("\n").filter((l: string) => l.trim());
      const extractedHook = lines[0]?.substring(0, 150) || content.substring(0, 150);

      setHook(extractedHook);
      setGeneratedScript(content);
    } catch (err) {
      console.error("Erro ao gerar:", err);
      alert(`Erro ao gerar roteiro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setIsGenerating(false);
      saveProfile();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-[var(--accent-pink)]" />
          <h1 className="text-3xl font-bold">
            Gerador de <span className="gradient-text">Conteúdo</span>
          </h1>
        </div>
        <p className="text-gray-400">
          Defina sua ideia e gere roteiros completos com IA
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ideia Central - CAMPO PRINCIPAL */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Ideia Central do Vídeo</h2>
              <span className="text-xs text-gray-500 ml-auto">*Obrigatório</span>
            </div>
            <textarea
              value={centralIdea}
              onChange={(e) => setCentralIdea(e.target.value)}
              placeholder="Ex: Dicas para passar no exame prático da CNH de primeira..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all resize-none"
            />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Qtd. de vídeos:</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={videoCount}
                  onChange={(e) => setVideoCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 rounded-lg bg-[#252535] border border-gray-700 text-white text-center text-sm focus:border-[var(--primary)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modelo de IA */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-bold text-white">Modelo de IA</h2>
              <span className="text-xs text-gray-500 ml-auto">
                Padrão: {defaultModel}
              </span>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua API Key do OpenRouter (opcional)..."
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar modelo (ex: gemini, free, claude)..."
                  className="w-full px-4 py-2 pl-8 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all text-sm"
                />
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-4 gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando modelos...
                </div>
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white focus:border-[var(--primary)] outline-none transition-all"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.isFree ? "🟢" : "💰"} {model.name || model.id}{" "}
                      {model.displayPrice}
                    </option>
                  ))}
                  {models.length === 0 && (
                    <option value="">Nenhum modelo encontrado</option>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Objetivo do Vídeo */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-bold text-white">Objetivo do Vídeo</h2>
              <span className="text-xs text-gray-500 ml-auto">Opcional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {objectives.map((obj) => (
                <button
                  key={obj.value}
                  onClick={() => setVideoObjective(obj.value as VideoObjective)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    videoObjective === obj.value
                      ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-white"
                      : "bg-[#252535] border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <p className="text-sm font-medium">{obj.label}</p>
                  <p className="text-xs text-gray-500">{obj.description}</p>
                </button>
              ))}
            </div>
            {videoObjective === "outros" && (
              <input
                type="text"
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="Descreva seu objetivo..."
                className="w-full mt-3 px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
            )}
          </div>

          {/* Campos Opcionais - Collapsible */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#252535] transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">Mais Opções Opcionais</span>
                <span className="text-xs text-gray-500">(seu perfil)</span>
              </div>
              {showOptionalFields ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showOptionalFields && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-800">
                <div className="pt-4">
                  <label className="block text-sm text-gray-400 mb-1">Nicho</label>
                  <input
                    type="text"
                    value={profile.nicho}
                    onChange={(e) => setProfile({ ...profile, nicho: e.target.value })}
                    placeholder="Ex: Saúde, Finanças, Fitness, Culinária..."
                    className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Público-Alvo</label>
                  <input
                    type="text"
                    value={profile.publico_alvo}
                    onChange={(e) => setProfile({ ...profile, publico_alvo: e.target.value })}
                    placeholder="Ex: Pessoas tirando a 1ª carteira ou maiores de 18 anos"
                    className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Produto / Serviço</label>
                  <input
                    type="text"
                    value={profile.produto_servico}
                    onChange={(e) => setProfile({ ...profile, produto_servico: e.target.value })}
                    placeholder="Ex: Curso online, E-book, Consultoria, App..."
                    className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
                  />
                </div>
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar perfil para próxima vez
                </button>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !centralIdea.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando roteiro...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Gerar Roteiro com IA
              </>
            )}
          </button>
        </div>

        {/* Right - Preview */}
        <div className="lg:col-span-1">
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-[var(--accent-pink)]" />
              <h2 className="text-lg font-bold text-white">Resultado</h2>
            </div>

            {generatedScript ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">GANCHO</span>
                    <button
                      onClick={() => handleCopy(hook)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-sm text-pink-300">
                    {hook}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">ROTEIRO COMPLETO</span>
                    <button
                      onClick={() => handleCopy(generatedScript)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-[#252535] text-sm text-gray-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {generatedScript}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGeneratedScript("");
                    setHook("");
                  }}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar novo roteiro
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Preencha a ideia central e clique em gerar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
