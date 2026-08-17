"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface BrandState {
  primary: string;
  secondary: string;
  accent: string;
  tolerance: number;
  handle: string;
  logoUrl: string | null;
  logoOriginalUrl: string | null;
  logoName: string | null;
  photoUrl: string | null;
  photoCredit: string | null;

  setBrandColors: (patch: Partial<Pick<BrandState, "primary" | "secondary" | "accent">>) => void;
  setTolerance: (value: number) => void;
  setHandle: (value: string) => void;
  setLogo: (originalUrl: string, transparentUrl: string, name: string) => void;
  setLogoTransparent: (url: string) => void;
  setPhoto: (url: string, credit: string) => void;
  resetBrand: () => void;
}

const initialBrand: Pick<
  BrandState,
  "primary" | "secondary" | "accent" | "tolerance" | "handle" | "logoUrl" | "logoOriginalUrl" | "logoName" | "photoUrl" | "photoCredit"
> = {
  primary: "#8b5cf6",
  secondary: "#13131f",
  accent: "#ec4899",
  tolerance: 35,
  handle: "@nexia.video",
  logoUrl: null,
  logoOriginalUrl: null,
  logoName: null,
  photoUrl: null,
  photoCredit: null,
};

const storage =
  typeof window !== "undefined" ? localStorage : undefined;

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      ...initialBrand,

      setBrandColors: (patch) => set(patch),
      setTolerance: (value) => set({ tolerance: Math.max(0, Math.min(100, value)) }),
      setHandle: (value) => set({ handle: value }),
      setLogo: (originalUrl, transparentUrl, name) =>
        set({ logoOriginalUrl: originalUrl, logoUrl: transparentUrl, logoName: name }),
      setLogoTransparent: (url) => set({ logoUrl: url }),
      setPhoto: (url, credit) => set({ photoUrl: url, photoCredit: credit }),
      resetBrand: () => set({ ...initialBrand }),
    }),
    {
      name: "nexia-brand-v1",
      storage: storage ? createJSONStorage(() => storage) : undefined,
      partialize: (s) => ({
        primary: s.primary,
        secondary: s.secondary,
        accent: s.accent,
        tolerance: s.tolerance,
        handle: s.handle,
        logoUrl: s.logoUrl,
        logoOriginalUrl: s.logoOriginalUrl,
        logoName: s.logoName,
        photoUrl: s.photoUrl,
        photoCredit: s.photoCredit,
      }),
    }
  )
);