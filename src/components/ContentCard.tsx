"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Target,
  Zap,
  Sparkles,
  Megaphone,
  Clapperboard,
  Film,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface Variation {
  hook: string;
  dor: string;
  desejo: string;
  cta: string;
  headline: string;
  caption: string;
  hashtags: string[];
  scene_direction: string;
  brolls: string[];
  objective_foco?: string;
}

interface ContentCardProps {
  index: number;
  variation: Variation;
  theme: string;
}

function CopyBox({ label, text, icon: Icon, accent }: { label: string; text: string; icon: React.ElementType; accent?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-3.5 group/box hover:border-[var(--border)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color: accent || "var(--primary)" }} />
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors opacity-0 group-hover/box:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[var(--accent-green)]" />
              <span className="text-[var(--accent-green)]">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copiar
            </>
          )}
        </button>
      </div>
      <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

export default function ContentCard({ index, variation, theme }: ContentCardProps) {
  const [expanded, setExpanded] = useState(index === 0);

  const fullCaption = variation.caption + "\n\n" + (variation.hashtags || []).map((t) => "#" + t).join(" ");

  const pexelsUrl = "https://www.pexels.com/search/" + encodeURIComponent(theme);
  const pixabayUrl = "https://pixabay.com/videos/search/" + encodeURIComponent(theme);
  const mixkitUrl = "https://mixkit.co/free-stock-video/" + encodeURIComponent(theme);

  return (
    <div className="glass-card rounded-[var(--radius)] overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 0.08}s` }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center text-white text-sm font-bold shadow-md shadow-[var(--primary)]/15">
            {index + 1}
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm leading-tight">{variation.headline}</p>
            {variation.objective_foco && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/20 text-[var(--accent-orange)] text-[10px] font-semibold">
                {variation.objective_foco.includes("Vendas") && "🎯"}
                {variation.objective_foco.includes("Seguidores") && "👥"}
                {variation.objective_foco.includes("Viralizar") && "🚀"}
                {variation.objective_foco.includes("Engajamento") && "💬"}
                {!variation.objective_foco.match(/Vendas|Seguidores|Viralizar|Engajamento/) && "🎯"}
                Foco: {variation.objective_foco}
              </span>
            )}
            {!variation.objective_foco && (
              <p className="text-[var(--text-secondary)] text-xs truncate max-w-[280px] mt-0.5">{variation.hook}</p>
            )}
            {variation.objective_foco && (
              <p className="text-[var(--text-secondary)] text-xs truncate max-w-[280px] mt-0.5">{variation.hook}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono hidden sm:block">
            {variation.hashtags?.length || 0} hashtags
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
          {/* 4-Block Copy */}
          <div className="pt-3 space-y-2">
            <CopyBox label="Hook (Gancho)" text={variation.hook} icon={Target} accent="#ec4899" />
            <CopyBox label="Dor (Problema)" text={variation.dor} icon={Zap} accent="#f59e0b" />
            <CopyBox label="Desejo (Solucao)" text={variation.desejo} icon={Sparkles} accent="#8b5cf6" />
            <CopyBox label="CTA (Chamada)" text={variation.cta} icon={Megaphone} accent="#10b981" />
          </div>

          {/* Headline & Caption */}
          <CopyBox label="Headline" text={variation.headline} icon={Target} accent="#06b6d4" />
          <CopyBox label="Legenda SEO + Hashtags" text={fullCaption} icon={Megaphone} accent="#ec4899" />

          {/* Scene Direction */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Clapperboard className="w-3.5 h-3.5 text-[var(--accent-orange)]" />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Direcao de Cena</span>
            </div>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{variation.scene_direction}</p>
          </div>

          {/* B-Rolls */}
          {variation.brolls && variation.brolls.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Film className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Sugestoes de B-Roll</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variation.brolls.map((broll, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-[8px] bg-[var(--accent-cyan)]/8 border border-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] text-xs">
                    {broll}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resource Links */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Film className="w-3.5 h-3.5 text-[var(--accent-green)]" />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Links de Apoio Gratis</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={pexelsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--accent-green)]/8 border border-[var(--accent-green)]/15 text-[var(--accent-green)] text-xs font-medium hover:bg-[var(--accent-green)]/15 transition-colors"
              >
                Pexels <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={pixabayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--accent-cyan)]/8 border border-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] text-xs font-medium hover:bg-[var(--accent-cyan)]/15 transition-colors"
              >
                Pixabay <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={mixkitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--primary)]/8 border border-[var(--primary)]/15 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/15 transition-colors"
              >
                Mixkit <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
