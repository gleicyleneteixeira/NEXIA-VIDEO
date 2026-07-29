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
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Sparkles, label: "Roteiro & IA", href: "/script" },
  { icon: Factory, label: "Criação em Massa", href: "/mass-production" },
  { icon: Scissors, label: "Editor", href: "/editor" },
  { icon: Share2, label: "Publicação", href: "/publish" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 h-screen shrink-0 bg-[#1c1c28] border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-800 shrink-0">
        <Link href="/dashboard">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-pink)]/20 border border-[var(--primary)]/30 text-[var(--primary)]"
                      : "text-gray-400 hover:bg-[#2a2a3a] hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
