"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Film,
  Hash,
  Clapperboard,
  Library,
  ExternalLink,
  Zap,
  AlertCircle,
  Lightbulb,
  Megaphone,
} from "lucide-react";

export interface Roteiro {
  titulo: string;
  estrutura: {
    hook: string;
    dor: string;
    solucao: string;
    cta: string;
  };
  seo: {
    headline: string;
    descricao: string;
    hashtags: string[];
  };
  gravacao: {
    comoGravar: string;
    bRoll: string;
    musica: string;
  };
  recursos: {
    palavrasChave: string[];
  };
}

const bancoRecursos = [
  {
    categoria: "Imagens / Vídeos",
    itens: [
      { nome: "Pexels", url: "https://www.pexels.com/pt-br/" },
      { nome: "Unsplash", url: "https://unsplash.com/" },
      { nome: "Coverr", url: "https://coverr.co/" },
    ],
  },
  {
    categoria: "GIFs",
    itens: [
      { nome: "Giphy", url: "https://giphy.com/" },
      { nome: "Tenor", url: "https://tenor.com/" },
    ],
  },
  {
    categoria: "Áudio / Música",
    itens: [
      { nome: "Pixabay Audio", url: "https://pixabay.com/music/" },
      {
        nome: "YouTube Audio Library",
        url: "https://www.youtube.com/audiolibrary",
      },
    ],
  },
];

function CopyButton({
  text,
  label = "Copiar",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
          <span className="text-[var(--accent-green)]">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span className="text-[var(--text-secondary)]">{label}</span>
        </>
      )}
    </button>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
        {value}
      </p>
    </div>
  );
}

function BlockHeader({
  icon: Icon,
  title,
  copyText,
  copyLabel,
  color,
}: {
  icon: React.ElementType;
  title: string;
  copyText: string;
  copyLabel: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4" style={{ color }} />
        {title}
      </h4>
      <CopyButton text={copyText} label={copyLabel} />
    </div>
  );
}

export default function ScriptCard({
  roteiro,
  index,
  total,
}: {
  roteiro: Roteiro;
  index: number;
  total: number;
}) {
  const { estrutura, seo, gravacao, recursos } = roteiro;

  const fullText = `ROTEIRO ${index} DE ${total} — ${roteiro.titulo}

=== ESTRUTURA DO VÍDEO ===
Hook (Gancho 3s): ${estrutura.hook}
A Dor: ${estrutura.dor}
A Solução: ${estrutura.solucao}
CTA: ${estrutura.cta}

=== SEO & LEGENDA ===
Headline: ${seo.headline}
Descrição: ${seo.descricao}
Hashtags: ${seo.hashtags.join(" ")}

=== GUIA DE GRAVAÇÃO & PRODUÇÃO ===
Como gravar: ${gravacao.comoGravar}
B-Roll: ${gravacao.bRoll}
Música/Áudio: ${gravacao.musica}

=== PALAVRAS-CHAVE DE BUSCA ===
${recursos.palavrasChave.join(", ")}`;

  const estruturaText = `Hook (Gancho 3s): ${estrutura.hook}
A Dor: ${estrutura.dor}
A Solução: ${estrutura.solucao}
CTA: ${estrutura.cta}`;

  const seoText = `${seo.headline}

${seo.descricao}

${seo.hashtags.join(" ")}`;

  const gravacaoText = `Como gravar: ${gravacao.comoGravar}
B-Roll: ${gravacao.bRoll}
Música/Áudio: ${gravacao.musica}`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-[var(--primary)]/15 to-[var(--accent-pink)]/15 border-b border-[var(--border)]">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            Roteiro {index} de {total}
          </p>
          <h3 className="font-bold text-base text-balance">{roteiro.titulo}</h3>
        </div>
        <CopyButton text={fullText} label="Copiar Roteiro Completo" />
      </div>

      <div className="p-4 space-y-4">
        {/* Bloco 1: Estrutura do Vídeo */}
        <div>
          <BlockHeader
            icon={Film}
            title="Estrutura do Vídeo"
            copyText={estruturaText}
            copyLabel="Copiar bloco"
            color="var(--primary)"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <Field
              icon={Zap}
              label="Hook (Gancho 3s)"
              value={estrutura.hook}
              color="var(--accent-orange)"
            />
            <Field
              icon={AlertCircle}
              label="A Dor"
              value={estrutura.dor}
              color="var(--accent-red)"
            />
            <Field
              icon={Lightbulb}
              label="A Solução"
              value={estrutura.solucao}
              color="var(--accent-green)"
            />
            <Field
              icon={Megaphone}
              label="CTA"
              value={estrutura.cta}
              color="var(--accent-cyan)"
            />
          </div>
        </div>

        {/* Bloco 2: SEO & Legenda */}
        <div>
          <BlockHeader
            icon={Hash}
            title="SEO & Legenda"
            copyText={seoText}
            copyLabel="Copiar legenda"
            color="var(--accent-cyan)"
          />
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Headline
              </span>
              <p className="text-sm text-[var(--text-primary)] mt-1">
                {seo.headline}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Descrição
              </span>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed mt-1 whitespace-pre-line">
                {seo.descricao}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seo.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] text-xs font-medium"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bloco 3: Guia de Gravação & Produção */}
        <div>
          <BlockHeader
            icon={Clapperboard}
            title="Guia de Gravação & Produção"
            copyText={gravacaoText}
            copyLabel="Copiar guia"
            color="var(--accent-pink)"
          />
          <div className="grid gap-2">
            <Field
              icon={Clapperboard}
              label="Como Gravar"
              value={gravacao.comoGravar}
              color="var(--accent-pink)"
            />
            <Field
              icon={Film}
              label="Sugestão de B-Roll"
              value={gravacao.bRoll}
              color="var(--primary)"
            />
            <Field
              icon={Zap}
              label="Música / Áudio de Fundo"
              value={gravacao.musica}
              color="var(--accent-orange)"
            />
          </div>
        </div>

        {/* Bloco 4: Banco de Recursos Recomendados */}
        <div>
          <h4 className="font-semibold flex items-center gap-2 text-sm mb-3">
            <Library className="w-4 h-4 text-[var(--accent-green)]" />
            Banco de Recursos Recomendados
          </h4>

          {recursos.palavrasChave?.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Palavras-chave para buscar mídia
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recursos.palavrasChave.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-2">
            {bancoRecursos.map((grupo) => (
              <div
                key={grupo.categoria}
                className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
              >
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  {grupo.categoria}
                </p>
                <div className="flex flex-col gap-1.5">
                  {grupo.itens.map((item) => (
                    <a
                      key={item.nome}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
                    >
                      {item.nome}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
