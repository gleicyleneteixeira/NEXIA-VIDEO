"use client";
import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "@/lib/editor";
import type { Project } from "@/lib/editor";
import { Cloud, CloudOff, Upload, Download, Trash2, RefreshCw, Save, FolderOpen, Check, AlertCircle, Loader2, Smartphone, Monitor, Globe } from "lucide-react";

interface CloudProject {
  id: string;
  name: string;
  cloudId: string;
  updatedAt: string;
  size: string;
  thumbnailColor: string;
  devices: ("pc" | "phone" | "web")[];
}

const MOCK_CLOUD_PROJECTS: CloudProject[] = [
  { id: "1", name: "Meu Vídeo Legal", cloudId: "cloud-1", updatedAt: "2h atrás", size: "1.2 MB", thumbnailColor: "#8b5cf6", devices: ["pc", "phone"] },
  { id: "2", name: "Tutorial React", cloudId: "cloud-2", updatedAt: "1d atrás", size: "3.4 MB", thumbnailColor: "#3b82f6", devices: ["pc", "web"] },
  { id: "3", name: "Reels Dance", cloudId: "cloud-3", updatedAt: "3d atrás", size: "0.8 MB", thumbnailColor: "#ec4899", devices: ["phone"] },
  { id: "4", name: "Apresentação Empresa", cloudId: "cloud-4", updatedAt: "1w atrás", size: "2.1 MB", thumbnailColor: "#10b981", devices: ["pc", "phone", "web"] },
  { id: "5", name: "Vlog Viagem", cloudId: "cloud-5", updatedAt: "2w atrás", size: "4.5 MB", thumbnailColor: "#f59e0b", devices: ["pc"] },
];

export default function CloudStorage() {
  const { project, updateProjectName } = useProjectStore();
  const [isConnected, setIsConnected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [loadedList, setLoadedList] = useState<CloudProject[]>(MOCK_CLOUD_PROJECTS);
  const [autoSave, setAutoSave] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Há 5 minutos");
  const [pendingChanges, setPendingChanges] = useState(3);
  const [storageUsed, setStorageUsed] = useState("2.3 MB");
  const [storageTotal, setStorageTotal] = useState("50 MB");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [loadLoading, setLoadLoading] = useState<string | null>(null);

  const handleSaveToCloud = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const cloudId = `cloud-${Date.now()}`;
    updateProjectName(project.name);
    
    setIsSaving(false);
    setSaveSuccess(true);
    setLastSyncTime("Agora");
    setPendingChanges(0);
    
    setTimeout(() => setSaveSuccess(false), 2000);
  }, [isSaving, project.name, updateProjectName]);

  const handleLoadProject = useCallback(async (cloudProject: CloudProject) => {
    setLoadLoading(cloudProject.id);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoadLoading(null);
  }, []);

  const handleDeleteProject = useCallback(async (cloudProject: CloudProject) => {
    setDeleteLoading(cloudProject.id);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoadedList((prev) => prev.filter((p) => p.id !== cloudProject.id));
    setDeleteLoading(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsSavingList(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSavingList(false);
    setLastSyncTime("Agora");
  }, []);

  const getDeviceIcon = (device: "pc" | "phone" | "web") => {
    switch (device) {
      case "pc":
        return <Monitor className="w-3 h-3" />;
      case "phone":
        return <Smartphone className="w-3 h-3" />;
      case "web":
        return <Globe className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d16]">
      <div className="p-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#8b5cf6]" />
            <h2 className="text-sm font-semibold text-white">Cloud Storage</h2>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400">Conectado</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-red-400">Desconectado</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Salvando..." : saveSuccess ? "Salvo!" : "Salvar na Nuvem"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isSavingList}
            className="px-3 py-2.5 bg-[#1e1e2e] hover:bg-[#2a2a3e] disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSavingList ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Status de Sincronização</span>
          <span className="text-xs text-gray-400">{lastSyncTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Alterações pendentes</span>
          <span className={`text-xs ${pendingChanges > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {pendingChanges > 0 ? `${pendingChanges} pendente(s)` : "Sincronizado"}
          </span>
        </div>
      </div>

      <div className="p-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Armazenamento</span>
          <span className="text-xs text-gray-400">{storageUsed} / {storageTotal}</span>
        </div>
        <div className="w-full h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] rounded-full transition-all duration-500"
            style={{ width: `${(parseFloat(storageUsed) / parseFloat(storageTotal)) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Auto-save (5 min)</span>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`relative w-10 h-5 rounded-full transition-colors ${autoSave ? "bg-[#8b5cf6]" : "bg-[#1e1e2e]"}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoSave ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Projetos Recentes</span>
          <span className="text-xs text-gray-500">{loadedList.length} projeto(s)</span>
        </div>

        <div className="space-y-2">
          {loadedList.map((cloudProject) => (
            <div
              key={cloudProject.id}
              className="bg-[#13131f] border border-[#1e1e2e] rounded-lg p-3 hover:border-[#8b5cf6]/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-md flex-shrink-0"
                  style={{ backgroundColor: cloudProject.thumbnailColor }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{cloudProject.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{cloudProject.updatedAt}</span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">{cloudProject.size}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {cloudProject.devices.map((device) => (
                      <span
                        key={device}
                        className="p-1 bg-[#1e1e2e] rounded text-gray-400"
                      >
                        {getDeviceIcon(device)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLoadProject(cloudProject)}
                    disabled={loadLoading === cloudProject.id}
                    className="p-1.5 text-gray-400 hover:text-[#8b5cf6] hover:bg-[#1e1e2e] rounded transition-colors"
                  >
                    {loadLoading === cloudProject.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderOpen className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteProject(cloudProject)}
                    disabled={deleteLoading === cloudProject.id}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1e1e2e] rounded transition-colors"
                  >
                    {deleteLoading === cloudProject.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loadedList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CloudOff className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">Nenhum projeto salvo na nuvem</p>
            <p className="text-xs text-gray-600 mt-1">Salve seu primeiro projeto acima</p>
          </div>
        )}
      </div>
    </div>
  );
}