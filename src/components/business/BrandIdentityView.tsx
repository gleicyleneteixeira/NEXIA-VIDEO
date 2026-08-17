"use client";

import { useState } from "react";
import { useBusinessStore } from "@/lib/business/business-store";
import type { BrandIdentity, StudioProfile } from "@/lib/business/types";
import { FONT_FAMILIES, PRESET_THEMES } from "@/lib/business/types";
import { Palette, Upload, Loader2, Trash2, AtSign, Type } from "lucide-react";
import {
  detectLogoBackground,
  removeLogoSolidBackground,
} from "@/lib/branding/logoProcessor";
import ProfileSaveBar from "@/components/business/ProfileSaveBar";

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });

export default function BrandIdentityView({ profile }: { profile: StudioProfile }) {
  const updateBrand = useBusinessStore((s) => s.updateBrand);
  const [draft, setDraft] = useState<BrandIdentity>(() => ({ ...profile.brand }));
  const [processing, setProcessing] = useState(false);
  const [detectedColor, setDetectedColor] = useState<string | null>(null);

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(profile.brand);

  const setBrandField = <K extends keyof BrandIdentity>(key: K, value: BrandIdentity[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProcessing(true);
    try {
      const original = await fileToDataUrl(file);
      const bg = await detectLogoBackground(original);
      setDetectedColor(bg);
      const transparent = await removeLogoSolidBackground(original, {
        tolerance: draft.tolerance,
      });
      setDraft((d) => ({
        ...d,
        logoDataUrl: transparent,
        logoOriginalUrl: original,
        logoName: file.name,
      }));
    } catch {
      alert("Não foi possível processar a logo.");
    } finally {
      setProcessing(false);
    }
  };

  const handleTolerance = async (value: number) => {
    setBrandField("tolerance", value);
    if (!draft.logoOriginalUrl) return;
    try {
      const transparent = await removeLogoSolidBackground(draft.logoOriginalUrl, {
        tolerance: value,
      });
      setBrandField("logoDataUrl", transparent);
    } catch {
      /* mantém a versão atual */
    }
  };

  const colorFields: { key: "primaryColor" | "textColor" | "accentColor"; label: string }[] = [
    { key: "primaryColor", label: "Cor principal (fundo/degradê)" },
    { key: "textColor", label: "Cor do texto (títulos e apoio)" },
    { key: "accentColor", label: "Cor de destaque (badges, tags e @)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-[var(--primary)]" />
        <h2 className="text-lg font-bold text-white">Identidade Visual</h2>
      </div>

      {/* Cores da marca */}
      <div className="bg-[#252535] border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-white">Cores da Marca</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {colorFields.map((field) => (
            <label key={field.key} className="block">
              <span className="block text-[11px] text-gray-400 mb-1">{field.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft[field.key]}
                  onChange={(e) => setBrandField(field.key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={draft[field.key]}
                  onChange={(e) => setBrandField(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1c1c28] border border-gray-700 text-white text-xs font-mono uppercase focus:border-[var(--primary)] outline-none"
                />
              </div>
            </label>
          ))}
        </div>

        <div>
          <span className="block text-[11px] text-gray-400 mb-2">Temas pré-definidos</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => {
                  setBrandField("primaryColor", theme.primary);
                  setBrandField("textColor", theme.text);
                  setBrandField("accentColor", theme.accent);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 hover:border-[var(--primary)] transition-colors"
                title={theme.name}
              >
                <span className="flex -space-x-1">
                  <span className="w-4 h-4 rounded-full border border-black/30" style={{ backgroundColor: theme.primary }} />
                  <span className="w-4 h-4 rounded-full border border-black/30" style={{ backgroundColor: theme.accent }} />
                </span>
                <span className="text-[11px] text-gray-300">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fonte */}
      <div className="bg-[#252535] border border-gray-800 rounded-xl p-5">
        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2">
          <Type className="w-4 h-4 text-[var(--primary)]" /> Fonte principal
        </label>
        <select
          value={draft.fontFamily}
          onChange={(e) => setBrandField("fontFamily", e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-[#1c1c28] border border-gray-700 text-white text-sm focus:border-[var(--primary)] outline-none"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Logo */}
      <div className="bg-[#252535] border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-[var(--primary)]" /> Logo com remoção instantânea de fundo
        </h3>
        <label className="block">
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <span className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-gray-600 text-xs text-gray-300 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer">
            {processing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> {draft.logoName || "Enviar logo"}
              </>
            )}
          </span>
        </label>

        {draft.logoDataUrl && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg overflow-hidden bg-black/40 p-2 flex flex-col items-center gap-1">
                <img src={draft.logoOriginalUrl} alt="Logo original" className="max-h-16 object-contain" />
                <span className="text-[9px] text-gray-500">Original</span>
              </div>
              <div className="rounded-lg overflow-hidden bg-[repeating-conic-gradient(#1a1a2a_0%_25%,#0d0d16_0%_50%)] bg-[length:12px_12px] p-2 flex flex-col items-center gap-1">
                <img src={draft.logoDataUrl} alt="Logo sem fundo" className="max-h-16 object-contain" />
                <span className="text-[9px] text-gray-500">
                  Sem fundo{" "}
                  {detectedColor ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: detectedColor }} />
                      {detectedColor}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
            <label className="block text-[11px] text-gray-400 mb-1">
              Tolerância do recorte: {draft.tolerance}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.tolerance}
              onChange={(e) => handleTolerance(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <button
              onClick={() => {
                setBrandField("logoDataUrl", undefined);
                setBrandField("logoOriginalUrl", undefined);
                setBrandField("logoName", undefined);
                setDetectedColor(null);
              }}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remover logo
            </button>
          </>
        )}
      </div>

      {/* Perfil do Instagram */}
      <div className="bg-[#252535] border border-gray-800 rounded-xl p-5">
        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2">
          <AtSign className="w-4 h-4 text-[var(--primary)]" /> Perfil do Instagram
        </label>
        <input
          type="text"
          value={draft.handle}
          onChange={(e) => setBrandField("handle", e.target.value)}
          placeholder="@seu.perfil"
          className="w-full px-4 py-3 rounded-xl bg-[#1c1c28] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Esse @ aparece estilizado no rodapé de todas as artes.
        </p>
      </div>

      <ProfileSaveBar
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={() => updateBrand(profile.id, draft)}
        onReset={() => setDraft({ ...profile.brand })}
        activeProfileName={profile.name || "perfil atual"}
      />
    </div>
  );
}
