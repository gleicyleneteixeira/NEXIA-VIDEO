"use client";

import { useState } from "react";
import { Copy, Check, Target, Zap, Sparkles, Megaphone, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Variation } from "@/components/ContentCard";

interface FragmentedViewProps {
  variations: Variation[];
}

interface BlockItemProps {
  index: number;
  text: string;
  accent: string;
  icon: React.ElementType;
  label: string;
}

function BlockItem({ index, text, accent, icon: Icon, label }: BlockItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 group/item hover:border-[var(--border)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white" style={{ background: accent }}>
            {index + 1}
          </span>
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors opacity-0 group-hover/item:opacity-100"
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
      <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{text}</p>
    </div>
  );
}

function BlockSection({ title, emoji, items, accent, icon }: {
  title: string;
  emoji: string;
  items: { text: string; index: number }[];
  accent: string;
  icon: React.ElementType;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="glass-card rounded-[var(--radius)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <div className="text-left">
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">{items.length} blocos para gravar em lote</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{items.length}x</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
          {items.map((item) => (
            <BlockItem
              key={item.index}
              index={item.index}
              text={item.text}
              accent={accent}
              icon={icon}
              label={`${title.replace(/s$/, "")} ${item.index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FragmentedView({ variations }: FragmentedViewProps) {
  const hooks = variations.map((v, i) => ({ text: v.hook, index: i }));
  const ctas = variations.map((v, i) => ({ text: v.cta, index: i }));

  // Modo 3 blocos (Gancho / Desenvolvimento / CTA) — estrutura moderna.
  if (variations.some((v) => !!v.development)) {
    const developments = variations.map((v, i) => ({
      text: v.development || "",
      index: i,
    }));
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)] animate-pulse" />
          <p className="text-xs text-[var(--text-secondary)]">
            Modo fragmentado: grave os 3 blocos de cada tipo de uma vez para acelerar a producao
          </p>
        </div>
        <BlockSection
          title="Todos os GANCHOS / HOOKS"
          emoji="🎯"
          items={hooks}
          accent="#ec4899"
          icon={Target}
        />
        <BlockSection
          title="Todos os DESENVOLVIMENTOS (Dor + Solução)"
          emoji="💡"
          items={developments}
          accent="#8b5cf6"
          icon={Lightbulb}
        />
        <BlockSection
          title="Todas as CTAs (Chamadas para Ação)"
          emoji="📢"
          items={ctas}
          accent="#10b981"
          icon={Megaphone}
        />
      </div>
    );
  }

  // Fallback para conteúdo legado (4 blocos: Hook / Dor / Desejo / CTA).
  const dores = variations.map((v, i) => ({ text: v.dor || "", index: i }));
  const desejos = variations.map((v, i) => ({ text: v.desejo || "", index: i }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)] animate-pulse" />
        <p className="text-xs text-[var(--text-secondary)]">
          Modo fragmentado: grave todos os blocos de cada tipo de uma vez para acelerar a producao
        </p>
      </div>
      <BlockSection
        title="Todos os HOOKS"
        emoji="🎯"
        items={hooks}
        accent="#ec4899"
        icon={Target}
      />
      <BlockSection
        title="Todas as DORES"
        emoji="⚡"
        items={dores}
        accent="#f59e0b"
        icon={Zap}
      />
      <BlockSection
        title="Todos os DESEJOS"
        emoji="✨"
        items={desejos}
        accent="#8b5cf6"
        icon={Sparkles}
      />
      <BlockSection
        title="Todas as CTAs"
        emoji="📢"
        items={ctas}
        accent="#10b981"
        icon={Megaphone}
      />
    </div>
  );
}
