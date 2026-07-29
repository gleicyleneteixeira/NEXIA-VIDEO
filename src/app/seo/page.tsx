"use client";

import { useState } from "react";
import {
  Search,
  Copy,
  RefreshCw,
  Wand2,
  Save,
  ArrowRight,
  Check,
  TrendingUp,
  Hash,
  FileText,
  Lightbulb,
  Sparkles,
} from "lucide-react";

const suggestedHashtags = [
  { tag: "#criadoresdeconteudo", trending: true, reach: "Alto" },
  { tag: "#marketingdigital", trending: true, reach: "Alto" },
  { tag: "#dicasdetiktok", trending: false, reach: "Médio" },
  { tag: "#conteudoviral", trending: true, reach: "Alto" },
  { tag: "#youtubers", trending: false, reach: "Médio" },
  { tag: "#socialmedia", trending: true, reach: "Alto" },
  { tag: "#empreendedorismo", trending: false, reach: "Médio" },
  { tag: "#produtividade", trending: false, reach: "Médio" },
];

const titleSuggestions = [
  "COMO CRIAR CONTEÚDO VIRAL EM 2026 (Sem Frescura!)",
  "10 DICAS que NINGUÉM te conta sobre Criar Conteúdo",
  "O Segredo dos Maiores Criadores de Conteúdo do Brasil",
  "Como Começar do Zero e Virar Referência no seu Nicho",
];

export default function SEOPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [customHashtag, setCustomHashtag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setTitle("COMO CRIAR CONTEÚDO VIRAL EM 2026 (Sem Frescura!)");
      setDescription(
        "Neste vídeo completo, vou te ensinar as estratégias comprovadas que os maiores criadores de conteúdo usam para viralizar nas redes sociais. Aprenda a criar roteiros envolventes, editar como profissional e otimizar seus vídeos para o algoritmo. Se você quer crescer no TikTok, YouTube ou Instagram, esse vídeo é para você! 🔥\n\n📋 O que você vai aprender:\n• Como criar ganchos que prendem atenção\n• Técnicas de edição que aumentam o retenção\n• SEO para vídeos no YouTube e TikTok\n• Ferramentas gratuitas para criadores\n\n🔔 Se inscreva e ative o sininho para mais dicas!\n\n#criadoresdeconteudo #marketingdigital #dicasdetiktok"
      );
      setSelectedHashtags([
        "#criadoresdeconteudo",
        "#marketingdigital",
        "#dicasdetiktok",
        "#conteudoviral",
        "#socialmedia",
      ]);
      setTranscription(
        "00:00 - Você sabia que 90% dos criadores de conteúdo desistem nos primeiros 3 meses?\n00:03 - Neste vídeo, vou te mostrar exatamente o que fazer para não fazer parte dessa estatística.\n00:08 - Fala pessoal! Sejam bem-vindos a mais um vídeo.\n00:12 - Se você é novo por aqui, se inscreve e ativa o sininho.\n00:15 - Hoje vou compartilhar algo que vai mudar completamente a forma como você cria conteúdo.\n00:20 - Primeiro, vamos falar sobre o erro mais comum que os iniciantes cometem..."
      );
      setIsGenerating(false);
    }, 2000);
  };

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomHashtag = () => {
    if (customHashtag && !selectedHashtags.includes(customHashtag)) {
      setSelectedHashtags((prev) => [
        ...prev,
        customHashtag.startsWith("#") ? customHashtag : `#${customHashtag}`,
      ]);
      setCustomHashtag("");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-8 h-8 text-[var(--accent-cyan)]" />
            <h1 className="text-3xl font-bold">
              SEO & <span className="gradient-text">Metadados</span>
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            Otimize seu conteúdo para máxima visibilidade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </button>
          <a
            href="/publish"
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            Próximo: Publicar
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Content */}
        <div className="space-y-6">
          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Gerando metadados...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Gerar Metadados com IA
              </>
            )}
          </button>

          {/* Title */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                Título
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                {title.length}/100 caracteres
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite um título chamativo e otimizado para SEO..."
              className="input-field"
            />
            <div className="mt-3">
              <p className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Sugestões de títulos:
              </p>
              <div className="space-y-2">
                {titleSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setTitle(suggestion)}
                    className="w-full text-left p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-sm transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{suggestion}</span>
                    <Copy className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent-pink)]" />
                Descrição
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                {description.length}/5000 caracteres
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu vídeo com palavras-chave relevantes..."
              className="input-field min-h-[200px] resize-none"
              rows={8}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleCopy(description, "description")}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center gap-1"
              >
                {copied === "description" ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--accent-green)]" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hashtags */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-[var(--accent-orange)]" />
              Hashtags
            </h3>

            {/* Selected Hashtags */}
            {selectedHashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedHashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-sm font-medium flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => toggleHashtag(tag)}
                      className="ml-1 hover:text-[var(--accent-red)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Custom */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={customHashtag}
                onChange={(e) => setCustomHashtag(e.target.value)}
                placeholder="Adicionar hashtag personalizada..."
                className="input-field flex-1"
                onKeyPress={(e) => e.key === "Enter" && addCustomHashtag()}
              />
              <button
                onClick={addCustomHashtag}
                className="btn-secondary px-4"
              >
                +
              </button>
            </div>

            {/* Suggested */}
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Hashtags sugeridas:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => toggleHashtag(item.tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedHashtags.includes(item.tag)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {item.tag}
                  {item.trending && (
                    <TrendingUp className="w-3 h-3 inline ml-1 text-[var(--accent-orange)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Transcription & Preview */}
        <div className="space-y-6">
          {/* Transcription */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-green)]" />
                Transcrição Automática
              </h3>
              <button
                onClick={() => handleCopy(transcription, "transcription")}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center gap-1"
              >
                {copied === "transcription" ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--accent-green)]" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Tudo
                  </>
                )}
              </button>
            </div>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="A transcrição do seu vídeo aparecerá aqui após o upload..."
              className="input-field min-h-[300px] resize-none font-mono text-sm"
              rows={12}
            />
          </div>

          {/* Preview */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--accent-cyan)]" />
              Pré-visualização SEO
            </h3>
            <div className="bg-white rounded-lg p-4 text-black">
              <p className="text-blue-800 text-lg font-medium truncate mb-1">
                {title || "Título do seu vídeo"}
              </p>
              <p className="text-green-700 text-sm mb-1">
                www.youtube.com/watch?v=...
              </p>
              <p className="text-gray-600 text-sm line-clamp-2">
                {description
                  ? description.substring(0, 160) + "..."
                  : "Sua descrição otimizada aparecerá aqui..."}
              </p>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Preview TikTok:</h4>
              <div className="bg-black rounded-lg p-4 text-white aspect-[9/16] max-h-[200px] flex flex-col justify-end">
                <p className="font-bold text-sm mb-2">
                  @{title ? title.split(" ")[0].toLowerCase() : "usuario"}
                </p>
                <p className="text-xs line-clamp-3">
                  {description
                    ? description.substring(0, 100) + "..."
                    : "Sua descrição..."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedHashtags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-[var(--primary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
