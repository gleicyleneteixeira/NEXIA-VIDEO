"use client";

import { useState } from "react";
import {
  Share2,
  Check,
  Clock,
  Calendar,
  Send,
  Settings,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const socialPlatforms = [
  {
    id: "tiktok",
    name: "TikTok",
    icon: "♪",
    color: "bg-black",
    connected: true,
    username: "@criador_oficial",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶",
    color: "bg-red-600",
    connected: true,
    username: "Criador Oficial",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📷",
    color: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500",
    connected: true,
    username: "@criador_oficial",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Status",
    icon: "💬",
    color: "bg-green-500",
    connected: false,
    username: "Não conectado",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: "𝕏",
    color: "bg-black",
    connected: false,
    username: "Não conectado",
  },
];

const scheduledPosts = [
  {
    id: 1,
    title: "10 Dicas para Crescer no TikTok",
    platforms: ["tiktok", "instagram"],
    date: "30 Jul 2026, 19:00",
    status: "Agendado",
  },
  {
    id: 2,
    title: "Tutorial Edição Profissional",
    platforms: ["youtube"],
    date: "31 Jul 2026, 14:00",
    status: "Agendado",
  },
];

export default function PublishPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    }, 2000);
  };

  const selectAll = () => {
    const connected = socialPlatforms
      .filter((p) => p.connected)
      .map((p) => p.id);
    setSelectedPlatforms(connected);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Share2 className="w-8 h-8 text-[var(--accent-green)]" />
          <h1 className="text-3xl font-bold">
            Publicar <span className="gradient-text">Direto nas Redes</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Compartilhe seu vídeo em múltiplas plataformas de uma vez
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Platforms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Platforms */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[var(--primary)]" />
                Selecionar Plataformas
              </h2>
              <button
                onClick={selectAll}
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)]"
              >
                Selecionar Todas
              </button>
            </div>

            <div className="space-y-3">
              {socialPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                    !platform.connected
                      ? "bg-[var(--surface)] opacity-50"
                      : selectedPlatforms.includes(platform.id)
                      ? "bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-pink)]/20 border border-[var(--primary)]/30"
                      : "bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-transparent"
                  }`}
                  onClick={() =>
                    platform.connected && togglePlatform(platform.id)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center text-white text-xl`}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{platform.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {platform.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {platform.connected ? (
                      <>
                        {selectedPlatforms.includes(platform.id) && (
                          <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </>
                    ) : (
                      <button className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Conectar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[var(--accent-orange)]" />
              Agendar Publicação
            </h2>

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setPublishNow(true)}
                className={`flex-1 p-4 rounded-xl transition-all ${
                  publishNow
                    ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                    : "bg-[var(--surface)] border border-transparent hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Send className="w-5 h-5 mx-auto mb-2 text-[var(--primary)]" />
                <p className="font-medium text-sm">Publicar Agora</p>
              </button>
              <button
                onClick={() => setPublishNow(false)}
                className={`flex-1 p-4 rounded-xl transition-all ${
                  !publishNow
                    ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                    : "bg-[var(--surface)] border border-transparent hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Clock className="w-5 h-5 mx-auto mb-2 text-[var(--accent-orange)]" />
                <p className="font-medium text-sm">Agendar</p>
              </button>
            </div>

            {!publishNow && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    Data
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={selectedPlatforms.length === 0 || isPublishing}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                Publicando...
              </>
            ) : publishSuccess ? (
              <>
                <Check className="w-5 h-5" />
                Publicado com Sucesso!
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {publishNow ? "Publicar Agora" : "Agendar Publicação"}
              </>
            )}
          </button>

          {selectedPlatforms.length === 0 && (
            <p className="text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Selecione pelo menos uma plataforma para publicar
            </p>
          )}
        </div>

        {/* Right - Preview & Scheduled */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3">Pré-visualização</h3>
            <div className="bg-[var(--surface)] rounded-lg p-4">
              <div className="aspect-video bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] rounded-lg flex items-center justify-center mb-3">
                <span className="text-4xl">🎬</span>
              </div>
              <p className="font-medium text-sm mb-1">
                Como Criar Conteúdo Viral
              </p>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                Neste vídeo completo, vou te ensinar as estratégias comprovadas
                que os maiores criadores de conteúdo usam para viralizar...
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] text-xs">
                  #criadoresdeconteudo
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] text-xs">
                  #marketingdigital
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] text-xs">
                  #dicasdetiktok
                </span>
              </div>
            </div>
          </div>

          {/* Scheduled Posts */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent-orange)]" />
              Próximas Publicações
            </h3>
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <p className="font-medium text-sm mb-1">{post.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">
                    {post.date}
                  </p>
                  <div className="flex gap-1">
                    {post.platforms.map((platform) => {
                      const p = socialPlatforms.find((pl) => pl.id === platform);
                      return (
                        <span
                          key={platform}
                          className={`w-6 h-6 rounded ${p?.color} flex items-center justify-center text-white text-xs`}
                        >
                          {p?.icon}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
              Status das Conexões
            </h3>
            <div className="space-y-2">
              {socialPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{platform.name}</span>
                  <span
                    className={`flex items-center gap-1 ${
                      platform.connected
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        platform.connected
                          ? "bg-[var(--accent-green)]"
                          : "bg-[var(--text-secondary)]"
                      }`}
                    />
                    {platform.connected ? "Conectado" : "Desconectado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
