"use client";

import { Play, Clock, Eye, MoreHorizontal, Plus } from "lucide-react";

const videos = [
  { title: "Roteiro Viral — Episódio 12", duration: "03:42", views: "12.4k", status: "Publicado", thumb: "bg-gradient-to-br from-violet-900/60 to-fuchsia-900/60" },
  { title: "Tutorial QuickCut Pro", duration: "08:15", views: "8.2k", status: "Pendente", thumb: "bg-gradient-to-br from-cyan-900/60 to-blue-900/60" },
  { title: "Behind the Scenes — Estúdio", duration: "05:30", views: "3.1k", status: "Rascunho", thumb: "bg-gradient-to-br from-amber-900/60 to-orange-900/60" },
];

export default function VideosPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-[20px] p-8 md:p-10" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--primary)]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3">Painel de Vídeos</h1>
          <p className="text-[var(--text-secondary)] text-base md:text-lg max-w-xl">Gerencie, edite e publique seus conteúdos em um só lugar. Design atualizado, funções preservadas.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Vídeos", value: "142", sub: "+12 esta semana" },
          { label: "Visualizações", value: "48.3k", sub: "+8.2%" },
          { label: "Em edição", value: "18", sub: "Pendentes" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-6 rounded-[16px]">
            <div className="text-[var(--text-secondary)] text-sm font-medium mb-1">{s.label}</div>
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-[var(--accent-green)] mt-2">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Video grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Últimos vídeos</h2>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors shadow-[0_0_20px_rgba(236,72,153,0.25)]">
            <Plus className="w-4 h-4" /> Novo vídeo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v) => (
            <div key={v.title} className="glass-card group rounded-[16px] overflow-hidden hover:-translate-y-1 transition-all duration-300">
              <div className={`h-36 ${v.thumb} relative flex items-center justify-center`}>
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-5 h-5 text-white ml-1" fill="white" />
                </div>
                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-xs text-white font-medium">{v.duration}</span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-white leading-snug line-clamp-2">{v.title}</h3>
                  <button className="shrink-0 p-1 rounded-md hover:bg-white/10"><MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.duration}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${v.status === "Publicado" ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" : v.status === "Pendente" ? "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]" : "bg-zinc-700/30 text-zinc-300"}`}>{v.status}</span>
                  <span className="text-[var(--primary)] text-xs font-medium hover:underline">Edit →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
