"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface BusinessProfile {
  id: string;
  name: string;
  nicho: string;
  publico: string;
  produto: string;
  created_at: string;
}

const LAST_PROFILE_KEY = "last_selected_profile_id";

function getInitialProfileId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_PROFILE_KEY) || "";
}

export function useBusinessProfiles() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>(getInitialProfileId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProfile = profiles.find((p) => p.id === selectedId) || null;

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    localStorage.setItem(LAST_PROFILE_KEY, id);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        setProfiles(data || []);

        const savedId = localStorage.getItem(LAST_PROFILE_KEY) || "";
        if (savedId && data?.some((p) => p.id === savedId)) {
          setSelectedIdState(savedId);
        } else if (data && data.length > 0) {
          setSelectedIdState(data[0].id);
          localStorage.setItem(LAST_PROFILE_KEY, data[0].id);
        }
      } catch (err) {
        console.error("Erro ao buscar perfis:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const saveProfile = async (name: string, nicho: string, publico: string, produto: string, existingId?: string) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      if (existingId) {
        const { data, error } = await supabase
          .from("business_profiles")
          .update({ name, nicho, publico, produto })
          .eq("id", existingId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar perfil:", error);
          return null;
        }

        setProfiles((prev) => prev.map((p) => (p.id === existingId ? data : p)));
        return data;
      } else {
        const { data, error } = await supabase
          .from("business_profiles")
          .insert({ user_id: user.id, name, nicho, publico, produto })
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar perfil:", error);
          return null;
        }

        setProfiles((prev) => [...prev, data]);
        setSelectedId(data.id);
        return data;
      }
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("business_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir perfil:", error);
        return false;
      }

      setProfiles((prev) => prev.filter((p) => p.id !== id));

      if (selectedId === id) {
        const remaining = profiles.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
        } else {
          setSelectedId("");
        }
      }

      return true;
    } catch (err) {
      console.error("Erro ao excluir perfil:", err);
      return false;
    }
  };

  const clearSelection = () => {
    setSelectedId("");
  };

  return {
    profiles,
    selectedProfile,
    selectedId,
    setSelectedId,
    isLoading,
    isSaving,
    saveProfile,
    deleteProfile,
    clearSelection,
  };
}
