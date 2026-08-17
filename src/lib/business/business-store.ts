"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BrandIdentity, BusinessProfile, StudioPost, StudioProfile } from "./types";
import { DEFAULT_BRAND, DEFAULT_BUSINESS } from "./types";
import { generateId } from "@/lib/editor";
import {
  clearArtsForProfile,
  getAllArtsForProfile,
  persistArt,
} from "./artPersistence";

interface BusinessState {
  profiles: StudioProfile[];
  activeProfileId: string | null;

  addProfile: (name?: string) => string;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  updateBusiness: (id: string, patch: Partial<BusinessProfile>) => void;
  updateBrand: (id: string, patch: Partial<BrandIdentity>) => void;
  setPosts: (id: string, posts: StudioPost[]) => void;
  updatePost: (id: string, postId: string, patch: Partial<StudioPost>) => void;
  setLogo: (id: string, originalUrl: string, transparentUrl: string, name: string) => void;
  resetProfile: (id: string) => void;
  /** Re-lê as artes do IndexedDB e as anexa aos posts do perfil. */
  hydrateArts: (id: string) => Promise<void>;
}

const storage =
  typeof window !== "undefined" ? localStorage : undefined;

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name = "Novo Perfil") => {
        const id = generateId();
        const profile: StudioProfile = {
          id,
          name,
          business: { ...DEFAULT_BUSINESS },
          brand: { ...DEFAULT_BRAND },
          posts: [],
        };
        set((s) => ({ profiles: [...s.profiles, profile], activeProfileId: id }));
        return id;
      },

      removeProfile: (id) =>
        set((s) => {
          void clearArtsForProfile(id);
          const profiles = s.profiles.filter((p) => p.id !== id);
          const activeProfileId =
            s.activeProfileId === id
              ? profiles[0]?.id ?? null
              : s.activeProfileId;
          return { profiles, activeProfileId };
        }),

      setActiveProfile: (activeProfileId) => set({ activeProfileId }),

      updateBusiness: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, business: { ...p.business, ...patch } } : p
          ),
        })),

      updateBrand: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, brand: { ...p.brand, ...patch } } : p
          ),
        })),

      setLogo: (id, originalUrl, transparentUrl, name) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? {
                  ...p,
                  brand: {
                    ...p.brand,
                    logoOriginalUrl: originalUrl,
                    logoDataUrl: transparentUrl,
                    logoName: name,
                  },
                }
              : p
          ),
        })),

      setPosts: (id, posts) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, posts } : p)),
        })),

      updatePost: (id, postId, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? {
                  ...p,
                  posts: p.posts.map((post) =>
                    post.id === postId ? { ...post, ...patch } : post
                  ),
                }
              : p
          ),
        })),

      resetProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? {
                  ...p,
                  business: { ...DEFAULT_BUSINESS },
                  brand: { ...DEFAULT_BRAND },
                  posts: [],
                }
              : p
          ),
        })),

      hydrateArts: async (id) => {
        const arts = await getAllArtsForProfile(id);
        const keys = Object.keys(arts);
        if (keys.length === 0) return;
        const posts = get().profiles.find((p) => p.id === id)?.posts ?? [];
        if (posts.length === 0) return;
        const updated = posts.map((post) =>
          arts[post.id] ? { ...post, previewImageUrl: arts[post.id] } : post
        );
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, posts: updated } : p)),
        }));
      },
    }),
    {
      name: "nexia-business-v1",
      storage: storage ? createJSONStorage(() => storage) : undefined,
      partialize: (s) => ({
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
      }),
    }
  )
);

/**
 * Guarda as artes do perfil no IndexedDB (em background) e também atualiza
 * os posts em memória com a pré-visualização.
 */
export async function persistProfileArts(profileId: string, posts: StudioPost[]): Promise<void> {
  for (const post of posts) {
    if (post.previewImageUrl) {
      void persistArt(`${profileId}:${post.id}`, post.previewImageUrl);
    }
  }
}
