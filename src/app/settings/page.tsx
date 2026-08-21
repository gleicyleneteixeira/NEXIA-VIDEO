"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Shield,
  Bell,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Cpu,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useOpenRouterModel } from "@/hooks/useOpenRouterModel";
import { AiKeyService } from "@/services/aiKeyService";
import { useAiApiKey } from "@/hooks/useAiApiKey";

const aiProviders = [
  {
    id: "grok",
    name: "Grok (xAI)",
    description: "IA gratuita do xAI - Recomendado",
    url: "https://console.x.ai",
    free: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Acesso a múltiplas IAs",
    url: "https://openrouter.ai",
    free: false,
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    description: "ChatGPT e GPT-4",
    url: "https://platform.openai.com",
    free: false,
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude 3.5 Sonnet",
    url: "https://console.anthropic.com",
    free: false,
  },
];

export default function SettingsPage() {
  const {
    selectedModel,
    setSelectedModel,
    models,
    fetchModels,
    isLoadingModels,
    apiKey,
    setApiKey,
    apiKeys,
    addApiKey,
    removeApiKey,
    defaultModel,
    searchQuery,
    setSearchQuery,
    fetchError,
  } = useOpenRouterModel();

  const [newKeyValue, setNewKeyValue] = useState("");

  const { hasKey, saveKey } = useAiApiKey();

  const [activeTab, setActiveTab] = useState("api");
  const [isMounted, setIsMounted] = useState(false);
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>((): Record<string, string> => {
    const existing = AiKeyService.getToken();
    if (!existing) return {};
    return { openrouter: existing };
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [selectedProvider, setSelectedProvider] = useState("grok");

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    email: true,
    push: true,
    updates: false,
    marketing: false,
  });

  const [preferences, setPreferences] = useState({
    language: "pt-BR",
    theme: "dark",
    autosave: true,
    highQuality: true,
  });

  const handleSaveApiKey = (provider: string) => {
    const value = (providerKeys[provider] || "").trim();
    if (!value) {
      return;
    }
    const ok = saveKey(value);
    if (ok) {
      setSavedKeys((prev) => ({ ...prev, [provider]: true }));
      setTimeout(() => {
        setSavedKeys((prev) => ({ ...prev, [provider]: false }));
      }, 2500);
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const tabs = [
    { id: "api", label: "API Keys", icon: Key },
    { id: "models", label: "Modelos de IA", icon: Cpu },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "preferences", label: "Preferências", icon: Palette },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-[var(--text-secondary)]" />
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Configurações</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Gerencie suas preferências e integrações
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-pink)]/20 text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${
                    activeTab === tab.id ? "text-[var(--primary)]" : ""
                  }`}
                />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* API Keys Tab */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Chaves de API (BYOK)
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Use suas próprias chaves de IA - sem custos extras!
                    </p>
                    {isMounted && (
                      <span
                        className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                          hasKey
                            ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                            : "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border border-[var(--accent-orange)]/30"
                        }`}
                      >
                        {hasKey ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Chave configurada
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" /> Nenhuma chave salva ainda
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[var(--accent-green)] mt-0.5" />
                    <div>
                      <p className="font-medium text-[var(--accent-green)]">
                        Economize com IAs Gratuitas
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Use o Grok (xAI) que é gratuito! Suas chaves são
                        criptografadas e salvas apenas no seu dispositivo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {aiProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className={`p-4 rounded-xl transition-all ${
                        selectedProvider === provider.id
                          ? "bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-pink)]/10 border border-[var(--primary)]/20"
                          : "bg-[var(--surface)] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="provider"
                            checked={selectedProvider === provider.id}
                            onChange={() => setSelectedProvider(provider.id)}
                            className="accent-[var(--primary)]"
                          />
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {provider.name}
                              {provider.free && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-green)]/20 text-[var(--accent-green)] text-xs">
                                  Gratuito
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {provider.description}
                            </p>
                          </div>
                        </div>
                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          Obter Chave
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {selectedProvider === provider.id && (
                        <>
                          <div className="relative">
                            <input
                              type={showKeys[provider.id] ? "text" : "password"}
                              value={providerKeys[provider.id] || ""}
                              onChange={(e) =>
                                setProviderKeys((prev) => ({
                                  ...prev,
                                  [provider.id]: e.target.value,
                                }))
                              }
                              placeholder={`Cole sua chave de API do ${provider.name}...`}
                              className="input-field pr-20"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                onClick={() => toggleShowKey(provider.id)}
                                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]"
                              >
                                {showKeys[provider.id] ? (
                                  <EyeOff className="w-4 h-4 text-[var(--text-secondary)]" />
                                ) : (
                                  <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                                )}
                              </button>
                              <button
                                onClick={() => handleSaveApiKey(provider.id)}
                                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]"
                              >
                                {savedKeys[provider.id] ? (
                                  <Check className="w-4 h-4 text-[var(--accent-green)]" />
                                ) : (
                                  <Save className="w-4 h-4 text-[var(--text-secondary)]" />
                                )}
                              </button>
                            </div>
                          </div>
                          {savedKeys[provider.id] && (
                            <p className="mt-2 text-xs text-[var(--accent-green)] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Chave de API salva com sucesso! Ela sera usada nas geracoes com IA.
                            </p>
                          )}
                          {!savedKeys[provider.id] && providerKeys[provider.id] && (
                            <p className="mt-2 text-xs text-[var(--text-secondary)]">
                              {hasKey ? "Chave ativa. Clique no disquete para salvar alteracoes." : ""}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-orange)]" />
                  Segurança
                </h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Suas chaves são criptografadas com AES-256
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Armazenadas apenas no seu dispositivo (localStorage)
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Nunca enviadas para nossos servidores
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Você pode excluir a qualquer momento
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* AI Models Tab */}
          {activeTab === "models" && (
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Configurar Modelo de IA
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Escolha o modelo do OpenRouter para gerar roteiros
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[var(--accent-green)] mt-0.5" />
                    <div>
                      <p className="font-medium text-[var(--accent-green)]">
                        Modelos Gratuitos Disponíveis
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Modelos gratuitos são priorizados no topo. Padrão:{" "}
                        <span className="font-mono text-[var(--primary)]">{defaultModel}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                      API Key do OpenRouter (para listar modelos)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="input-field flex-1"
                      />
                      <button
                        onClick={() => fetchModels()}
                        disabled={isLoadingModels}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isLoadingModels ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4">
                    <label className="text-sm font-medium mb-2 block">
                      Chaves de Backup (Fallback automatico)
                    </label>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      Se uma chave falhar, o sistema usa a proxima automaticamente.
                    </p>

                    {apiKeys.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {apiKeys.map((key, i) => (
                          <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                            <span className="text-xs text-[var(--text-secondary)] w-6">#{i + 1}</span>
                            <span className="text-sm font-mono flex-1 truncate">...{key.slice(-8)}</span>
                            <button
                              onClick={() => removeApiKey(key)}
                              className="text-xs text-[var(--danger)] hover:text-[var(--danger)]/80 px-2 py-1"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        placeholder="Adicionar nova chave sk-or-v1-..."
                        className="input-field flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newKeyValue.trim()) {
                            addApiKey(newKeyValue.trim());
                            setNewKeyValue("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newKeyValue.trim()) {
                            addApiKey(newKeyValue.trim());
                            setNewKeyValue("");
                          }
                        }}
                        disabled={!newKeyValue.trim()}
                        className="px-4 py-2 bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30 rounded-lg hover:bg-[var(--accent-green)]/30 transition-colors disabled:opacity-50 whitespace-nowrap text-sm font-medium"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                      Buscar Modelo
                    </label>
                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar modelo (ex: gemini, free, claude, deepseek)..."
                        className="input-field w-full pl-10"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>

                  {isLoadingModels && (
                    <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-secondary)]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Carregando modelos...</span>
                    </div>
                  )}

                  {fetchError && !isLoadingModels && (
                    <div className="bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg p-4 text-center">
                      <p className="text-[var(--accent-red)] text-sm">{fetchError}</p>
                      <button
                        onClick={() => fetchModels()}
                        className="mt-2 text-sm text-[var(--primary)] hover:underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {!isLoadingModels && !fetchError && (
                    <div className="max-h-80 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                      {models.map((model, index) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                            selectedModel === model.id
                              ? "bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]"
                              : "hover:bg-[var(--surface-hover)] border-l-2 border-transparent"
                          }`}
                        >
                          {index < 3 && (
                            <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                              index === 0 ? "bg-yellow-500/20 text-yellow-400"
                              : index === 1 ? "bg-gray-400/20 text-gray-300"
                              : "bg-orange-500/20 text-orange-400"
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          {index >= 3 && (
                            <span className="w-6 h-6 rounded-full text-[11px] font-medium flex items-center justify-center flex-shrink-0 bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                              {index + 1}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold truncate ${
                                  selectedModel === model.id
                                    ? "text-[var(--primary)]"
                                    : "text-white"
                                }`}
                              >
                                {model.name || model.id}
                              </span>
                              {model.isFree && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--accent-green)]/20 text-[var(--accent-green)] whitespace-nowrap">
                                  GRÁTIS
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] font-mono block mt-0.5 select-all">
                              {model.id}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-mono whitespace-nowrap flex-shrink-0 ${
                              model.isFree
                                ? "text-[var(--accent-green)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                          >
                            {model.displayPrice}
                          </span>
                        </button>
                      ))}

                      {models.length === 0 && searchQuery && (
                        <div className="py-8 text-center text-[var(--text-secondary)]">
                          Nenhum modelo encontrado para &quot;{searchQuery}&quot;
                        </div>
                      )}

                      {models.length === 0 && !searchQuery && (
                        <div className="py-8 text-center text-[var(--text-secondary)]">
                          Nenhum modelo disponível
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-orange)]" />
                  Dicas
                </h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Modelos ranqueados por popularidade semanal do OpenRouter
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Copie e cole o ID do modelo direto do OpenRouter para buscar
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    Modelos GRÁTIS priorizados na geração automática
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-green)] mt-0.5" />
                    A API Key é salva apenas no seu navegador
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">
                Preferências de Notificação
              </h2>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {key === "email"
                          ? "Notificações por E-mail"
                          : key === "push"
                          ? "Notificações Push"
                          : key === "updates"
                          ? "Atualizações do Sistema"
                          : "Marketing e Novidades"}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {key === "email"
                          ? "Receba resumos e alertas importantes"
                          : key === "push"
                          ? "Alertas em tempo real no navegador"
                          : key === "updates"
                          ? "Novidades e melhorias da plataforma"
                          : "Dicas, tutoriais e ofertas especiais"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Preferências Gerais</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    Idioma
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        language: e.target.value,
                      }))
                    }
                    className="input-field"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                    Tema
                  </label>
                  <div className="flex gap-3">
                    {["dark", "light", "system"].map((theme) => (
                      <button
                        key={theme}
                        onClick={() =>
                          setPreferences((prev) => ({ ...prev, theme }))
                        }
                        className={`flex-1 p-3 rounded-xl transition-all capitalize ${
                          preferences.theme === theme
                            ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                            : "bg-[var(--surface)] border border-transparent hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"}{" "}
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl">
                  <div>
                    <p className="font-medium">Salvamento Automático</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Salvar projetos automaticamente a cada 30 segundos
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.autosave}
                      onChange={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          autosave: !prev.autosave,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl">
                  <div>
                    <p className="font-medium">Exportação em Alta Qualidade</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Preferência por qualidade máxima ao exportar
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.highQuality}
                      onChange={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          highQuality: !prev.highQuality,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Segurança & Privacidade</h2>
              <div className="space-y-4">
                <div className="p-4 bg-[var(--surface)] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-[var(--accent-green)]" />
                    <p className="font-medium">Armazenamento Local</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Todos os seus projetos e dados são salvos apenas no seu
                    dispositivo. Nada é enviado para servidores externos.
                  </p>
                </div>

                <div className="p-4 bg-[var(--surface)] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Key className="w-5 h-5 text-[var(--primary)]" />
                    <p className="font-medium">Criptografia de Chaves</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Suas chaves de API são criptografadas localmente usando
                    AES-256 antes de serem salvas no navegador.
                  </p>
                </div>

                <div className="p-4 bg-[var(--surface)] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-[var(--accent-cyan)]" />
                    <p className="font-medium">Modo Offline</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    A plataforma funciona completamente offline. Conexão com a
                    internet é necessária apenas para publicar e usar IAs.
                  </p>
                </div>

                <div className="p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-[var(--accent-red)]" />
                    <p className="font-medium text-[var(--accent-red)]">
                      Zona de Perigo
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Excluir todos os dados locais. Esta ação não pode ser
                    desfeita.
                  </p>
                  <button className="px-4 py-2 bg-[var(--accent-red)] text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors text-sm font-medium">
                    Excluir Todos os Dados
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
