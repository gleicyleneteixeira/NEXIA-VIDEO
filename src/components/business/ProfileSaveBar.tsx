"use client";

import { useState } from "react";
import { CheckCircle2, Save, AlertCircle, XCircle } from "lucide-react";

interface ProfileSaveBarProps {
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void> | void;
  onReset?: () => void;
  activeProfileName: string;
}

export default function ProfileSaveBar({
  hasUnsavedChanges,
  onSave,
  onReset,
  activeProfileName,
}: ProfileSaveBarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveClick = async () => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      await onSave();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setErrorMsg("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Toast Flutuante de Sucesso */}
      {showSuccess && (
        <div className="fixed bottom-24 right-8 z-50 flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold">Perfil salvo com sucesso!</p>
            <p className="text-xs text-emerald-300/80">
              Configurações aplicadas para {activeProfileName}
            </p>
          </div>
        </div>
      )}

      {/* Toast Flutuante de Erro */}
      {errorMsg && (
        <div className="fixed bottom-40 right-8 z-50 flex items-center gap-3 bg-red-950/90 border border-red-500/50 text-red-200 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-sm font-semibold">Erro ao salvar</p>
            <p className="text-xs text-red-300/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Barra de Ação no Rodapé do Form */}
      <div className="sticky bottom-4 z-30 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#121218]/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs">
          {hasUnsavedChanges ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <AlertCircle className="w-4 h-4" /> Alterações pendentes de salvamento
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Perfil sincronizado no armazenamento
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descartar Alterações
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Perfil"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
