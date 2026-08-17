/**
 * Tipos centrais do módulo de Negócio + Identidade + Fábrica de Posts.
 */

export type PostStatus = "pendente" | "editando" | "agendado" | "publicado" | "favorito";

/** DNA da empresa: sobre, público, dores e objetivos. */
export interface BusinessProfile {
  sobre: string;
  publicoAlvo: string;
  dores: string;
  objetivos: string;
  nicho: string;
  servico: string;
  beneficio: string;
}

/** Identidade visual: cores, fonte, logo transparente e @ do Instagram. */
export interface BrandIdentity {
  primaryColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  handle: string;
  tolerance: number;
  logoDataUrl?: string;
  logoOriginalUrl?: string;
  logoName?: string;
  /** Foto de estoque escolhida como fundo das artes. */
  bgPhotoUrl?: string;
  bgPhotoCredit?: string;
}

/** Post do calendário com status, favorito, arte e legendas. */
export interface StudioPost {
  id: string;
  dayNumber: number;
  scheduledDate: string;
  pillar: string;
  pillarLabel: string;
  format: string;
  hook: string;
  scriptOutline: string;
  caption: string;
  callToAction: string;
  previewImageUrl?: string;
  status: PostStatus;
  favorite: boolean;
}

/** Perfil de conta (negócio + identidade + posts). */
export interface StudioProfile {
  id: string;
  name: string;
  business: BusinessProfile;
  brand: BrandIdentity;
  posts: StudioPost[];
}

export const DEFAULT_BUSINESS: BusinessProfile = {
  sobre: "",
  publicoAlvo: "",
  dores: "",
  objetivos: "",
  nicho: "",
  servico: "",
  beneficio: "",
};

export const DEFAULT_BRAND: BrandIdentity = {
  primaryColor: "#8b5cf6",
  textColor: "#ffffff",
  accentColor: "#ec4899",
  fontFamily: "Inter",
  handle: "@nexia.video",
  tolerance: 35,
};

export const PRESET_THEMES: { name: string; primary: string; text: string; accent: string }[] = [
  { name: "Roxo Neon", primary: "#8b5cf6", text: "#ffffff", accent: "#ec4899" },
  { name: "Violeta Profundo", primary: "#0F172A", text: "#FFFFFF", accent: "#38BDF8" },
  { name: "Verde Escala", primary: "#064e3b", text: "#ffffff", accent: "#34d399" },
  { name: "Laranja Energia", primary: "#431407", text: "#ffffff", accent: "#fb923c" },
  { name: "Azul Corporativo", primary: "#0c4a6e", text: "#ffffff", accent: "#facc15" },
  { name: "Rosa Claro", primary: "#831843", text: "#ffffff", accent: "#f9a8d4" },
  { name: "Slate Minimalista", primary: "#111827", text: "#ffffff", accent: "#64748b" },
];

export const FONT_FAMILIES = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Roboto",
  "Lato",
  "Oswald",
  "Georgia",
];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  pendente: "Pendente",
  editando: "Em Edição",
  agendado: "Agendado",
  publicado: "Publicado",
  favorito: "Favorito",
};
