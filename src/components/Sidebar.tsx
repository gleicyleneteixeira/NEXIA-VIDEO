"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Sparkles,
  Factory,
  Scissors,
  Share2,
  Settings,
  Zap,
  Clock,
  FileStack,
  Paintbrush,
  CalendarDays,
  Store,
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Sparkles, label: "Roteiro & IA", href: "/script" },
  { icon: CalendarDays, label: "Calendario", href: "/calendar" },
  { icon: Factory, label: "Criacao em Massa", href: "/mass-production" },
  { icon: Store, label: "Fabrica de Posts", href: "/studio" },
  { icon: Scissors, label: "Editor", href: "/editor" },
  { icon: Share2, label: "Publicacao", href: "/publish" },
  { icon: Clock, label: "Historico", href: "/history" },
  { icon: FileStack, label: "Juntar PDF", href: "/pdf-merge" },
  { icon: Paintbrush, label: "SpeedPaint", href: "/speed-paint" },
];

const bottomItems = [
  { icon: Settings, label: "Configuracoes", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[72px] h-screen shrink-0 bg-[var(--secondary)] border-r border-[var(--border-subtle)] flex flex-col relative">
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--primary)]/5 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-[var(--border-subtle)] shrink-0 relative z-10">
        <Link href="/dashboard">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 transition-shadow duration-300">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 relative z-10">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`group relative flex items-center justify-center w-[48px] h-[48px] rounded-[12px] transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-pink)]/10 text-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <div className="absolute -left-[11px] w-[3px] h-5 bg-gradient-to-b from-[var(--primary)] to-[var(--accent-pink)] rounded-r-full" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`} strokeWidth={isActive ? 2.2 : 1.8} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-2.5 pb-4 border-t border-[var(--border-subtle)] pt-3 relative z-10">
        <ul className="space-y-1.5">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`group relative flex items-center justify-center w-[48px] h-[48px] rounded-[12px] transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-pink)]/10 text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <div className="absolute -left-[11px] w-[3px] h-5 bg-gradient-to-b from-[var(--primary)] to-[var(--accent-pink)] rounded-r-full" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`} strokeWidth={isActive ? 2.2 : 1.8} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
