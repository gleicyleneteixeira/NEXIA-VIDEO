"use client";

import { useState } from "react";
import { useBusinessStore } from "@/lib/business/business-store";
import type { BusinessProfile, StudioProfile } from "@/lib/business/types";
import { Briefcase } from "lucide-react";
import ProfileSaveBar from "@/components/business/ProfileSaveBar";

export default function BusinessProfileView({ profile }: { profile: StudioProfile }) {
  const updateBusiness = useBusinessStore((s) => s.updateBusiness);
  const [draft, setDraft] = useState<BusinessProfile>(() => ({ ...profile.business }));

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(profile.business);

  const setField = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const fields: {
    key: "sobre" | "publicoAlvo" | "dores" | "objetivos" | "nicho" | "servico" | "beneficio";
    label: string;
    placeholder: string;
    hint: string;
    rows?: number;
  }[] = [
    {
      key: "sobre",
      label: "Sobre o seu negócio",
      placeholder: "Descreva os serviços e produtos oferecidos...",
      hint: "O que a sua empresa faz, para quem e como se diferencia.",
      rows: 3,
    },
    {
      key: "publicoAlvo",
      label: "Público-alvo",
      placeholder: "Quem é o cliente ideal?",
      hint: "Idade, profissão, contexto e interesses do cliente ideal.",
      rows: 2,
    },
    {
      key: "dores",
      label: "Necessidades e Desafios (Dores)",
      placeholder: "Quais problemas centrais você resolve?",
      hint: "Dores que aparecerão nos ganchos e textos dos posts.",
      rows: 2,
    },
    {
      key: "objetivos",
      label: "Objetivos e Motivações",
      placeholder: "O que o seu cliente deseja alcançar?",
      hint: "Metas e resultados que motivam a audiência a seguir você.",
      rows: 2,
    },
    {
      key: "nicho",
      label: "Nicho (palavra-chave)",
      placeholder: "Ex: bancario, imobiliaria, advocacia...",
      hint: "Usado para mapear fotos de estoque e hashtags.",
    },
    {
      key: "servico",
      label: "Serviço / Produto",
      placeholder: "Ex: Curso online, Consultoria...",
      hint: "Entra no corpo dos textos e nas chamadas para ação.",
    },
    {
      key: "beneficio",
      label: "Benefício principal",
      placeholder: "Ex: Economizar 10h por semana",
      hint: "O resultado mais desejado pelo seu público.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-[var(--primary)]" />
        <h2 className="text-lg font-bold text-white">DNA do seu Negócio</h2>
        <span className="text-[11px] text-gray-500 ml-auto">
          Essas informações alimentam os textos de todos os posts
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={field.rows ? "sm:col-span-2" : ""}>
            <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
            {field.rows ? (
              <textarea
                value={draft[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={draft[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl bg-[#252535] border border-gray-700 text-white placeholder-gray-500 focus:border-[var(--primary)] outline-none transition-all"
              />
            )}
            <p className="text-[11px] text-gray-500 mt-1">{field.hint}</p>
          </div>
        ))}
      </div>

      <ProfileSaveBar
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={() => updateBusiness(profile.id, draft)}
        onReset={() => setDraft({ ...profile.business })}
        activeProfileName={profile.name || "perfil atual"}
      />
    </div>
  );
}
