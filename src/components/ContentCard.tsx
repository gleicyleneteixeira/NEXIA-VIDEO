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
  Loader2,
  Lightbulb,
} from "lucide-react";
import { getStockSearchKeywords, buildStockMediaUrls } from "@/utils/stockSearchHelper";

export interface Variation {
  hook: string;
  dor?: string;
  desejo?: string;
  painOrDesire?: string;
  pain?: string;
  solution?: string;
  development?: string;
  benefit?: string;
  isExactRemodel?: boolean;
  fullScriptText?: string;
  cta: string;
  headline: string;
  caption: string;
  seoCaption?: string;
  hashtags: string[];
  scene_direction: string;
  brolls: string[];
  objective_foco?: string;
  angleName?: string;
}

interface ContentCardProps {
  index: number;
  variation: Variation;
  theme: string;
  isPolishing?: boolean;
  onSendToTimeline?: (variation: Variation, index: number) => void;
  onPolish?: (variation: Variation, index: number) => void;
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

export default function ContentCard({
  index,
  variation,
  theme,
  isPolishing,
  onSendToTimeline,
  onPolish,
}: ContentCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [copiedScript, setCopiedScript] = useState(false);

  const fullCaption =
    (variation.seoCaption || variation.caption || "").trim() +
    (variation.hashtags && variation.hashtags.length > 0
      ? "\n\n" + variation.hashtags.map((t) => "#" + t).join(" ")
      : "");

  const handleCopyScript = () => {
    navigator.clipboard.writeText(fullCaption);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const stockKeywords = getStockSearchKeywords(variation.brolls?.[0], theme);
  const stockUrls = buildStockMediaUrls(stockKeywords);
  const pexelsUrl = stockUrls.pexels;
  const pixabayUrl = stockUrls.pixabay;
  const mixkitUrl = stockUrls.mixkit;

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

      {/* Action Bar */}
      {(variation.angleName || onSendToTimeline || onPolish) && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border-subtle)] flex-wrap bg-[var(--surface)]/40">
          {variation.angleName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-semibold">
              <Zap className="w-3 h-3" />
              {variation.angleName}
            </span>
          )}
          <div className="flex-1 min-w-[8px]" />
          {onSendToTimeline && (
            <button
              onClick={() => onSendToTimeline(variation, index)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] text-[11px] font-semibold hover:bg-[var(--accent-cyan)]/20 transition-colors"
              title="Injetar falas e b-rolls na timeline do editor"
            >
              <Clapperboard className="w-3.5 h-3.5" />
              Enviar ao Editor
            </button>
          )}
          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-semibold hover:text-white hover:border-[var(--border)] transition-colors"
            title="Copiar roteiro completo com hashtags"
          >
            {copiedScript ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                <span className="text-[var(--accent-green)]">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Roteiro
              </>
            )}
          </button>
          {onPolish && (
            <button
              onClick={() => onPolish(variation, index)}
              disabled={isPolishing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              title="Refinar apenas esta variacao com IA"
            >
              {isPolishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Polindo...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Polir com IA
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
          {/* Matriz de Blocos Intercambiáveis */}
          <div className="pt-3 space-y-2">
            {variation.isExactRemodel && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/25 text-[var(--accent-green)] text-[11px] font-semibold">
                <Check className="w-3.5 h-3.5" />
                Gancho Original Preservado (Remodelagem Fiel)
              </div>
            )}
            <CopyBox label="[GANCHO] · Slot 1 (Hook)" text={variation.hook} icon={Target} accent="#ec4899" />
            {variation.painOrDesire || variation.solution ? (
              <>
                {variation.painOrDesire && (
                  <CopyBox
                    label="[DOR] · Slot 2"
                    text={variation.painOrDesire}
                    icon={Zap}
                    accent="#f59e0b"
                  />
                )}
                {variation.solution && (
                  <CopyBox
                    label="[SOLUÇÃO] · Slot 3"
                    text={variation.solution}
                    icon={Lightbulb}
                    accent="#8b5cf6"
                  />
                )}
              </>
            ) : variation.development ? (
              <CopyBox
                label="[DESENVOLVIMENTO]"
                text={variation.development}
                icon={Lightbulb}
                accent="#8b5cf6"
              />
            ) : (
              <>
                {variation.dor && (
                  <CopyBox label="[DOR] · Problema" text={variation.dor} icon={Zap} accent="#f59e0b" />
                )}
                {variation.desejo && (
                  <CopyBox label="[DESEJO] · Solução" text={variation.desejo} icon={Sparkles} accent="#8b5cf6" />
                )}
              </>
            )}
            {variation.benefit && (
              <CopyBox
                label="[BENEFÍCIO] · Transformação"
                text={variation.benefit}
                icon={Sparkles}
                accent="#06b6d4"
              />
            )}
            <CopyBox label="[CTA] · Slot 4 (Chamada)" text={variation.cta} icon={Megaphone} accent="#10b981" />
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
