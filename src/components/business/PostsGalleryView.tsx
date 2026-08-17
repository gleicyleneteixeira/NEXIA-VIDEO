"use client";

import { useMemo, useState } from "react";
import { FolderKanban } from "lucide-react";
import type { StudioPost } from "@/lib/business/types";
import PostItemCard from "./PostItemCard";

type GalleryFilter = "todos" | "editando" | "agendado" | "publicado" | "favoritos";

const FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "editando", label: "Editando" },
  { id: "agendado", label: "Agendados" },
  { id: "publicado", label: "Publicados" },
  { id: "favoritos", label: "Favoritos" },
];

export default function PostsGalleryView({
  profileId,
  posts,
}: {
  profileId: string;
  posts: StudioPost[];
}) {
  const [filter, setFilter] = useState<GalleryFilter>("todos");

  const filtered = useMemo(() => {
    switch (filter) {
      case "editando":
        return posts.filter((p) => p.status === "editando");
      case "agendado":
        return posts.filter((p) => p.status === "agendado");
      case "publicado":
        return posts.filter((p) => p.status === "publicado");
      case "favoritos":
        return posts.filter((p) => p.favorite);
      default:
        return posts;
    }
  }, [posts, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderKanban className="w-5 h-5 text-[var(--primary)]" />
        <h2 className="text-lg font-bold text-white">Meus Posts</h2>
        <span className="text-[11px] text-gray-500 ml-auto">{filtered.length} posts</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.id
                ? "border-[var(--primary)] bg-[var(--primary)]/15 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          Nenhum post aqui. Gere o calendário na aba Calendário.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((post) => (
            <PostItemCard key={post.id} profileId={profileId} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
