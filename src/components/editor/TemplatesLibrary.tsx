"use client";
import { useState, useMemo } from "react";
import { useProjectStore } from "@/lib/editor";
import type { Template, TemplateCategory, TimelineItem, Transition, TrackFlags } from "@/lib/editor";
import { createDefaultItem, generateId, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO } from "@/lib/editor";
import { Search, Download, Star, Clock, Layout, Filter, X, Check } from "lucide-react";

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  reels: "#ff3366",
  tiktok: "#00f2ea",
  youtube: "#ff0000",
  stories: "#833ab4",
  promo: "#f77737",
  evento: "#fcaf45",
  musica: "#1db954",
  tutorial: "#3b82f6",
  podcast: "#6366f1",
  vlog: "#14b8a6",
  gaming: "#8b5cf6",
  infantil: "#ec4899",
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  reels: "Reels",
  tiktok: "TikTok",
  youtube: "YouTube",
  stories: "Stories",
  promo: "Promo",
  evento: "Evento",
  musica: "Música",
  tutorial: "Tutorial",
  podcast: "Podcast",
  vlog: "Vlog",
  gaming: "Gaming",
  infantil: "Infantil",
};

const TEMPLATES: Template[] = [
  {
    id: "tpl-1",
    name: "Dance Challenge",
    description: "Template para dançarinos com transições rápidas e textos animados. Perfeito para criar conteúdo viral de dança.",
    category: "reels",
    thumbnail: "",
    tags: ["dança", "ritmo", "energia", "viral"],
    duration: 15,
    aspectRatio: "9:16",
    author: "NexiaTeam",
    downloads: 12340,
    rating: 4.8,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-2",
    name: "Before & After",
    description: "Mostre a transformação com estilo. Split screen animado com efeitos de revelação.",
    category: "reels",
    thumbnail: "",
    tags: ["transformação", "antes e depois", "comparação"],
    duration: 10,
    aspectRatio: "9:16",
    author: "EditorPro",
    downloads: 8920,
    rating: 4.5,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-3",
    name: "Outfit Change",
    description: "Mude de visual com um clique. Transições de roupa com efeitos de brilho e texto.",
    category: "reels",
    thumbnail: "",
    tags: ["moda", "roupa", "trend", "estilo"],
    duration: 12,
    aspectRatio: "9:16",
    author: "FashionEdit",
    downloads: 15670,
    rating: 4.7,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-4",
    name: "Food Reel",
    description: "Apresente suas receitas com close-ups dinâmicos e textos elegantes.",
    category: "reels",
    thumbnail: "",
    tags: ["comida", "receita", "culinária", "gastronomia"],
    duration: 20,
    aspectRatio: "9:16",
    author: "FoodCreator",
    downloads: 6540,
    rating: 4.3,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-5",
    name: "Transition Magic",
    description: "Magia nas transições. Efeitos visuais impressionantes para TikTok.",
    category: "tiktok",
    thumbnail: "",
    tags: ["transição", "magia", "efeitos", "visual"],
    duration: 8,
    aspectRatio: "9:16",
    author: "MagicEditor",
    downloads: 23450,
    rating: 4.9,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-6",
    name: "POV Story",
    description: "Conte uma história em primeira pessoa com textos narrativos e efeitos cinematográficos.",
    category: "tiktok",
    thumbnail: "",
    tags: ["pov", "história", "narrativa", "cinema"],
    duration: 30,
    aspectRatio: "9:16",
    author: "StoryTeller",
    downloads: 18200,
    rating: 4.6,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-7",
    name: "Sound Sync",
    description: "Sincronize cortes com o beat da música. Perfeito para conteúdo musical.",
    category: "tiktok",
    thumbnail: "",
    tags: ["música", "beat", "sincronia", "ritmo"],
    duration: 15,
    aspectRatio: "9:16",
    author: "BeatSync",
    downloads: 31200,
    rating: 4.8,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-8",
    name: "Green Screen",
    description: "Use chroma key para criar conteúdo criativo com fundo personalizado.",
    category: "tiktok",
    thumbnail: "",
    tags: ["chroma key", "verde", "fundo", "criativo"],
    duration: 20,
    aspectRatio: "9:16",
    author: "VFXMaster",
    downloads: 9870,
    rating: 4.4,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-9",
    name: "Intro Dinâmico",
    description: "Intro profissional para canais de YouTube com logo animado e textos.",
    category: "youtube",
    thumbnail: "",
    tags: ["intro", "youtube", "logo", "profissional"],
    duration: 8,
    aspectRatio: "16:9",
    author: "YTPro",
    downloads: 45600,
    rating: 4.9,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-10",
    name: "Outro Subscribe",
    description: "Outro com call-to-action para inscrição e vídeos sugeridos.",
    category: "youtube",
    thumbnail: "",
    tags: ["outro", "inscreva-se", "fim", "cta"],
    duration: 15,
    aspectRatio: "16:9",
    author: "YTPro",
    downloads: 38900,
    rating: 4.7,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-11",
    name: "Tutorial Step",
    description: "Organize tutoriais em passos com numeração e textos explicativos.",
    category: "youtube",
    thumbnail: "",
    tags: ["tutorial", "passos", "instruções", "educação"],
    duration: 60,
    aspectRatio: "16:9",
    author: "EduCreator",
    downloads: 12340,
    rating: 4.5,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-12",
    name: "Review Layout",
    description: "Layout profissional para reviews de produtos com ratings e specs.",
    category: "youtube",
    thumbnail: "",
    tags: ["review", "avaliação", "produto", "análise"],
    duration: 45,
    aspectRatio: "16:9",
    author: "TechReviewer",
    downloads: 8760,
    rating: 4.3,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-13",
    name: "Countdown",
    description: "Countdown animado para stories com efeitos de urgência.",
    category: "stories",
    thumbnail: "",
    tags: ["countdown", "contagem", "urgência", "expectativa"],
    duration: 10,
    aspectRatio: "9:16",
    author: "StoryDesign",
    downloads: 5430,
    rating: 4.2,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-14",
    name: "Poll Story",
    description: "Story interativo com enquete e animações de engajamento.",
    category: "stories",
    thumbnail: "",
    tags: ["enquete", "interação", "engajamento", "votação"],
    duration: 15,
    aspectRatio: "9:16",
    author: "InteractiveEdit",
    downloads: 3210,
    rating: 4.0,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-15",
    name: "Behind Scenes",
    description: "Compartilhe bastidores com estilo casual e textos informais.",
    category: "stories",
    thumbnail: "",
    tags: ["bastidores", "bts", "casual", "atrás das câmeras"],
    duration: 20,
    aspectRatio: "9:16",
    author: "BTS_Pro",
    downloads: 7650,
    rating: 4.4,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-16",
    name: "Daily Vlog",
    description: "Registro do dia a dia com transições suaves e textos leves.",
    category: "stories",
    thumbnail: "",
    tags: ["vlog", "dia a dia", "rotina", "cotidiano"],
    duration: 30,
    aspectRatio: "9:16",
    author: "VloggerPro",
    downloads: 11200,
    rating: 4.5,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-17",
    name: "Product Showcase",
    description: "Destaque seu produto com zoom dinâmico e informações visuais.",
    category: "promo",
    thumbnail: "",
    tags: ["produto", "showcase", "vendas", "marketing"],
    duration: 20,
    aspectRatio: "1:1",
    author: "MarketPro",
    downloads: 19800,
    rating: 4.7,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-18",
    name: "Sale Announcement",
    description: "Anuncie promoções com textos grandes e contagem regressiva.",
    category: "promo",
    thumbnail: "",
    tags: ["promoção", "desconto", "saída", "oferta"],
    duration: 15,
    aspectRatio: "9:16",
    author: "SaleMaster",
    downloads: 22100,
    rating: 4.6,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-19",
    name: "App Launch",
    description: "Lance seu app com screenshots animados e features destacadas.",
    category: "promo",
    thumbnail: "",
    tags: ["app", "lançamento", "mobile", "tecnologia"],
    duration: 25,
    aspectRatio: "9:16",
    author: "AppPromo",
    downloads: 6780,
    rating: 4.3,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-20",
    name: "Brand Intro",
    description: "Apresente sua marca com identidade visual e animações profissionais.",
    category: "promo",
    thumbnail: "",
    tags: ["marca", "branding", "empresa", "identidade"],
    duration: 12,
    aspectRatio: "16:9",
    author: "BrandStudio",
    downloads: 14500,
    rating: 4.8,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-21",
    name: "Wedding Highlight",
    description: "Momentos especiais do casamento com filtros românticos e textos elegantes.",
    category: "evento",
    thumbnail: "",
    tags: ["casamento", "casal", "romântico", "festa"],
    duration: 45,
    aspectRatio: "16:9",
    author: "WeddingEdit",
    downloads: 8900,
    rating: 4.9,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-22",
    name: "Birthday Party",
    description: "Celebre aniversários com cores vibrantes e animações divertidas.",
    category: "evento",
    thumbnail: "",
    tags: ["aniversário", "festa", "celebração", "parabéns"],
    duration: 30,
    aspectRatio: "9:16",
    author: "PartyEdit",
    downloads: 5670,
    rating: 4.4,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-23",
    name: "Corporate Event",
    description: "Eventos corporativos com estilo profissional e informes visuais.",
    category: "evento",
    thumbnail: "",
    tags: ["corporativo", "empresa", "profissional", "evento"],
    duration: 60,
    aspectRatio: "16:9",
    author: "CorpMedia",
    downloads: 3450,
    rating: 4.1,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
  {
    id: "tpl-24",
    name: "Concert Live",
    description: "Registros de shows com efeitos de luz e energias vibrantes.",
    category: "evento",
    thumbnail: "",
    tags: ["show", "música", "ao vivo", "concerto"],
    duration: 40,
    aspectRatio: "16:9",
    author: "LiveCapture",
    downloads: 11300,
    rating: 4.6,
    items: [],
    transitions: [],
    tracks: {},
    trackOrder: [],
  },
];

const CATEGORIES: TemplateCategory[] = ["reels", "tiktok", "youtube", "stories", "promo", "evento", "musica", "tutorial"];

const ALL_CATEGORIES: TemplateCategory[] = [...CATEGORIES, "podcast", "vlog", "gaming", "infantil"];

function generateTemplateItems(template: Template): { items: TimelineItem[]; transitions: Transition[]; tracks: Record<string, TrackFlags>; trackOrder: string[] } {
  const fps = 30;
  const vId = generateId();
  const aId = generateId();
  const tId = generateId();

  const tracks: Record<string, TrackFlags> = {
    [vId]: { id: vId, name: "Vídeo", kind: "video", hidden: false, muted: false, locked: false },
    [aId]: { id: aId, name: "Áudio", kind: "audio", hidden: false, muted: false, locked: false },
    [tId]: { id: tId, name: "Texto", kind: "text", hidden: false, muted: false, locked: false },
  };
  const trackOrder = [vId, aId, tId];

  const durationFrames = Math.round(template.duration * fps);
  const itemCount = 3 + Math.floor(Math.random() * 4);
  const items: TimelineItem[] = [];
  const transitions: Transition[] = [];

  let currentFrame = 0;

  for (let i = 0; i < itemCount; i++) {
    const isLast = i === itemCount - 1;
    const itemDuration = isLast
      ? durationFrames - currentFrame
      : Math.round((durationFrames / itemCount) * (0.8 + Math.random() * 0.4));

    if (itemDuration <= 0) break;

    const isText = i % 3 === 0;
    const isAudio = i % 5 === 0 && i > 0;

    const item = createDefaultItem({
      trackId: isText ? tId : isAudio ? aId : vId,
      startFrame: currentFrame,
      durationInFrames: Math.round(itemDuration),
      name: isText ? `Texto ${i + 1}` : isAudio ? `Áudio ${i + 1}` : `Clipe ${i + 1}`,
      kind: isText ? "text" : isAudio ? "audio" : "video",
      animation: {
        enter: i === 0 ? "fade-in" : "none",
        exit: isLast ? "fade-out" : "none",
        durationInFrames: 15,
      },
      text: isText
        ? {
            content: template.name,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 36,
            fontWeight: "bold",
            fontStyle: "normal",
            color: "#ffffff",
            backgroundColor: "transparent",
            backgroundOpacity: 0,
            textAlign: "center",
            x: 50,
            y: 50,
            strokeWidth: 0,
            strokeColor: "#000000",
            strokeEnabled: false,
            shadowColor: "rgba(0,0,0,0.5)",
            shadowBlur: 10,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowEnabled: false,
            stylePreset: "none",
            gradient: { enabled: false, color1: "#8b5cf6", color2: "#ec4899", angle: 0 },
            lineHeight: 1.2,
            letterSpacing: 0,
          }
        : undefined,
    });

    items.push(item);

    if (i > 0 && items.length > 1) {
      const prevItem = items[items.length - 2];
      const transTypes: Array<"crossfade" | "fade" | "wipe-left" | "wipe-right" | "slide-left" | "slide-right" | "zoom-in" | "dissolve"> = [
        "crossfade", "fade", "wipe-left", "wipe-right", "slide-left", "slide-right", "zoom-in", "dissolve",
      ];
      transitions.push({
        id: generateId(),
        fromItemId: prevItem.id,
        toItemId: item.id,
        trackId: item.trackId,
        type: transTypes[i % transTypes.length],
        durationInFrames: 15,
      });
    }

    currentFrame += Math.round(itemDuration);
  }

  return { items, transitions, tracks, trackOrder };
}

function formatDownloads(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={10}
          className={star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
        />
      ))}
      <span className="text-[10px] text-gray-500 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function TemplatesLibrary() {
  const { project, setProject } = useProjectStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "todos">("todos");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchesCategory = activeCategory === "todos" || t.category === activeCategory;
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const handleApply = (template: Template) => {
    const generated = generateTemplateItems(template);

    const newProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      timeline: {
        ...project.timeline,
        items: generated.items,
        transitions: generated.transitions,
        tracks: generated.tracks,
        trackOrder: generated.trackOrder,
        canvas: {
          ...project.timeline.canvas,
          aspectRatio: template.aspectRatio,
          width: template.aspectRatio === "16:9" ? 1920 : template.aspectRatio === "9:16" ? 1080 : 1080,
          height: template.aspectRatio === "16:9" ? 1080 : template.aspectRatio === "9:16" ? 1920 : template.aspectRatio === "1:1" ? 1080 : 1350,
        },
      },
    };

    setProject(newProject);
    setAppliedId(template.id);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedTemplate(null);
    }, 2000);
  };

  return (
    <div className="h-full bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layout size={12} /> Templates
        </h3>
      </div>

      <div className="px-3 py-2 border-b border-[#1e1e2e]">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full bg-[#13131f] border border-[#1e1e2e] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#8b5cf6]/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-[#1e1e2e]">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveCategory("todos")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === "todos" ? "bg-[#8b5cf6] text-white" : "bg-[#1e1e2e] text-gray-400 hover:text-gray-300"
            }`}
          >
            Todos
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-[#8b5cf6] text-white" : "bg-[#1e1e2e] text-gray-400 hover:text-gray-300"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-2">
            <Filter size={20} />
            <span>Nenhum template encontrado</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="bg-[#13131f] border border-[#1e1e2e] rounded-lg overflow-hidden cursor-pointer hover:border-[#8b5cf6]/50 transition-colors group"
              >
                <div
                  className="aspect-[9/16] relative"
                  style={{
                    background: `linear-gradient(135deg, ${CATEGORY_COLORS[template.category]}33, ${CATEGORY_COLORS[template.category]}11)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                      style={{ backgroundColor: `${CATEGORY_COLORS[template.category]}66` }}
                    >
                      {template.name.charAt(0)}
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-medium text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[template.category] }}
                    >
                      {CATEGORY_LABELS[template.category]}
                    </span>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-gray-300 flex items-center gap-1">
                      <Clock size={8} />
                      {template.duration}s
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-gray-300">
                      {template.aspectRatio}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-1.5">
                  <h4 className="text-[11px] font-semibold text-gray-200 truncate">{template.name}</h4>
                  <p className="text-[9px] text-gray-500 truncate">{template.author}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-gray-500">
                      <Download size={8} />
                      {formatDownloads(template.downloads)}
                    </div>
                    <StarRating rating={template.rating} />
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {template.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-[#1e1e2e] text-[8px] text-gray-500 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
          <div
            className="bg-[#0d0d16] border border-[#1e1e2e] rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#1e1e2e] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">{selectedTemplate.name}</h3>
              <button onClick={() => setSelectedTemplate(null)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div
                className="aspect-video rounded-lg overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${CATEGORY_COLORS[selectedTemplate.category]}44, ${CATEGORY_COLORS[selectedTemplate.category]}11)`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: `${CATEGORY_COLORS[selectedTemplate.category]}66` }}
                  >
                    {selectedTemplate.name.charAt(0)}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400">{selectedTemplate.description}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#13131f] rounded-lg p-2">
                  <span className="text-gray-500 block">Categoria</span>
                  <span className="text-gray-300 font-medium">{CATEGORY_LABELS[selectedTemplate.category]}</span>
                </div>
                <div className="bg-[#13131f] rounded-lg p-2">
                  <span className="text-gray-500 block">Duração</span>
                  <span className="text-gray-300 font-medium">{selectedTemplate.duration}s</span>
                </div>
                <div className="bg-[#13131f] rounded-lg p-2">
                  <span className="text-gray-500 block">Formato</span>
                  <span className="text-gray-300 font-medium">{selectedTemplate.aspectRatio}</span>
                </div>
                <div className="bg-[#13131f] rounded-lg p-2">
                  <span className="text-gray-500 block">Autor</span>
                  <span className="text-gray-300 font-medium">{selectedTemplate.author}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1 text-gray-400">
                  <Download size={12} />
                  {formatDownloads(selectedTemplate.downloads)} downloads
                </div>
                <StarRating rating={selectedTemplate.rating} />
              </div>

              <div className="flex flex-wrap gap-1">
                {selectedTemplate.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-[#1e1e2e] text-[10px] text-gray-400 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {showSuccess ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Check size={14} />
                  Template Aplicado!
                </button>
              ) : (
                <button
                  onClick={() => handleApply(selectedTemplate)}
                  className="w-full px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Aplicar Template
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && !selectedTemplate && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 z-50 shadow-lg">
          <Check size={14} />
          Template aplicado com sucesso!
        </div>
      )}
    </div>
  );
}
