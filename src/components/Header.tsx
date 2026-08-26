"use client";

import { Bell, Search, User, ChevronDown } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-[#0a0d14]/60 backdrop-blur-md relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />

      {/* Search */}
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
          <input
            type="text"
            placeholder="Buscar projetos, roteiros, videos..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] text-white placeholder-[var(--text-secondary)] px-10 py-2.5 rounded-[12px] text-sm focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-glow)] transition-all duration-300"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--border)]/50 border border-[var(--border)]">
            /
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-6">
        {/* Notifications */}
        <button className="relative p-2.5 rounded-[10px] hover:bg-[var(--surface-hover)] transition-colors group">
          <Bell className="w-[18px] h-[18px] text-[var(--text-secondary)] group-hover:text-white transition-colors" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-pink)] rounded-full ring-2 ring-[var(--secondary)]" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        {/* User */}
        <button className="flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-[10px] hover:bg-[var(--surface-hover)] transition-colors group">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center shadow-md shadow-[var(--primary)]/15">
            <User className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-white transition-colors" />
        </button>
      </div>
    </header>
  );
}
