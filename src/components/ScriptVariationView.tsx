"use client";

import { useState } from "react";
import ContentCard, { Variation } from "@/components/ContentCard";
import FragmentedView from "@/components/FragmentedView";

interface ScriptVariationViewProps {
  variations: Variation[];
  theme: string;
  viewMode: "video" | "fragmented";
  onSendToTimeline?: (variation: Variation, index: number) => void;
  onPolish?: (variation: Variation, index: number) => Promise<void>;
}

export default function ScriptVariationView({
  variations,
  theme,
  viewMode,
  onSendToTimeline,
  onPolish,
}: ScriptVariationViewProps) {
  const [polishingIdx, setPolishingIdx] = useState<number | null>(null);

  const handlePolish = async (variation: Variation, index: number) => {
    if (!onPolish || polishingIdx !== null) return;
    setPolishingIdx(index);
    try {
      await onPolish(variation, index);
    } catch {
      /* erro tratado no chamador (page) */
    } finally {
      setPolishingIdx(null);
    }
  };

  if (viewMode === "fragmented") {
    return <FragmentedView variations={variations} />;
  }

  return (
    <div className="space-y-4">
      {variations.map((v, i) => (
        <ContentCard
          key={`${v.headline}-${i}`}
          index={i}
          variation={v}
          theme={theme}
          isPolishing={polishingIdx === i}
          onSendToTimeline={onSendToTimeline}
          onPolish={handlePolish}
        />
      ))}
    </div>
  );
}