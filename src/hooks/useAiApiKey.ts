"use client";

import { useState, useEffect } from "react";
import { AiKeyService } from "@/services/aiKeyService";

export function useAiApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => AiKeyService.getToken());
  const [hasKey, setHasKey] = useState<boolean>(() => AiKeyService.hasValidToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const syncKey = () => {
    const current = AiKeyService.getToken();
    setApiKeyState(current);
    setHasKey(AiKeyService.hasValidToken());
    setIsLoading(false);
  };

  useEffect(() => {
    window.addEventListener("nexia_api_key_updated", syncKey);
    return () => {
      window.removeEventListener("nexia_api_key_updated", syncKey);
    };
  }, []);

  const saveKey = (newKey: string) => {
    const ok = AiKeyService.setToken(newKey);
    if (ok) syncKey();
    return ok;
  };

  return { apiKey, hasKey, isLoading, saveKey, removeKey: AiKeyService.removeToken };
}