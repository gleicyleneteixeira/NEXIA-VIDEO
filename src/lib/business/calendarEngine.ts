"use client";

/**
 * Motor do calendário editorial de 30 dias da fábrica de posts.
 * Gera os posts a partir do DNA do negócio, monta a legenda com SEO e
 * renderiza a arte de cada post usando o PostCardRenderer.
 */

import type { BrandIdentity, BusinessProfile, StudioPost } from "./types";
import { generateOfflineCalendar } from "@/data/contentMatrixTemplates";
import { buildSeoCaption, getSeoHashtags } from "@/utils/seoHelper";
import { renderPostArtwork } from "./postCardRenderer";
import { generateId } from "@/lib/editor";

export interface CalendarEngineOptions {
  business: BusinessProfile;
  brand: BrandIdentity;
  bgPhotoUrl?: string;
  onProgress?: (progress: number) => void;
}

const NICHES_KEYWORDS: Record<string, string[]> = {
  bancario: ["finanças", "dinheiro", "crédito"],
  imobiliaria: ["imóveis", "casa", "apartamento"],
  advocacia: ["direito", "advogado", "jurídico"],
  saude: ["saúde", "bem-estar", "qualidade de vida"],
  marketing: ["marketing digital", "conteúdo", "vendas"],
  fitness: ["academia", "treino", "saúde"],
  beleza: ["beleza", "estética", "cuidados"],
  moda: ["moda", "estilo", "roupas"],
};

/**
 * Deriva um termo de busca de foto a partir do nicho informado.
 */
export function photoSearchTerm(nicho: string): string {
  const clean = nicho.toLowerCase().trim();
  if (!clean) return "negocios";
  for (const [key, terms] of Object.entries(NICHES_KEYWORDS)) {
    if (clean.includes(key)) return terms[0];
  }
  return clean.split(" ")[0];
}

/**
 * Gera a data de publicação a partir de hoje (ou da data base).
 */
const postDate = (today: Date, dayIndex: number): string => {
  const d = new Date(today);
  d.setDate(today.getDate() + dayIndex);
  return d.toISOString().split("T")[0];
};

/**
 * Gera o calendário de 30 posts com arte, legenda SEO e variação alternativa.
 */
export async function generateCalendarWithImages(
  options: CalendarEngineOptions
): Promise<StudioPost[]> {
  const { business, brand, bgPhotoUrl, onProgress } = options;
  const today = new Date();

  const base = generateOfflineCalendar({
    nicho: business.nicho,
    servico: business.servico,
    beneficio: business.beneficio,
    dor: business.dores,
    startDate: today,
  });

  const hashtags = getSeoHashtags(business.nicho || business.servico);
  const posts: StudioPost[] = [];

  for (let i = 0; i < base.length; i++) {
    const tpl = base[i];
    const caption = buildSeoCaption({
      hook: tpl.hook,
      body: tpl.scriptOutline,
      callToAction: tpl.callToAction,
      hashtags,
    });

    let previewImageUrl: string | undefined;
    try {
      previewImageUrl = await renderPostArtwork({
        hook: tpl.hook,
        body: tpl.scriptOutline,
        bgPhotoUrl,
        brand,
        dayNumber: tpl.dayNumber,
        pillar: tpl.pillarLabel,
      });
    } catch {
      previewImageUrl = undefined;
    }

    posts.push({
      id: generateId(),
      dayNumber: tpl.dayNumber,
      scheduledDate: postDate(today, i),
      pillar: tpl.pillar,
      pillarLabel: tpl.pillarLabel,
      format: tpl.format,
      hook: tpl.hook,
      scriptOutline: tpl.scriptOutline,
      caption,
      callToAction: tpl.callToAction,
      previewImageUrl,
      status: "pendente",
      favorite: false,
    });

    onProgress?.(Math.round(((i + 1) / base.length) * 100));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return posts;
}

/**
 * Gera uma variação alternativa da legenda (hook + corpo + CTA + hashtags).
 * Alterna entre o corpo educativo e o de venda.
 */
export function generateCaptionVariation(
  post: StudioPost,
  business: BusinessProfile
): string {
  const hashtags = getSeoHashtags(business.nicho || business.servico);
  const body = post.scriptOutline;

  const variationBody =
    post.pillar === "venda"
      ? `${body} Quem aplica isso na prática sente a diferença já nos primeiros dias.`
      : `Se você sente ${business.dores || "esse problema"}, a boa notícia é que ${business.beneficio || "os resultados"} estão mais perto do que imagina.`;

  return buildSeoCaption({
    hook: post.hook,
    body: variationBody,
    callToAction: post.callToAction,
    hashtags,
  });
}
