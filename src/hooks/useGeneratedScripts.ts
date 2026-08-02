"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface GeneratedScript {
  id: string;
  user_id: string;
  profile_id: string | null;
  tema: string;
  duracao: string | null;
  objetivos: string[] | null;
  quantity: number | null;
  status: "pending" | "completed" | "error";
  error_message: string | null;
  cards_data: unknown[] | null;
  created_at: string;
  completed_at: string | null;
  video_generated: boolean;
}

export function useGeneratedScripts() {
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGeneration, setActiveGeneration] = useState<GeneratedScript | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setScripts([]);
        return;
      }

      const { data } = await supabase
        .from("generated_scripts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setScripts(data || []);

      // Check for active (pending) generations
      const pending = (data || []).find((s) => s.status === "pending");
      if (pending) {
        // Safety: if pending for >30 seconds, mark as error (stale)
        const pendingAge = Date.now() - new Date(pending.created_at).getTime();
        if (pendingAge > 300_000) {
          console.warn("⚠️ Registro pending stale (>5min), marcando como error:", pending.id);
          await supabase
            .from("generated_scripts")
            .update({ status: "error", error_message: "Geracao expirou sem resposta. Tente novamente." })
            .eq("id", pending.id);
          load(); // reload after fixing
          return;
        }
        setActiveGeneration(pending);
      }
    } catch (err) {
      console.error("Erro ao buscar roteiros:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for active generation status
  useEffect(() => {
    if (!activeGeneration) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("generated_scripts")
          .select("*")
          .eq("id", activeGeneration.id)
          .single();

        if (data && data.status !== "pending") {
          // Generation finished (completed or error)
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setActiveGeneration(null);
          load(); // Reload all scripts
        }
      } catch (err) {
        console.error("Erro ao verificar status:", err);
      }
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeGeneration?.id, load]);

  // Start a new background generation
  const startGeneration = async (
    theme: string,
    duracao: string | null,
    objetivos: string[],
    quantity: number,
    profileId: string | undefined,
    payload: {
      theme: string;
      quantity: number;
      duracao: string;
      objectives: string[];
      nicho: string;
      publicoAlvo: string;
      produtoServico: string;
      model: string;
      apiKey: string;
      apiKeys?: string[];
    }
  ): Promise<GeneratedScript | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Create pending record
      const { data: record, error: insertError } = await supabase
        .from("generated_scripts")
        .insert({
          user_id: user.id,
          profile_id: profileId || null,
          tema: theme,
          duracao: duracao || null,
          objetivos: objetivos.length > 0 ? objetivos : null,
          quantity,
          status: "pending",
          cards_data: [],
        })
        .select()
        .single();

      if (insertError || !record) {
        console.error("Erro ao criar registro:", insertError);
        return null;
      }

      setActiveGeneration(record);
      setScripts((prev) => [record, ...prev]);

      // 2. Fire API call in background (fire-and-forget, no timeout needed)
      console.log("🚀 Iniciando chamada à IA...");

      fetch("/api/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id, payload }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.error || `Falha na API (status ${res.status})`);
          }
          return res.json();
        })
        .then(() => {
          console.log("✅ Geracao concluida no servidor");
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setActiveGeneration(null);
          load();
        })
        .catch((err) => {
          console.error("❌ Erro ao processar geracao async:", err);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setActiveGeneration(null);
          load();
        });

      return record;
    } catch (err) {
      console.error("❌ Erro ao iniciar geracao:", err);
      return null;
    }
  };

  const deleteScript = async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("generated_scripts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir roteiro:", error);
        return false;
      }

      setScripts((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      console.error("Erro ao excluir roteiro:", err);
      return false;
    }
  };

  const toggleVideoGenerated = async (id: string, currentValue: boolean): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("generated_scripts")
        .update({ video_generated: !currentValue })
        .eq("id", id);

      if (error) {
        console.error("Erro ao atualizar status do video:", error);
        return false;
      }

      setScripts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, video_generated: !currentValue } : s))
      );
      return true;
    } catch (err) {
      console.error("Erro ao atualizar status do video:", err);
      return false;
    }
  };

  const cancelGeneration = async () => {
    if (!activeGeneration) return;
    try {
      const supabase = createClient();
      await supabase
        .from("generated_scripts")
        .update({ status: "error", error_message: "Cancelado pelo usuario." })
        .eq("id", activeGeneration.id);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setActiveGeneration(null);
      load();
    } catch (err) {
      console.error("Erro ao cancelar geracao:", err);
    }
  };

  return {
    scripts,
    isLoading,
    activeGeneration,
    startGeneration,
    cancelGeneration,
    deleteScript,
    toggleVideoGenerated,
    reload: load,
  };
}
