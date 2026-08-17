"use client";

/**
 * Renderizador da arte do post a partir do BrandIdentity do perfil.
 * Delega ao motor Canvas compartilhado (renderCompletePostImage) e devolve
 * a arte final 1080×1080 em dataURL PNG.
 */

import type { BrandIdentity } from "./types";
import { renderCompletePostImage } from "@/lib/branding/renderCompletePost";

export interface PostArtworkOptions {
  hook: string;
  body?: string;
  bgPhotoUrl?: string;
  brand: BrandIdentity;
  dayNumber: number;
  pillar: string;
}

export async function renderPostArtwork(options: PostArtworkOptions): Promise<string> {
  const { hook, body, bgPhotoUrl, brand, dayNumber, pillar } = options;
  return renderCompletePostImage(
    hook,
    bgPhotoUrl || "",
    {
      handle: brand.handle,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.textColor,
      accentColor: brand.accentColor,
      logoDataUrl: brand.logoDataUrl,
    },
    dayNumber,
    pillar,
    body || ""
  );
}
