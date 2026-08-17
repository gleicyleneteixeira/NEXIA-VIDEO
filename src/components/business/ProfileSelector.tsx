"use client";

import { Plus } from "lucide-react";
import { useBusinessStore } from "@/lib/business/business-store";

export default function ProfileSelector() {
  const { profiles, activeProfileId, setActiveProfile, addProfile } = useBusinessStore();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {profiles.map((profile) => {
        const isActive = activeProfileId === profile.id;
        return (
          <button
            key={profile.id}
            onClick={() => setActiveProfile(profile.id)}
            className={`group flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
              isActive
                ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-white shadow-lg shadow-[var(--primary)]/10"
                : "border-zinc-700/80 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
            />
            {profile.name || "Sem nome"}
            {isActive && (
              <span className="text-[10px] uppercase tracking-wide text-[var(--primary)]">ativo</span>
            )}
          </button>
        );
      })}
      <button
        onClick={() => addProfile()}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-sm font-semibold px-4 py-2 shadow-lg shadow-purple-500/20 transition-all"
      >
        <Plus className="w-4 h-4" /> Novo Perfil
      </button>
    </div>
  );
}
