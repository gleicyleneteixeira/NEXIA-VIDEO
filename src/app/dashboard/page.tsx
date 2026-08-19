"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Sparkles,
  Video,
  Send,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Factory,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardData {
  userName: string;
  totalRoteiros: number;
  totalVideos: number;
  videosPostados: number;
  videosPendentes: number;
  recentScripts: RecentScript[];
}

interface RecentScript {
  id: string;
  tema: string;
  status: string;
  quantity: number | null;
  created_at: string;
  cards_data: unknown[] | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        Pronto
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
        Erro
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">
      Processando
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    userName: "Criador",
    totalRoteiros: 0,
    totalVideos: 0,
    videosPostados: 0,
    videosPendentes: 0,
    recentScripts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const userName = user.user_metadata?.full_name
          || user.email?.split("@")[0]
          || "Criador";

        // Parallel queries
        const [roteirosRes, videosRes, postedRes] = await Promise.all([
          supabase
            .from("generated_scripts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("rendered_videos")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("rendered_videos")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_posted", true),
        ]);

        const totalRoteiros = roteirosRes.count || 0;
        const totalVideos = videosRes.count || 0;
        const videosPostados = postedRes.count || 0;
        const videosPendentes = totalVideos - videosPostados;

        // Recent scripts
        const { data: recentScripts } = await supabase
          .from("generated_scripts")
          .select("id, tema, status, quantity, created_at, cards_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setData({
          userName,
          totalRoteiros,
          totalVideos,
          videosPostados,
          videosPendentes,
          recentScripts: recentScripts || [],
        });
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = [
    { label: "Roteiros Criados", value: data.totalRoteiros, icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Vídeos Gerados", value: data.totalVideos, icon: Video, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Vídeos Postados", value: data.videosPostados, icon: Send, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Vídeos Pendentes", value: data.videosPendentes, icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  ];

  const quickActions = [
    { title: "Roteiro & IA", description: "Gere ideias, hooks e roteiros com IA", icon: Sparkles, href: "/script", tint: "from-purple-600/20 to-indigo-600/10", border: "hover:border-purple-500/50", iconCls: "bg-purple-500/15 text-purple-300" },
    { title: "Criação em Massa", description: "Gere variações automáticas de vídeo", icon: Factory, href: "/mass-production", tint: "from-pink-600/20 to-rose-600/10", border: "hover:border-pink-500/50", iconCls: "bg-pink-500/15 text-pink-300" },
    { title: "Editor de Vídeo", description: "Edite e refine seus clipes na timeline", icon: Video, href: "/editor", tint: "from-blue-600/20 to-cyan-600/10", border: "hover:border-blue-500/50", iconCls: "bg-cyan-500/15 text-cyan-300" },
    { title: "Histórico", description: "Acesse roteiros e projetos salvos", icon: Clock, href: "/history", tint: "from-teal-600/20 to-emerald-600/10", border: "hover:border-teal-500/50", iconCls: "bg-emerald-500/15 text-emerald-300" },
  ];

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-4" />
        <p className="text-sm text-zinc-500">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 lg:px-6 py-8 space-y-8 animate-fade-in">
      {/* Título de boas-vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Olá,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {data.userName}
            </span>
            !
          </h1>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1">
            Pronto para criar e gerenciar seu conteúdo em vídeo hoje?
          </p>
        </div>

        <Link
          href="/script"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs lg:text-sm font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Criar Novo Roteiro
        </Link>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#101018] border border-zinc-800/80 rounded-2xl p-5 shadow-xl flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
                  {stat.label}
                </span>
                <div className="text-3xl font-black text-white mt-1">{stat.value}</div>
              </div>
              <div className={`w-11 h-11 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className={`bg-[#101018] bg-gradient-to-br ${action.tint} border border-zinc-800/80 ${action.border} rounded-2xl p-5 shadow-xl transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div className="space-y-2">
                  <div className={`w-9 h-9 rounded-xl ${action.iconCls} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{action.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-zinc-400 group-hover:text-white transition-colors">
                  <span>Acessar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Roteiros Recentes */}
      <div className="bg-[#101018] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Roteiros Recentes</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Seus últimos projetos e status de renderização</p>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {data.recentScripts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400 opacity-60" />
            </div>
            <p className="text-lg font-bold text-white mb-2">Você ainda não criou nenhum roteiro</p>
            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
              Comece usando o Gerador de Conteúdo com IA para criar roteiros automáticos para seus vídeos.
            </p>
            <Link
              href="/script"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-purple-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Ir para Roteiro & IA
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-x-auto px-2 pb-2">
            <table className="w-full text-left border-collapse text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Roteiro</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Vídeos</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.recentScripts.map((script) => (
                  <tr key={script.id} className="hover:bg-zinc-900/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-6 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Play className="w-3 h-3 text-white" fill="white" />
                        </div>
                        <span className="font-semibold text-zinc-200 truncate max-w-[320px] lg:max-w-[520px]">
                          {script.tema}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={script.status} />
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-medium">
                      {script.quantity ?? script.cards_data?.length ?? "-"}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">{formatDate(script.created_at)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href="/script"
                        className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold text-xs transition-colors"
                      >
                        Abrir no Editor
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}