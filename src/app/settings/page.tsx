"use client";

import { useState } from "react";
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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("api");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
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
    setSavedKeys((prev) => ({ ...prev, [provider]: true }));
    setTimeout(() => {
      setSavedKeys((prev) => ({ ...prev, [provider]: false }));
    }, 2000);
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const tabs = [
    { id: "api", label: "API Keys", icon: Key },
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
                        <div className="relative">
                          <input
                            type={showKeys[provider.id] ? "text" : "password"}
                            value={apiKeys[provider.id] || ""}
                            onChange={(e) =>
                              setApiKeys((prev) => ({
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
