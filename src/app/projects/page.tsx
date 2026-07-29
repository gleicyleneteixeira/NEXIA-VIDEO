"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Search,
  Grid,
  List,
  Play,
  Edit,
  Trash2,
  Share2,
  Clock,
  Calendar,
  MoreVertical,
  Filter,
  ArrowUpDown,
} from "lucide-react";

const projects = [
  {
    id: 1,
    title: "Como Criar Conteúdo Viral",
    status: "Rascunho",
    date: "25 Jul 2026",
    lastModified: "Hoje, 14:30",
    duration: "12:34",
    thumbnail: null,
    tags: ["tutorial", "dicas"],
  },
  {
    id: 2,
    title: "10 Dicas para Crescer no TikTok",
    status: "Editando",
    date: "24 Jul 2026",
    lastModified: "Ontem, 10:15",
    duration: "8:45",
    thumbnail: null,
    tags: ["tiktok", "crescimento"],
  },
  {
    id: 3,
    title: "Tutorial: Edição Profissional",
    status: "Pronto",
    date: "23 Jul 2026",
    lastModified: "23 Jul, 16:45",
    duration: "15:20",
    thumbnail: null,
    tags: ["edição", "tutorial"],
  },
  {
    id: 4,
    title: "Rotina de Produtividade",
    status: "Publicado",
    date: "22 Jul 2026",
    lastModified: "22 Jul, 09:00",
    duration: "10:15",
    thumbnail: null,
    tags: ["produtividade", "rotina"],
  },
  {
    id: 5,
    title: "Review: Câmera Profissional",
    status: "Rascunho",
    date: "21 Jul 2026",
    lastModified: "21 Jul, 20:30",
    duration: "7:30",
    thumbnail: null,
    tags: ["review", "tecnologia"],
  },
  {
    id: 6,
    title: "Como Ganhar Seguidores no Instagram",
    status: "Editando",
    date: "20 Jul 2026",
    lastModified: "20 Jul, 11:20",
    duration: "11:45",
    thumbnail: null,
    tags: ["instagram", "crescimento"],
  },
];

const statusColors: Record<string, string> = {
  Rascunho: "bg-[var(--text-secondary)]/20 text-[var(--text-secondary)]",
  Editando: "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]",
  Pronto: "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]",
  Publicado: "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
};

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");

  const filteredProjects = projects
    .filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (statusFilter === "all" || p.status === statusFilter)
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-8 h-8 text-[var(--accent-orange)]" />
            <h1 className="text-3xl font-bold">
              Meus <span className="gradient-text">Projetos</span>
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            {projects.length} projetos encontrados
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Novo Projeto
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar projetos..."
              className="input-field pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">Todos</option>
              <option value="Rascunho">Rascunhos</option>
              <option value="Editando">Editando</option>
              <option value="Pronto">Prontos</option>
              <option value="Publicado">Publicados</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[var(--text-secondary)]" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "date" | "name" | "status")
              }
              className="input-field w-auto"
            >
              <option value="date">Data</option>
              <option value="name">Nome</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="glass-card rounded-xl overflow-hidden group">
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/50 group-hover:text-white/80 transition-colors" />
                </div>
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 rounded bg-black/50 text-white text-xs">
                    {project.duration}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold mb-2 truncate">{project.title}</h3>
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {project.lastModified}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)] text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/editor?id=${project.id}`}
                    className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Abrir
                  </Link>
                  <button className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
                    <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <button className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
                    <Trash2 className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Projects List */
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
                  Última Modificação
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
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <div className="flex gap-1 mt-1">
                          {project.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-[var(--text-secondary)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {project.date}
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {project.lastModified}
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {project.duration}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/editor?id=${project.id}`}
                        className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      >
                        <Edit className="w-4 h-4 text-[var(--primary)]" />
                      </Link>
                      <button className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors">
                        <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors">
                        <Trash2 className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            {searchQuery
              ? "Tente outros termos de busca"
              : "Comece criando seu primeiro projeto"}
          </p>
          <button className="btn-primary flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Criar Primeiro Projeto
          </button>
        </div>
      )}
    </div>
  );
}
