"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Sparkles,
  Video,
  Share2,
  ArrowRight,
  Factory,
  FileText,
  Loader2,
  Rocket,
  CheckCircle,
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
    return <span className="badge badge-green">Pronto</span>;
  }
  if (status === "pending") {
    return <span className="badge badge-primary">Processando</span>;
  }
  if (status === "error") {
    return <span className="badge badge-pink">Erro</span>;
  }
  return <span className="badge badge-primary">{status}</span>;
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
    { label: "Roteiros", value: data.totalRoteiros, icon: FileText, color: "var(--primary)", bg: "rgba(139,92,246,0.1)" },
    { label: "Videos Gerados", value: data.totalVideos, icon: Video, color: "var(--accent-green)", bg: "rgba(16,185,129,0.1)" },
    { label: "Postados", value: data.videosPostados, icon: Rocket, color: "var(--accent-orange)", bg: "rgba(245,158,11,0.1)" },
    { label: "Pendentes", value: data.videosPendentes, icon: Clock, color: "var(--accent-cyan)", bg: "rgba(6,182,212,0.1)" },
  ];

  const quickActions = [
    { title: "Roteiro & IA", description: "Gere ideias, hooks e roteiros com IA", icon: Sparkles, href: "/script", gradient: "from-[var(--primary)] to-[var(--accent-pink)]" },
    { title: "Criacao em Massa", description: "Gere variacoes automaticamente", icon: Factory, href: "/mass-production", gradient: "from-[var(--accent-orange)] to-[var(--accent-pink)]" },
    { title: "Editor de Video", description: "Edite e refina seus videos", icon: Video, href: "/editor", gradient: "from-[var(--accent-cyan)] to-[var(--primary)]" },
    { title: "Historico", description: "Veja seus roteiros salvos", icon: Clock, href: "/history", gradient: "from-[var(--accent-green)] to-[var(--accent-cyan)]" },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto stagger">
      {/* Welcome Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Ola, <span className="gradient-text">{data.userName}</span>!
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px]">
          Pronto para criar conteudo incrivel hoje?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-[var(--radius)] p-4 group cursor-default">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: stat.bg }}>
                <stat.icon className="w-[16px] h-[16px]" style={{ color: stat.color }} />
              </div>
              <span className="text-xs text-[var(--text-secondary)] font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Acoes Rapidas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="glass-card rounded-[var(--radius)] p-5 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" style={{ background: `linear-gradient(to bottom left, ${action.gradient.includes('primary') ? '#8b5cf6' : action.gradient.includes('orange') ? '#f59e0b' : action.gradient.includes('cyan') ? '#06b6d4' : '#10b981'}, transparent)` }} />
              <div className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 shadow-lg`}>
                <action.icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Roteiros Recentes</h2>
          <Link href="/history" className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1 group">
            Ver todos <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {data.recentScripts.length === 0 ? (
          <div className="glass-card rounded-[var(--radius)] p-12 text-center">
            <div className="w-16 h-16 rounded-[16px] bg-[var(--primary)]/5 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[var(--primary)] opacity-30" />
            </div>
            <p className="text-lg font-bold mb-2">Voce ainda nao criou nenhum roteiro</p>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Comece usando o Gerador de Conteudo com IA para criar roteiros automaticos para seus videos.
            </p>
            <Link href="/script" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-[12px] text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              Ir para Roteiro & IA
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-[var(--radius)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Roteiro</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Videos</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Data</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {data.recentScripts.map((script) => (
                  <tr key={script.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded-[8px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                          <Play className="w-3.5 h-3.5 text-white" fill="white" />
                        </div>
                        <span className="font-medium text-sm truncate max-w-[250px]">{script.tema}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={script.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                      {script.quantity || (script.cards_data as unknown[] | null)?.length || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">{formatDate(script.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href="/script" className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                        Abrir
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
