const API_KEY_STORAGE_KEY = "@nexia_openrouter_token_v1";
const GROQ_KEY_STORAGE_KEY = "@nexia_groq_token_v1";

const LEGACY_SINGLE_KEY = "openrouter_api_key";
const LEGACY_LIST_KEY = "openrouter_api_keys";

function readLegacyToken(): string {
  try {
    const single = window.localStorage.getItem(LEGACY_SINGLE_KEY);
    if (single && single.trim()) {
      return single.trim();
    }
    const raw = window.localStorage.getItem(LEGACY_LIST_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string" && arr[0].trim()) {
        return arr[0].trim();
      }
    }
  } catch (e) {
    console.warn("Erro ao ler API key legada:", e);
  }
  return "";
}

function notifyListeners(): void {
  try {
    window.dispatchEvent(new Event("nexia_api_key_updated"));
  } catch (e) {
    console.warn("Erro ao notificar atualizacao da API key:", e);
  }
}

export const AiKeyService = {
  /**
   * Obtém o token salvo na ordem:
   * 1. chave centralizada (@nexia_openrouter_token_v1)
   * 2. chaves legadas (openrouter_api_key / openrouter_api_keys) de versoes anteriores
   * 3. variável de ambiente NEXT_PUBLIC_AI_API_KEY como fallback
   */
  getToken(): string {
    if (typeof window === "undefined") {
      return process.env.NEXT_PUBLIC_AI_API_KEY || "";
    }
    try {
      const stored = window.localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
      const legacy = readLegacyToken();
      if (legacy) {
        return legacy;
      }
    } catch (e) {
      console.warn("Erro ao acessar localStorage para API key:", e);
    }
    return process.env.NEXT_PUBLIC_AI_API_KEY || "";
  },

  /**
   * Salva o token permanentemente e dispara o evento customizado
   * `nexia_api_key_updated` para sincronizar todos os componentes.
   */
  setToken(token: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const cleanToken = token.trim();
      if (!cleanToken) {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      } else {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, cleanToken);
      }
      notifyListeners();
      return true;
    } catch (e) {
      console.error("Falha ao salvar API key:", e);
      return false;
    }
  },

  hasValidToken(): boolean {
    const token = this.getToken();
    return token.length > 5;
  },

  removeToken(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      notifyListeners();
    }
  },

  /**
   * Obtém o token do Groq salvo em @nexia_groq_token_v1.
   */
  getGroqToken(): string {
    if (typeof window === "undefined") {
      return process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
    }
    try {
      const stored = window.localStorage.getItem(GROQ_KEY_STORAGE_KEY);
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {
      console.warn("Erro ao acessar localStorage para chave Groq:", e);
    }
    return process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
  },

  /**
   * Salva o token do Groq em @nexia_groq_token_v1.
   */
  setGroqToken(token: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const cleanToken = token.trim();
      if (!cleanToken) {
        window.localStorage.removeItem(GROQ_KEY_STORAGE_KEY);
      } else {
        window.localStorage.setItem(GROQ_KEY_STORAGE_KEY, cleanToken);
      }
      return true;
    } catch (e) {
      console.error("Falha ao salvar chave Groq:", e);
      return false;
    }
  },

  /**
   * Remove o token do Groq do localStorage.
   */
  removeGroqToken(): void {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GROQ_KEY_STORAGE_KEY);
    }
  },
};