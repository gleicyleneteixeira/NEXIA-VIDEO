"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { AiKeyService } from "@/services/aiKeyService";

const DEFAULT_MODEL = "google/gemini-2.5-flash:free";
const STORAGE_KEY = "openrouter_model";
const API_KEYS_STORAGE = "openrouter_api_keys";

export interface ProcessedModel {
  id: string;
  name: string;
  description?: string;
  isFree: boolean;
  displayPrice: string;
}

function getInitialModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved || saved === "google/gemma-4-26b-a4b-it:free" || saved === "google/gemini-2.0-flash-exp:free") {
    localStorage.setItem(STORAGE_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return saved;
}

function getInitialApiKey(): string {
  if (typeof window === "undefined") return "";
  return AiKeyService.getToken();
}

function getInitialApiKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  // Migrate from single key
  const single = AiKeyService.getToken();
  return single ? [single] : [];
}

export function useOpenRouterModel() {
  const [selectedModel, setSelectedModelState] = useState<string>(getInitialModel);
  const [models, setModels] = useState<ProcessedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [apiKey, setApiKeyState] = useState<string>(getInitialApiKey);
  const [apiKeys, setApiKeysState] = useState<string[]>(getInitialApiKeys);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    localStorage.setItem(STORAGE_KEY, model);
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    AiKeyService.setToken(key);
  };

  const setApiKeys = (keys: string[]) => {
    setApiKeysState(keys);
    localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(keys));
  };

  const addApiKey = (key: string) => {
    if (!key.trim()) return;
    const updated = [...apiKeys.filter((k) => k !== key), key];
    setApiKeys(updated);
  };

  const removeApiKey = (key: string) => {
    const updated = apiKeys.filter((k) => k !== key);
    setApiKeys(updated);
  };

  const fetchModels = useCallback(async () => {
    setFetchError(null);
    setIsLoadingModels(true);
    try {
      const savedKey = AiKeyService.getToken();
      const headers: Record<string, string> = {};
      if (savedKey) {
        headers["x-openrouter-key"] = savedKey;
      }

      const response = await fetch("/api/models", { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Erro " + response.status);
      }

      const data = await response.json();
      const raw: unknown[] = data.data || [];

      const processed: ProcessedModel[] = raw.map((m: unknown) => {
        const obj = m as Record<string, unknown>;
        const id = String(obj.id || "");
        const name = String(obj.name || id);
        const description = typeof obj.description === "string" ? obj.description : "";
        const pricing = (obj.pricing || {}) as Record<string, string>;
        const promptPrice = parseFloat(pricing.prompt || "0");
        const completionPrice = parseFloat(pricing.completion || "0");
        const free = id.toLowerCase().endsWith(":free") || (promptPrice === 0 && completionPrice === 0);
        const price = free
          ? "[GRATIS]"
          : "$" + (promptPrice * 1000000).toFixed(2) + "/1M";
        return { id, name, description, isFree: free, displayPrice: price };
      });

      processed.sort((a: ProcessedModel, b: ProcessedModel) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

      setModels(processed);
    } catch (err) {
      console.error("OpenRouter fetch error:", err);
      setFetchError(err instanceof Error ? err.message : "Erro ao carregar modelos");
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => fetchModels());
    return () => cancelAnimationFrame(raf);
  }, [fetchModels]);

  useEffect(() => {
    const syncKey = () => setApiKeyState(AiKeyService.getToken());
    window.addEventListener("nexia_api_key_updated", syncKey);
    return () => window.removeEventListener("nexia_api_key_updated", syncKey);
  }, []);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  return {
    selectedModel,
    setSelectedModel,
    models: filteredModels,
    fetchModels,
    isLoadingModels,
    apiKey,
    setApiKey,
    apiKeys,
    setApiKeys,
    addApiKey,
    removeApiKey,
    defaultModel: DEFAULT_MODEL,
    searchQuery,
    setSearchQuery,
    fetchError,
  };
}
