"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Wand2,
  RefreshCw,
  Layers,
  Loader2,
} from "lucide-react";
import {
  generateOfflineCalendar,
  EDITORIAL_PILLARS,
  CONTENT_PILLARS_ORDER,
} from "@/data/contentMatrixTemplates";
import type { ContentPostItem, EditorialPillar } from "@/data/contentMatrixTemplates";
import BrandStudio from "@/components/calendar/BrandStudio";
import PostCardItem from "@/components/calendar/PostCardItem";
import { generateFullCalendarWithImages } from "@/lib/branding/fullCalendarGenerator";
import { useBrandStore } from "@/lib/branding/brand-store";
import { setPendingPostImport } from "@/lib/editor/pendingPost";

type PillarFilter = EditorialPillar | "all";

export default function CalendarPage() {
  const router = useRouter();
  const [nicho, setNicho] = useState("");
  const [servico, setServico] = useState("");
  const [beneficio, setBeneficio] = useState("");
  const [dor, setDor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [posts, setPosts] = useState<ContentPostItem[] | null>(null);
  const [filter, setFilter] = useState<PillarFilter>("all");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    const generated = generateOfflineCalendar({
      nicho,
      servico,
      beneficio,
      dor,
      startDate: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
    });

    const brandState = useBrandStore.getState();
    const brand = {
      handle: brandState.handle,
      primaryColor: brandState.primary,
      secondaryColor: "#ffffff",
      accentColor: brandState.accent,
      logoDataUrl: brandState.logoUrl || undefined,
    };

    setGenerating(true);
    setProgress(0);
    setFilter("all");

    const finalPosts = await generateFullCalendarWithImages({
      posts: generated,
      niche: nicho,
      brand,
      bgPhotoUrl: brandState.photoUrl || undefined,
      onProgress: setProgress,
    });

    setPosts(finalPosts);
    setGenerating(false);
  };

  const openInEditor = (post: ContentPostItem) => {
    if (post.previewImageUrl) {
      setPendingPostImport({
        imageDataUrl: post.previewImageUrl,
        hook: post.hook,
        dayNumber: post.dayNumber,
        pillarLabel: post.pillarLabel,
        format: post.format,
      });
    }
    router.push(`/editor?dia=${post.dayNumber}`);
  };

  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!posts) return counts;
    for (const post of posts) {
      counts[post.pillar] = (counts[post.pillar] || 0) + 1;
    }
    return counts;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return filter === "all" ? posts : posts.filter((p) => p.pillar === filter);
  }, [posts, filter]);

  const handleCopyAll = async () => {
    if (!posts) return;
    const text = posts
      .map((p) => `📅 DIA ${p.dayNumber} (${p.scheduledDate}) — ${p.pillarLabel}\n\n${p.caption}`)
      .join("\n\n━━━━━━━━━━━━━━━\n\n");
    await navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">
            Calendário <span className="gradient-text">Editorial</span>
          </h1>
        </div>
        <p className="text-gray-400">
          30 posts prontos em 5 pilares — gerado <strong className="text-gray-200">100% offline</strong>,
          sem depender de APIs de IA.
        </p>
      </div>

      {/* Form (esquerda) + Resumo (direita) */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-white">Dados do seu Conteúdo</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nicho</label>
              <input
                type="text"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                placeholder="Ex: Ginástica, Finanças, Culinária..."
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Serviço / Produto</label>
              <input
                type="text"
                value={servico}
                onChange={(e) => setServico(e.target.value)}
                placeholder="Ex: Curso online, E-book, Consultoria..."
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Benefício</label>
            <input
              type="text"
              value={beneficio}
              onChange={(e) => setBeneficio(e.target.value)}
              placeholder="Ex: Economizar 10h por semana, escalar vendas..."
              className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dor (opcional)</label>
              <input
                type="text"
                value={dor}
                onChange={(e) => setDor(e.target.value)}
                placeholder="Ex: perder tempo, estagnar..."
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data de início (vazio = hoje)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white focus:border-[var(--primary)] outline-none transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando 30 posts com arte e SEO... {progress}%
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Gerar Calendário de 30 Dias
              </>
            )}
          </button>
          {generating && (
            <div className="h-1.5 rounded-full bg-[#252535] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Resumo dos pilares */}
        <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--accent-pink)]" />
            <h2 className="text-lg font-bold text-white">Pilares</h2>
          </div>
          {posts ? (
            CONTENT_PILLARS_ORDER.map((pillar) => (
              <div
                key={pillar}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 bg-[#252535]"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EDITORIAL_PILLARS[pillar].color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{EDITORIAL_PILLARS[pillar].label}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {EDITORIAL_PILLARS[pillar].description}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">
                  {pillarCounts[pillar] ?? 0}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-500 text-sm">
              Preencha os dados e gere o calendário
            </div>
          )}
          {posts && (
            <button
              onClick={handleCopyAll}
              className="mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              Copiar todos os posts
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {posts && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === "all"
                  ? "border-[var(--primary)] bg-[var(--primary)]/15 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              Todos ({posts.length})
            </button>
            {CONTENT_PILLARS_ORDER.map((pillar) => (
              <button
                key={pillar}
                onClick={() => setFilter(pillar)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === pillar
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: EDITORIAL_PILLARS[pillar].color }} />
                {EDITORIAL_PILLARS[pillar].label} ({pillarCounts[pillar] ?? 0})
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <PostCardItem key={post.id} post={post} onOpenVideo={openInEditor} />
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              Nenhum post neste pilar.
            </div>
          )}

          <button
            onClick={() => setPosts(null)}
            className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Gerar novo calendário
          </button>
        </>
      )}

      {/* Motor de branding: cores, logo e geração visual das artes */}
      <div className="mt-8">
        <BrandStudio posts={posts ?? []} nicho={nicho} />
      </div>
    </div>
  );
}