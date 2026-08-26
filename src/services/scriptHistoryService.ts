"use client";

import type { Variation } from "@/components/ContentCard";

export interface SavedScriptVariation {
  id: string;
  angleName: string;
  headline: string;
  hook: string;
  painOrDesire: string;
  solution: string;
  development: string;
  cta: string;
  seoCaption: string;
  fullCaption: string;
  sceneDirection: string;
  bRollSuggestions: string[];
  hashtags: string[];
}

export interface SavedScriptProject {
  id: string;
  topic: string;
  niche: string;
  createdAt: string;
  variationsCount: number;
  variations: SavedScriptVariation[];
  videoGenerated?: boolean;
}

const STORAGE_KEY = "@nexia_script_history_v1";

export const ScriptHistoryService = {
  async getHistory(): Promise<SavedScriptProject[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async saveProject(
    project: Omit<SavedScriptProject, "id" | "createdAt">
  ): Promise<SavedScriptProject> {
    const history = await this.getHistory();
    const newEntry: SavedScriptProject = {
      ...project,
      id: `script-proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  },

  async deleteProject(id: string): Promise<void> {
    const history = await this.getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  async deleteMultipleProjects(ids: string[]): Promise<void> {
    const history = await this.getHistory();
    const setIds = new Set(ids);
    const updated = history.filter((item) => !setIds.has(item.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  async clearAllHistory(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  },

  async updateProject(id: string, patch: Partial<SavedScriptProject>): Promise<void> {
    const history = await this.getHistory();
    const idx = history.findIndex((item) => item.id === id);
    if (idx === -1) return;
    history[idx] = { ...history[idx], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },
};

export function variationToSaved(
  v: {
    id?: string;
    angleName?: string;
    headline: string;
    hook: string;
    painOrDesire?: string;
    solution?: string;
    development?: string;
    seoCaption?: string;
    dor?: string;
    desejo?: string;
    cta: string;
    scene_direction?: string;
    sceneDirection?: string;
    brolls?: string[];
    bRollSuggestions?: string[];
    hashtags?: string[];
  },
  index: number
): SavedScriptVariation {
  const painOrDesire =
    v.painOrDesire || v.dor || "";
  const solution =
    v.solution || v.desejo || "";
  const development =
    v.development ||
    [painOrDesire, solution].filter(Boolean).join("\n\n");
  const sceneDirection = String(v.scene_direction || v.sceneDirection || "");
  const bRolls = v.bRollSuggestions || v.brolls || [];

  const seoCaption =
    (v.seoCaption && v.seoCaption.trim().length > 0
      ? v.seoCaption
      : [v.hook, painOrDesire, solution, v.cta].filter(Boolean).join("\n\n")) || "";

  return {
    id: v.id || `var-${Date.now()}-${index}`,
    angleName: v.angleName || "Roteiro",
    headline: v.headline || "",
    hook: v.hook || "",
    painOrDesire,
    solution,
    development,
    cta: v.cta || "",
    seoCaption,
    fullCaption:
      (seoCaption +
        (v.hashtags && v.hashtags.length > 0
          ? "\n\n" + v.hashtags.map((t) => "#" + t).join(" ")
          : "")) ||
      "",
    sceneDirection,
    bRollSuggestions: bRolls,
    hashtags: v.hashtags || [],
  };
}

export function savedVariationToVariation(v: SavedScriptVariation): Variation {
  return {
    headline: v.headline || "",
    hook: v.hook || "",
    painOrDesire: v.painOrDesire || "",
    solution: v.solution || "",
    development: v.development || "",
    cta: v.cta || "",
    caption: v.seoCaption || v.fullCaption || "",
    seoCaption: v.seoCaption || "",
    hashtags: v.hashtags || [],
    scene_direction:
      v.sceneDirection || "Gravar olhando direto para a camera, tom energetico e natural.",
    brolls: v.bRollSuggestions || [],
    angleName: v.angleName || "Roteiro",
  };
}