"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Palette,
  Upload,
  ImageIcon,
  Wand2,
  Loader2,
  Download,
  Copy,
  Check,
  Trash2,
  Video,
  MessageSquareText,
} from "lucide-react";
import { useBrandStore } from "@/lib/branding/brand-store";
import {
  detectLogoBackground,
  removeLogoSolidBackground,
} from "@/lib/branding/logoProcessor";
import { searchPhotos, fetchImageAsDataUrl } from "@/lib/branding/photoSearch";
import type { PhotoResult } from "@/lib/branding/photoSearch";
import { renderPostArtDataUrl } from "@/lib/branding/renderArt";
import { renderCompletePostImage } from "@/lib/branding/renderCompletePost";
import type { ContentPostItem } from "@/data/contentMatrixTemplates";
import { buildSeoCaption } from "@/utils/seoHelper";
import { getSeoHashtags } from "@/utils/seoHelper";

type Aspect = "1:1" | "4:5" | "9:16";

const ASPECT_SIZES: Record<Aspect, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });

interface BrandStudioProps {
  posts: ContentPostItem[];
  nicho: string;
}

export default function BrandStudio({ posts, nicho }: BrandStudioProps) {
  const router = useRouter();
  const {
    primary,
    secondary,
    accent,
    tolerance,
    handle,
    logoUrl,
    logoOriginalUrl,
    logoName,
    photoUrl,
    photoCredit,
    setBrandColors,
    setTolerance,
    setHandle,
    setLogo,
    setLogoTransparent,
    setPhoto,
    resetBrand,
  } = useBrandStore();

  const [busy, setBusy] = useState<"logo" | "photo" | null>(null);
  const [detectedColor, setDetectedColor] = useState<string | null>(null);
  const [photoQuery, setPhotoQuery] = useState(nicho);
  const [photoResults, setPhotoResults] = useState<PhotoResult[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("4:5");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [arts, setArts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});

  const size = ASPECT_SIZES[aspect];

  const hashtags = useMemo(() => getSeoHashtags(nicho), [nicho]);

  const captions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const post of posts) {
      map[post.id] = buildSeoCaption({
        hook: post.hook,
        body: post.scriptOutline,
        callToAction: post.callToAction,
        hashtags,
      });
    }
    return map;
  }, [posts, hashtags]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBusy("logo");
    try {
      const original = await fileToDataUrl(file);
      const bg = await detectLogoBackground(original);
      setDetectedColor(bg);
      const transparent = await removeLogoSolidBackground(original, { tolerance });
      setLogo(original, transparent, file.name);
    } catch {
      alert("Não foi possível processar a logo.");
    } finally {
      setBusy(null);
    }
  };

  const handleToleranceChange = async (value: number) => {
    setTolerance(value);
    if (!logoOriginalUrl) return;
    try {
      const transparent = await removeLogoSolidBackground(logoOriginalUrl, {
        tolerance: value,
      });
      setLogoTransparent(transparent);
    } catch {
      /* mantém a versão atual em caso de erro */
    }
  };

  const handleSearchPhotos = async () => {
    const query = (photoQuery || nicho).trim();
    if (!query) {
      alert("Informe um termo para buscar as fotos (usa o nicho por padrão).");
      return;
    }
    setPhotoLoading(true);
    setPhotoResults([]);
    try {
      const results = await searchPhotos(query, 8);
      setPhotoResults(results);
    } catch {
      alert("Não foi possível buscar fotos. Verifique sua conexão e tente novamente.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSelectPhoto = async (result: PhotoResult) => {
    setBusy("photo");
    try {
      const dataUrl = await fetchImageAsDataUrl(result.thumbUrl);
      setPhoto(dataUrl, `${result.title} — ${result.creator} (${result.license})`);
    } catch {
      alert("Não foi possível carregar a foto selecionada.");
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateArts = async () => {
    if (posts.length === 0) return;
    setGenerating(true);
    setProgress(0);
    const results: Record<string, string> = {};
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      try {
        if (aspect === "1:1") {
          results[post.id] = await renderCompletePostImage(
            post.hook,
            photoUrl || "",
            {
              handle,
              primaryColor: primary,
              secondaryColor: "#ffffff",
              accentColor: accent,
              logoDataUrl: logoUrl || undefined,
            },
            post.dayNumber,
            post.pillarLabel
          );
        } else {
          results[post.id] = await renderPostArtDataUrl({
            width: size.width,
            height: size.height,
            background: photoUrl,
            primary,
            secondary,
            accent,
            logoUrl,
            hook: post.hook,
            dayNumber: post.dayNumber,
            pillarLabel: post.pillarLabel,
            format: post.format,
            callToAction: post.callToAction,
            brandName: "NEXIA VIDEO",
          });
        }
      } catch {
        results[post.id] = "";
      }
      setProgress(Math.round(((i + 1) / posts.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setArts(results);
    setGenerating(false);
  };

  const downloadArt = (dataUrl: string, day: number, pillar: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `nexia-dia-${day}-${pillar}.png`;
    a.click();
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  const toggleCaption = (id: string) => {
    setExpandedCaptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const artCount = Object.keys(arts).filter((id) => arts[id]).length;

  return (
    <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-[var(--accent-pink)]" />
        <h2 className="text-lg font-bold text-white">Marca &amp; Artes Visuais</h2>
        <span className="text-[11px] text-gray-500 ml-auto">
          Identidade + capas prontas + legendas com SEO
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cores da marca */}
        <div className="bg-[#252535] border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--primary)]" /> Cores da marca
          </p>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="block text-[11px] text-gray-400 mb-1">Primária</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setBrandColors({ primary: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <span className="text-[11px] text-gray-300 font-mono uppercase">{primary}</span>
              </div>
            </label>
            <label className="flex-1">
              <span className="block text-[11px] text-gray-400 mb-1">Secundária</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setBrandColors({ secondary: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <span className="text-[11px] text-gray-300 font-mono uppercase">{secondary}</span>
              </div>
            </label>
            <label className="flex-1">
              <span className="block text-[11px] text-gray-400 mb-1">Destaque</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setBrandColors({ accent: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <span className="text-[11px] text-gray-300 font-mono uppercase">{accent}</span>
              </div>
            </label>
          </div>
          <label className="block">
            <span className="block text-[11px] text-gray-400 mb-1">@ da marca (rodapé da arte 1:1)</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@seumarca"
              className="w-full px-3 py-2 rounded-lg bg-[#1c1c28] border border-gray-700 text-white text-xs placeholder-gray-500 focus:border-[var(--primary)] outline-none"
            />
          </label>
        </div>

        {/* Logo com remoção de fundo */}
        <div className="bg-[#252535] border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-[var(--primary)]" /> Logo (fundo removido)
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <span className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-600 text-xs text-gray-300 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer">
                {busy === "logo" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> {logoName || "Enviar logo"}
                  </>
                )}
              </span>
            </label>
            {logoUrl && (
              <button
                onClick={() => {
                  resetBrand();
                  setDetectedColor(null);
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                title="Remover logo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {logoUrl && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg overflow-hidden bg-black/40 p-2 flex flex-col items-center gap-1">
                  <img
                    src={logoOriginalUrl || ""}
                    alt="Logo original"
                    className="max-h-16 object-contain"
                  />
                  <span className="text-[9px] text-gray-500">Original</span>
                </div>
                <div className="rounded-lg overflow-hidden bg-[repeating-conic-gradient(#1a1a2a_0%_25%,#0d0d16_0%_50%)] bg-[length:12px_12px] p-2 flex flex-col items-center gap-1">
                  <img src={logoUrl} alt="Logo sem fundo" className="max-h-16 object-contain" />
                  <span className="text-[9px] text-gray-500">
                    Sem fundo{" "}
                    {detectedColor ? (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: detectedColor }}
                        />
                        {detectedColor}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Tolerância do recorte: {tolerance}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tolerance}
                  onChange={(e) => handleToleranceChange(Number(e.target.value))}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            </>
          )}
        </div>

        {/* Foto de fundo */}
        <div className="bg-[#252535] border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--primary)]" /> Foto de fundo
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={photoQuery}
              onChange={(e) => setPhotoQuery(e.target.value)}
              placeholder={nicho || "Buscar fotos por tema..."}
              className="flex-1 px-3 py-2 rounded-lg bg-[#1c1c28] border border-gray-700 text-white text-xs placeholder-gray-500 focus:border-[var(--primary)] outline-none"
            />
            <button
              onClick={handleSearchPhotos}
              disabled={photoLoading}
              className="px-3 py-2 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/25 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {photoLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Buscar
            </button>
          </div>

          {photoResults.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {photoResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectPhoto(r)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-[var(--primary)] transition-colors group"
                  title={r.title}
                >
                  <img
                    src={r.thumbUrl}
                    alt={r.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {busy === "photo" && (
                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/20 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {photoUrl && (
            <div className="flex items-center gap-3">
              <img
                src={photoUrl}
                alt="Foto selecionada"
                className="w-14 h-14 rounded-lg object-cover border border-gray-700"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 truncate">
                  {photoCredit || "Foto selecionada"}
                </p>
                <button
                  onClick={() => setPhoto("", "")}
                  className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Geração das artes */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[#252535] border border-gray-800 rounded-lg p-1">
          {(Object.keys(ASPECT_SIZES) as Aspect[]).map((a) => (
            <button
              key={a}
              onClick={() => setAspect(a)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                aspect === a ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerateArts}
          disabled={generating || posts.length === 0}
          className="flex-1 min-w-[220px] py-3 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando artes... {progress}%
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Gerar Artes dos {posts.length > 0 ? posts.length : 30} Posts
            </>
          )}
        </button>

        {posts.length === 0 && (
          <p className="text-[11px] text-gray-500 w-full">
            Gere o calendário acima para habilitar a criação das artes.
          </p>
        )}
      </div>

      {generating && (
        <div className="h-2 rounded-full bg-[#252535] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Grade de artes geradas com ações completas */}
      {Object.keys(arts).length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-medium text-white">
              Posts prontos <span className="text-gray-500">({artCount}/{posts.length})</span>
            </p>
            <button
              onClick={() =>
                copyText(
                  posts.map((p) => captions[p.id]).join("\n\n— — —\n\n"),
                  "copy-all-captions"
                )
              }
              className="text-[11px] text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              title="Copiar todas as legendas em sequência"
            >
              {copiedId === "copy-all-captions" ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Copiar todas as legendas
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {posts.map((post) => {
              const dataUrl = arts[post.id];
              if (!dataUrl) return null;
              const caption = captions[post.id];
              const expanded = !!expandedCaptions[post.id];
              const cut = expanded ? caption : caption.split("\n").slice(0, 4).join("\n") + "...";
              return (
                <div
                  key={post.id}
                  className="bg-[#252535] border border-gray-800 rounded-xl overflow-hidden flex flex-col"
                >
                  <img
                    src={dataUrl}
                    alt={`Arte do dia ${post.dayNumber}`}
                    className="w-full object-cover"
                  />
                  <div className="p-2.5 flex flex-col gap-2 flex-1">
                    <span className="text-[10px] text-gray-400 font-semibold">
                      Dia {post.dayNumber} · {post.pillarLabel}
                    </span>
                    <button
                      onClick={() => toggleCaption(post.id)}
                      className="text-left text-[10px] leading-relaxed text-gray-300 whitespace-pre-wrap line-clamp-5 hover:text-white transition-colors"
                      title="Clique para ver a legenda completa"
                    >
                      {cut}
                    </button>

                    <div className="flex flex-col gap-1.5 mt-auto">
                      <button
                        onClick={() => downloadArt(dataUrl, post.dayNumber, post.pillar)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--primary)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Imagem (PNG)
                      </button>
                      <button
                        onClick={() => copyText(caption, `${post.id}-caption`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1c1c28] border border-gray-700 text-gray-300 text-[11px] font-semibold hover:text-white hover:border-gray-500 transition-colors"
                      >
                        {copiedId === `${post.id}-caption` ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <MessageSquareText className="w-3.5 h-3.5" />
                        )}
                        Copiar Legenda
                      </button>
                      <button
                        onClick={() => router.push(`/editor?hook=${encodeURIComponent(post.hook)}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-700/30 border border-gray-700 text-gray-300 text-[11px] font-semibold hover:bg-[var(--accent-pink)]/20 hover:text-white transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Criar Vídeo no Editor
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}