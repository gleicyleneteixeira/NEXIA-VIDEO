"use client";

import { Home, CalendarDays, FolderKanban, Palette, Briefcase } from "lucide-react";

export type StudioTab = "inicio" | "calendario" | "posts" | "identidade" | "negocio";

const TABS: { id: StudioTab; label: string; icon: typeof Home }[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
  { id: "posts", label: "Meus Posts", icon: FolderKanban },
  { id: "identidade", label: "Identidade Visual", icon: Palette },
  { id: "negocio", label: "Meu Negócio", icon: Briefcase },
];

export default function StudioNav({
  active,
  onChange,
}: {
  active: StudioTab;
  onChange: (tab: StudioTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-zinc-800">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              isActive
                ? "bg-zinc-800 text-white border-[var(--primary)]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/60 border-transparent"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
