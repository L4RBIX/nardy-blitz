"use client";

import { useState } from "react";
import { ProModal } from "./ProModal";
import { isProPreviewUnlocked } from "../lib/pro";

interface UpgradeProButtonProps {
  onPreviewUnlocked?: () => void;
  /** compact = small inline button, default = medium button */
  variant?: "compact" | "default";
}

export function UpgradeProButton({ onPreviewUnlocked, variant = "default" }: UpgradeProButtonProps) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(() => isProPreviewUnlocked());

  function handleUnlocked() {
    setUnlocked(true);
    onPreviewUnlocked?.();
  }

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] tracking-wider transition-colors duration-150 cursor-pointer"
          style={{
            background: unlocked ? "rgba(16,185,129,0.08)" : "rgba(217,119,6,0.08)",
            border: `1px solid ${unlocked ? "rgba(16,185,129,0.18)" : "rgba(217,119,6,0.18)"}`,
            color: unlocked ? "#10B981" : "var(--gold-bright)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: unlocked ? "#10B981" : "var(--gold-bright)" }}
          />
          {unlocked ? "Pro Preview" : "Upgrade Pro"}
        </button>

        <ProModal isOpen={open} onClose={() => setOpen(false)} onPreviewUnlocked={handleUnlocked} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-sm font-medium tracking-wide transition-all duration-150 cursor-pointer"
        style={{
          background: unlocked ? "rgba(16,185,129,0.08)" : "rgba(217,119,6,0.08)",
          border: `1px solid ${unlocked ? "rgba(16,185,129,0.2)" : "rgba(217,119,6,0.2)"}`,
          color: unlocked ? "#10B981" : "var(--gold-bright)",
        }}
      >
        {unlocked ? "Pro Preview" : "Upgrade to Pro"}
        {!unlocked && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] tracking-wider font-mono"
            style={{ background: "rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
          >
            990 ₸
          </span>
        )}
      </button>

      <ProModal isOpen={open} onClose={() => setOpen(false)} onPreviewUnlocked={handleUnlocked} />
    </>
  );
}
