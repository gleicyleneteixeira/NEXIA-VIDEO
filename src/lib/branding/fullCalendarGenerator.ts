/**
 * Fábrica de posts completos: pega o calendário de 30 posts gerado offline,
 * renderiza a arte de cada post via Canvas (renderCompletePostImage), anexa a
 * pré-visualização (`previewImageUrl`) e monta a legenda com estrutura de SEO
 * (gancho + corpo + CTA + hashtags do nicho).
 */

import type { ContentPostItem } from "@/data/contentMatrixTemplates";
import { renderCompletePostImage } from "@/lib/branding/renderCompletePost";
import type { BrandStyleConfig } from "@/lib/branding/renderCompletePost";
import { buildSeoCaption, getSeoHashtags } from "@/utils/seoHelper";

export interface FullPostGeneratorOptions {
  posts: ContentPostItem[];
  niche: string;
  brand: BrandStyleConfig;
  bgPhotoUrl?: string;
  /** Callback de progresso de 0 a 100. */
  onProgress?: (progress: number) => void;
}

/**
 * Renderiza a arte 1080×1080 e monta a legenda SEO de um post.
 * Retorna uma cópia do post com `previewImageUrl` e `caption` atualizadas.
 */
export async function attachArtworkToPost(
  post: ContentPostItem,
  income: { niche: string; brand: BrandStyleConfig; bgPhotoUrl?: string }
): Promise<ContentPostItem> {
  const previewImageUrl = await renderCompletePostImage(
    post.hook,
    income.bgPhotoUrl || "",
    income.brand,
    post.dayNumber,
    post.pillarLabel,
    post.scriptOutline
  );
  const hashtags = getSeoHashtags(income.niche);
  const caption = buildSeoCaption({
    hook: post.hook,
    body: post.scriptOutline,
    callToAction: post.callToAction,
    hashtags,
  });
  return { ...post, previewImageUrl, caption };
}

/**
 * Gera o calendário completo processando os posts em sequência (um por frame)
 * para manter a UI responsiva. Quando não há brand, devolve os posts originais.
 */
export async function generateFullCalendarWithImages(
  options: FullPostGeneratorOptions
): Promise<ContentPostItem[]> {
  const { posts, niche, brand, bgPhotoUrl, onProgress } = options;
  const total = posts.length;
  const result: ContentPostItem[] = [];

  for (let i = 0; i < total; i++) {
    const post = posts[i];
    try {
      result.push(await attachArtworkToPost(post, { niche, brand, bgPhotoUrl }));
    } catch {
      result.push(post);
    }
    onProgress?.(Math.round(((i + 1) / total) * 100));
    // Cede a vez ao browser entre os renders pesados.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return result;
}