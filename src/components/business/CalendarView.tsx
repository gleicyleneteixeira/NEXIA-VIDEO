"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { StudioPost } from "@/lib/business/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarView({ posts }: { posts: StudioPost[] }) {
  const byDate = useMemo(() => {
    const map: Record<string, StudioPost[]> = {};
    for (const post of posts) {
      if (!map[post.scheduledDate]) map[post.scheduledDate] = [];
      map[post.scheduledDate].push(post);
    }
    return map;
  }, [posts]);

  const monthKey = useMemo(() => {
    if (posts.length === 0) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return posts[0].scheduledDate.slice(0, 7);
  }, [posts]);

  const cells = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const leading = first.getDay();
    const result: (string | null)[] = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(`${monthKey}-${String(d).padStart(2, "0")}`);
    }
    return result;
  }, [monthKey]);

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [monthKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-[var(--primary)]" />
        <h2 className="text-lg font-bold text-white capitalize">{monthLabel}</h2>
        <span className="text-[11px] text-gray-500 ml-auto">{posts.length} posts no mês</span>
      </div>

      <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-800">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="aspect-square bg-[#17171f]" />;
            const dayPosts = byDate[date] ?? [];
            const d = Number(date.split("-")[2]);
            return (
              <div
                key={date}
                className={`aspect-square p-1.5 border-b border-r border-gray-800/50 transition-colors ${
                  dayPosts.length > 0 ? "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">{d}</span>
                  {dayPosts.length > 0 && (
                    <span className="text-[8px] px-1 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] font-bold">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-1 truncate"
                      title={`Dia ${post.dayNumber} — ${post.hook}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            post.status === "publicado"
                              ? "#22c55e"
                              : post.status === "editando"
                                ? "#f59e0b"
                                : post.status === "agendado"
                                  ? "#38bdf8"
                                  : "#8b5cf6",
                        }}
                      />
                      <span className="text-[8px] text-gray-400 truncate">
                        D{post.dayNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
