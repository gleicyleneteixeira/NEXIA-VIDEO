"use client";

import { useState } from "react";
import {
  Sparkles,
  Wand2,
  FileText,
  Lightbulb,
  MessageSquare,
  Copy,
  RefreshCw,
  Save,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Wand,
  PenTool,
  Target,
  Clock,
} from "lucide-react";

const templates = [
  { id: 1, name: "Tutorial", description: "Vídeo educativo passo a passo" },
  { id: 2, name: "Review", description: "Análise de produto ou serviço" },
  { id: 3, name: "Vlog", description: "Registro pessoal do dia a dia" },
  { id: 4, name: "Entrevista", description: "Conversa com convidados" },
  { id: 5, name: "Shorts", description: "Conteúdo rápido e direto" },
];

const tones = [
  "Informal e Descontraído",
  "Profissional e Corporativo",
  "Engraçado e Humorístico",
  "Inspirador e Motivacional",
  "Educativo e Didático",
];

export default function PreProductionPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "tema",
    "gancho",
    "roteiro",
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setHook(
        "Você sabia que 90% dos criadores de conteúdo desistem nos primeiros 3 meses? Neste vídeo, vou te mostrar exatamente o que fazer para NÃO fazer parte dessa estatística..."
      );
      setScript(
        `[GANCHO - 0:00-0:03]\n${hook || "Você sabia que 90% dos criadores de conteúdo desistem nos primeiros 3 meses?"}\n\n[INTRODUÇÃO - 0:03-0:15]\nFala pessoal! Sejam bem-vindos a mais um vídeo. Se você é novo por aqui, se inscreve e ativa o sininho porque hoje vou compartilhar algo que vai mudar completamente a forma como você cria conteúdo.\n\n[DESENVOLVIMENTO - 0:15-2:00]\nPrimeiro, vamos falar sobre o erro mais comum que os iniciantes cometem... [Desenvolver o conteúdo principal aqui]\n\n[CONCLUSÃO - 2:00-2:15]\nEntão galera, se vocês gostaram do vídeo, deixe seu like e se inscrevam no canal. Compartilhem com aquele criador de conteúdo que precisa ouvir isso. Um abraço e até o próximo vídeo!`
      );
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const Section = ({
    id,
    title,
    icon: Icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.includes(id);
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-semibold">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-[var(--border)]">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-[var(--accent-pink)]" />
          <h1 className="text-3xl font-bold">
            Pré-Produção & <span className="gradient-text">Roteiro</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Crie roteiros incríveis com IA ou manualmente
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Configuration */}
        <div className="lg:col-span-1 space-y-4">
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
                  onClick={() => setSelectedTemplate(template.id)}
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
                  onClick={() => setSelectedTone(tone)}
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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!topic || isGenerating}
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
                Gerar Roteiro com IA
              </>
            )}
          </button>

          <p className="text-xs text-[var(--text-secondary)] text-center">
            * Requer chave de API configurada nas{" "}
            <a href="/settings" className="text-[var(--primary)] hover:underline">
              Configurações
            </a>
          </p>
        </div>

        {/* Right - Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Topic Input */}
          <Section id="tema" title="Tema do Vídeo" icon={Target}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Como crescer no TikTok em 2026"
              className="input-field mt-3"
            />
          </Section>

          {/* Hook */}
          <Section id="gancho" title="Gancho (Hook)" icon={Lightbulb}>
            <div className="relative mt-3">
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Escreva um gancho chamativo para reter a atenção nos primeiros 3 segundos..."
                className="input-field min-h-[100px] resize-none"
                rows={3}
              />
              <button
                onClick={() => handleCopy(hook)}
                className="absolute top-2 right-2 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                title="Copiar"
              >
                <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent-orange)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                Ideal: 1-2 frases (3-5 segundos de leitura)
              </span>
            </div>
          </Section>

          {/* Script */}
          <Section id="roteiro" title="Roteiro Completo" icon={PenTool}>
            <div className="relative mt-3">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Desenvolva seu roteiro aqui. Use [COLCHETES] para marcar timestamps e instruções de edição..."
                className="input-field min-h-[300px] resize-none font-mono text-sm"
                rows={12}
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => handleCopy(script)}
                  className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  title="Copiar"
                >
                  <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={handleGenerate}
                  className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  title="Regenerar"
                >
                  <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span>
                  {script.split(/\s+/).filter(Boolean).length} palavras
                </span>
                <span>
                  ~{Math.ceil(
                    script.split(/\s+/).filter(Boolean).length / 150
                  )}{" "}
                  min de fala
                </span>
              </div>
              <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Salvar Roteiro
              </button>
            </div>
          </Section>

          {/* Next Step */}
          <div className="flex justify-end">
            <a
              href="/editor"
              className="btn-primary flex items-center gap-2"
            >
              Próximo: Editar Vídeo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
