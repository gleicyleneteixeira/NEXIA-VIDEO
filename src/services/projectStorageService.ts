"use client";

import type { Project } from "@/lib/editor/types";

/**
 * Persistência de projetos do editor (estilo CapCut).
 * Mantém a lista de rascunhos no localStorage sob a chave
 * `@nexia_editor_projects_v1`. Cada projeto guarda um snapshot completo do
 * `Project` (timeline, clipes, textos) para poder continuar a edição de onde
 * parou, além de metadados de capa e posição da agulha.
 */

export interface EditorProject {
  id: string;
  name: string;
  thumbnailUrl?: string;
  updatedAt: string;
  currentTime: number; // posição exata da agulha (segundos)
  totalDuration: number; // duração total (segundos)
  tracks: unknown[]; // (compat) trilhas resumidas — o snapshot real está em `project`
  project?: Project; // snapshot completo p/ restaurar a edição
}

const STORAGE_KEY = "@nexia_editor_projects_v1";

function readAll(): EditorProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EditorProject[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: EditorProject[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* sem espaço ou indisponível — ignora */
  }
}

export function listProjects(): EditorProject[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): EditorProject | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function saveProject(p: EditorProject): void {
  const all = readAll();
  const idx = all.findIndex((x) => x.id === p.id);
  if (idx >= 0) all[idx] = p;
  else all.push(p);
  writeAll(all);
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function createProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildEditorProject(
  partial: Partial<EditorProject> & { project: Project }
): EditorProject {
  return {
    id: partial.id || createProjectId(),
    name: partial.name || "Projeto sem título",
    thumbnailUrl: partial.thumbnailUrl,
    updatedAt: new Date().toISOString(),
    currentTime: partial.currentTime ?? 0,
    totalDuration: partial.totalDuration ?? 0,
    tracks: partial.tracks ?? [],
    project: partial.project,
  };
}
