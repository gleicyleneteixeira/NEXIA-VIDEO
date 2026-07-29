"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Play,
  Clock,
  Eye,
  Heart,
  TrendingUp,
  Sparkles,
  Video,
  Share2,
  FolderOpen,
  ArrowRight,
  Zap,
  Factory,
} from "lucide-react";

const recentProjects = [
  {
    id: 1,
    title: "Como Criar Conteúdo Viral",
    thumbnail: null,
    status: "Rascunho",
    date: "25 Jul 2026",
    duration: "12:34",
  },
  {
    id: 2,
    title: "10 Dicas para Crescer no TikTok",
    thumbnail: null,
    status: "Editando",
    date: "24 Jul 2026",
    duration: "8:45",
  },
  {
    id: 3,
    title: "Tutorial: Edição Profissional",
    thumbnail: null,
    status: "Pronto",
    date: "23 Jul 2026",
    duration: "15:20",
  },
  {
    id: 4,
    title: "Rotina de Produtividade",
    thumbnail: null,
    status: "Publicado",
    date: "22 Jul 2026",
    duration: "10:15",
  },
];

const stats = [
  { label: "Projetos", value: "12", icon: Video, color: "text-[var(--primary)]" },
  { label: "Publicados", value: "8", icon: Share2, color: "text-[var(--accent-green)]" },
  { label: "Em Edição", value: "3", icon: Play, color: "text-[var(--accent-orange)]" },
  { label: "Rascunhos", value: "1", icon: FolderOpen, color: "text-[var(--accent-cyan)]" },
];

const quickActions = [
  {
    title: "Roteiro & IA",
    description: "Gere ideias, hooks e roteiros com IA",
    icon: Sparkles,
    href: "/script",
    color: "from-[var(--primary)] to-[var(--accent-pink)]",
  },
  {
    title: "Criação em Massa",
    description: "Gere variações automaticamente",
    icon: Factory,
    href: "/mass-production",
    color: "from-[var(--accent-orange)] to-[var(--accent-pink)]",
  },
  {
    title: "Editor de Vídeo",
    description: "Edite e refina seus vídeos",
    icon: Video,
    href: "/editor",
    color: "from-[var(--accent-cyan)] to-[var(--primary)]",
  },
  {
    title: "Publicar",
    description: "Compartilhe em suas redes",
    icon: Share2,
    href: "/publish",
    color: "from-[var(--accent-green)] to-[var(--accent-cyan)]",
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-[var(--primary)]" />
          <h1 className="text-3xl font-bold">
            Olá, <span className="gradient-text">Criador</span>!
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Pronto para criar conteúdo incrível hoje?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-[var(--text-secondary)]">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Ações Rápidas</h2>
          <Link
            href="/projects"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="glass-card rounded-xl p-5 group"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{action.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Projetos Recentes</h2>
          <Link
            href="/projects"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                  Projeto
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                  Data
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--text-secondary)]">
                  Duração
                </th>
                <th className="text-right p-4 text-sm font-medium text-[var(--text-secondary)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">{project.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === "Publicado"
                          ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                          : project.status === "Pronto"
                          ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                          : project.status === "Editando"
                          ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]"
                          : "bg-[var(--text-secondary)]/20 text-[var(--text-secondary)]"
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {project.date}
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {project.duration}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/editor?id=${project.id}`}
                      className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors text-sm"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
