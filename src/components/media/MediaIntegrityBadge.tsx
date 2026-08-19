"use client";

/**
 * MediaIntegrityBadge — indicador visual de disponibilidade da mídia de um card
 * (Timeline / Galeria). Informa se o binário está salvo localmente no vault
 * (IndexedDB), acessível via URL permanente (MinIO/S3) ou indisponível.
 */

export type MediaIntegrityStatus = "local" | "cloud" | "missing";

export function getMediaIntegrityStatus(
  hasLocalBlob: boolean,
  remoteUrl: string | null | undefined
): MediaIntegrityStatus {
  if (hasLocalBlob) return "local";
  if (remoteUrl && typeof remoteUrl === "string" && /^https?:/.test(remoteUrl)) {
    return "cloud";
  }
  return "missing";
}

export default function MediaIntegrityBadge({
  hasLocalBlob,
  remoteUrl,
  size = "xs",
}: {
  hasLocalBlob: boolean;
  remoteUrl: string | null | undefined;
  size?: "xs" | "sm";
}) {
  const status = getMediaIntegrityStatus(hasLocalBlob, remoteUrl);

  const base =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]";

  if (status === "local") {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${base}`}
        title="Binario salvo localmente (IndexedDB) — reproduzivel mesmo apos reload"
      >
        ✓ Local
      </span>
    );
  }

  if (status === "cloud") {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ${base}`}
        title="Midia na nuvem (MinIO/S3) — URL permanente"
      >
        ☁ Nuvem
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${base}`}
      title="Midia nao disponivel nesta sessao — recarregue o arquivo se necessario"
    >
      ⚠️ Indisponivel
    </span>
  );
}