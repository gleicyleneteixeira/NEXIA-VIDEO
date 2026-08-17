"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Wand2,
  Search,
  ImageIcon,
  RefreshCw,
  Briefcase,
  Palette,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useBusinessStore, persistProfileArts } from "@/lib/business/business-store";
import type { StudioProfile } from "@/lib/business/types";
import {
  generateCalendarWithImages,
  photoSearchTerm,
} from "@/lib/business/calendarEngine";
import { searchPhotos, fetchImageAsDataUrl } from "@/lib/branding/photoSearch";
import StudioNav, { type StudioTab } from "@/components/business/StudioNav";
import ProfileSelector from "@/components/business/ProfileSelector";
import BusinessProfileView from "@/components/business/BusinessProfileView";
import BrandIdentityView from "@/components/business/BrandIdentityView";
import CalendarView from "@/components/business/CalendarView";
import PostsGalleryView from "@/components/business/PostsGalleryView";

export default function StudioPage() {
  const { profiles, activeProfileId, addProfile, setPosts, updateBusiness, updateBrand } =
    useBusinessStore();
  const [tab, setTab] = useState<StudioTab>("inicio");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchingPhoto, setSearchingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [nicheInput, setNicheInput] = useState("");

  const activeProfile: StudioProfile | undefined = profiles.find(
    (p) => p.id === activeProfileId
  );

  // Se não há perfil ativo, cria o primeiro.
  useEffect(() => {
    if (profiles.length === 0) {
      addProfile();
    }
  }, [profiles.length, addProfile]);

  // Re-hidrata as artes persistidas no IndexedDB ao reabrir.
  useEffect(() => {
    if (!activeProfileId) return;
    void useBusinessStore.getState().hydrateArts(activeProfileId);
  }, [activeProfileId]);

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Criando perfil...
      </div>
    );
  }

  const { business, brand, posts } = activeProfile;
  const niche = business.nicho;
  const nicheValue = nicheInput || activeProfile.business.nicho || "";
  const pct = posts.length >= 30 ? 100 : Math.round((posts.length / 30) * 100);

  const handleGenerate = async () => {
    const effectiveNiche = nicheInput.trim() || activeProfile.business.nicho?.trim() || "";
    if (!effectiveNiche) {
      alert("Digite o seu nicho ou ramo de atuação no campo acima para gerar os 30 posts.");
      return;
    }
    setGenerating(true);
    setProgress(0);
    setPhotoError(false);
    try {
      // Monta negócio e identidade com fallbacks seguros, sem bloquear a geração.
      const businessToUse = {
        ...activeProfile.business,
        nicho: effectiveNiche,
        servico: activeProfile.business.servico?.trim() || effectiveNiche,
        beneficio:
          activeProfile.business.beneficio?.trim() || "Resultados Rápidos e Sem Burocracia",
      };

      const brandToUse = {
        ...activeProfile.brand,
        primaryColor: activeProfile.brand.primaryColor || "#0F172A",
        textColor: activeProfile.brand.textColor || "#FFFFFF",
        accentColor: activeProfile.brand.accentColor || "#A855F7",
        handle: activeProfile.brand.handle?.trim() || "@meunegocio",
      };

      // Persiste automaticamente o que foi usado na geração.
      updateBusiness(activeProfile.id, businessToUse);
      updateBrand(activeProfile.id, brandToUse);

      const generatedPosts = await generateCalendarWithImages({
        business: businessToUse,
        brand: brandToUse,
        bgPhotoUrl: brandToUse.bgPhotoUrl,
        onProgress: setProgress,
      });
      setPosts(activeProfile.id, generatedPosts);
      void persistProfileArts(activeProfile.id, generatedPosts);
      setTab("calendario");
    } catch {
      setPhotoError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoSearchPhoto = async () => {
    const effectiveNiche = nicheInput.trim() || activeProfile.business.nicho?.trim() || "";
    if (!effectiveNiche) return;
    setSearchingPhoto(true);
    setPhotoError(false);
    try {
      const term = photoSearchTerm(effectiveNiche);
      const results = await searchPhotos(term, 8);
      if (results.length > 0) {
        const dataUrl = await fetchImageAsDataUrl(results[0].thumbUrl);
        updateBrand(activeProfile.id, {
          bgPhotoUrl: dataUrl,
          bgPhotoCredit: `${results[0].title} — ${results[0].creator} (${results[0].license})`,
        });
      } else {
        setPhotoError(true);
      }
    } catch {
      setPhotoError(true);
    } finally {
      setSearchingPhoto(false);
    }
  };

  const monthBadge =
    posts.length === 0
      ? { label: "Sem calendário", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-600/30" }
      : posts.length < 30
        ? { label: "Em produção", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" }
        : { label: "Mês completo", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-4 space-y-8 py-2">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Fábrica de <span className="text-purple-400">Posts</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Negócio + Identidade Visual + Calendário de 30 dias com arte diagramada e SEO.
          </p>
        </div>
        <ProfileSelector />
      </div>

      {/* Navegação por abas */}
      <StudioNav active={tab} onChange={setTab} />

      {/* Aba Início */}
      {tab === "inicio" && (
        <div className="space-y-8">
          {/* Grid de Status Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Meu Negócio */}
            <div className="bg-[#121218] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <button
                  onClick={() => setTab("negocio")}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-[var(--primary)] transition-colors"
                >
                  Editar <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Meu Negócio
              </p>
              <p className={`mt-1 text-sm font-semibold ${niche ? "text-emerald-400" : "text-zinc-500"}`}>
                {niche ? "Configurado" : "Não configurado"}
              </p>
              <p className="mt-1 text-xs text-zinc-500 flex-1">
                {niche ? `Nicho: ${niche}` : "Defina o nicho para gerar artes e hashtags."}
              </p>
            </div>

            {/* Card 2: Identidade Visual */}
            <div className="bg-[#121218] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden">
                  {brand.logoDataUrl ? (
                    <img
                      src={brand.logoDataUrl}
                      alt="Logo"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <Palette className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <button
                  onClick={() => setTab("identidade")}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-[var(--primary)] transition-colors"
                >
                  Editar <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Identidade Visual
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {brand.handle ? `@${brand.handle}` : "@seu-canal"}
              </p>
              <div className="flex items-center gap-1.5 mt-3 flex-1">
                {[brand.primaryColor, brand.textColor, brand.accentColor].map((c) => (
                  <span
                    key={c}
                    title={c}
                    className="w-4 h-4 rounded-full border border-white/10 shadow-inner"
                    style={{ background: c }}
                  />
                ))}
                <span className="ml-1 text-[11px] text-zinc-500 truncate">{brand.fontFamily}</span>
              </div>
            </div>

            {/* Card 3: Métricas / Produção */}
            <div className="bg-[#121218] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <button
                  onClick={() => setTab("posts")}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-[var(--primary)] transition-colors"
                >
                  Ver posts <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Produção do Mês
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {posts.length}
                <span className="text-sm font-medium text-zinc-500">/30</span>
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={`mt-3 inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${monthBadge.cls}`}
              >
                <CheckCircle2 className="w-3 h-3" /> {monthBadge.label}
              </span>
            </div>
          </div>

          {/* Seção de Busca de Fotos + Gerador */}
          <div className="bg-[#121218] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">Nicho do seu negócio</h2>
                  <p className="text-sm text-zinc-400 truncate">
                    Usado na busca de fotos (Pexels/Openverse), hashtags e textos dos 30 posts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <input
                  value={nicheValue}
                  onChange={(e) => setNicheInput(e.target.value)}
                  placeholder="Ex: imobiliária, advocacia, academia..."
                  className="h-12 px-4 text-base bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-full lg:w-80"
                />
                <button
                  onClick={handleAutoSearchPhoto}
                  disabled={searchingPhoto || !nicheValue}
                  className="flex items-center gap-2 h-12 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {searchingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar foto
                </button>
              </div>
            </div>

            {photoError && (
              <p className="text-xs text-red-400">
                Não foi possível buscar a foto. Verifique sua conexão.
              </p>
            )}

            {brand.bgPhotoUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={brand.bgPhotoUrl}
                  alt="Foto de fundo"
                  className="w-40 h-28 rounded-xl object-cover border border-zinc-700 shadow-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 truncate">
                    {brand.bgPhotoCredit || "Foto de fundo selecionada"}
                  </p>
                  <button
                    onClick={() =>
                      updateBrand(activeProfile.id, {
                        bgPhotoUrl: undefined,
                        bgPhotoCredit: undefined,
                      })
                    }
                    className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Trocar foto
                  </button>
                </div>
              </div>
            ) : (
              !nicheValue && (
                <p className="text-xs text-zinc-500">
                  Digite o nicho acima para buscar a foto de fundo e gerar o calendário.
                </p>
              )
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="group w-full py-4 text-base font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando 30 posts com arte e SEO... {progress}%
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                  Gerar Calendário de 30 Dias
                </>
              )}
            </button>

            {generating && (
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aba Calendário */}
      {tab === "calendario" && (
        <>
          {activeProfile.posts.length > 0 ? (
            <CalendarView posts={activeProfile.posts} />
          ) : (
            <div className="bg-[#121218] border border-zinc-800/80 rounded-2xl p-10 text-center">
              <p className="text-zinc-500 text-sm mb-4">
                Nenhum calendário gerado ainda. Gere na aba Início.
              </p>
              <button
                onClick={() => setTab("inicio")}
                className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Wand2 className="w-4 h-4" /> Ir para o gerador
              </button>
            </div>
          )}
        </>
      )}

      {/* Aba Meus Posts */}
      {tab === "posts" && (
        <PostsGalleryView profileId={activeProfile.id} posts={activeProfile.posts} />
      )}

      {/* Aba Identidade Visual */}
      {tab === "identidade" && (
        <BrandIdentityView key={activeProfile.id} profile={activeProfile} />
      )}

      {/* Aba Meu Negócio */}
      {tab === "negocio" && (
        <>
          <BusinessProfileView key={activeProfile.id} profile={activeProfile} />
          <button
            onClick={() => {
              void useBusinessStore.getState().resetProfile(activeProfile.id);
            }}
            className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Resetar este perfil
          </button>
        </>
      )}
    </div>
  );
}
