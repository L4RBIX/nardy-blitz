"use client";

import { useState } from "react";
import { SKINS, isProPreviewUnlocked, setSelectedSkin } from "../lib/pro";
import type { BoardSkin } from "../lib/pro";
import { ProModal } from "./ProModal";

interface SkinSelectorProps {
  selected: BoardSkin;
  onSelect: (skin: BoardSkin) => void;
}

export function SkinSelector({ selected, onSelect }: SkinSelectorProps) {
  const [proModalOpen, setProModalOpen] = useState(false);
  const [previewUnlocked, setPreviewUnlocked] = useState(() => isProPreviewUnlocked());

  function handleSkinClick(skin: BoardSkin) {
    const meta = SKINS.find((s) => s.id === skin);
    if (meta?.isPro && !previewUnlocked) {
      setProModalOpen(true);
      return;
    }
    setSelectedSkin(skin);
    onSelect(skin);
  }

  function handlePreviewUnlocked() {
    setPreviewUnlocked(true);
  }

  return (
    <>
      <div
        className="glass rounded-2xl p-3"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <h3
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: "var(--text-dim)" }}
          >
            Board Skin
          </h3>
          {!previewUnlocked && (
            <button
              onClick={() => setProModalOpen(true)}
              className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded cursor-pointer"
              style={{
                background: "rgba(217,119,6,0.08)",
                border: "1px solid rgba(217,119,6,0.15)",
                color: "var(--gold-bright)",
              }}
            >
              Pro
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SKINS.map((skin) => {
            const isLocked = skin.isPro && !previewUnlocked;
            const isSelected = selected === skin.id;

            return (
              <button
                key={skin.id}
                onClick={() => handleSkinClick(skin.id)}
                title={`${skin.label}${isLocked ? " (Pro)" : ""}`}
                className="relative flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all duration-150 cursor-pointer group"
                style={{
                  background: isSelected
                    ? "rgba(217,119,6,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isSelected ? "rgba(217,119,6,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
                aria-label={skin.label}
              >
                {/* Color swatch — two-tone triangle preview */}
                <div
                  className="w-full rounded-md overflow-hidden flex-shrink-0"
                  style={{ height: 24, position: "relative" }}
                >
                  <div
                    style={{
                      position: "absolute", inset: 0,
                      background: skin.swatchA,
                      clipPath: "polygon(0 0, 100% 0, 0 100%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute", inset: 0,
                      background: skin.swatchB,
                      clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                    }}
                  />
                  {/* Lock icon overlay */}
                  {isLocked && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(5,10,18,0.55)" }}
                    >
                      <svg width="8" height="9" viewBox="0 0 8 9" fill="none" aria-hidden>
                        <rect x="1" y="4" width="6" height="4.5" rx="1" fill="rgba(217,119,6,0.7)"/>
                        <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="rgba(217,119,6,0.7)" strokeWidth="1.2"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Skin name */}
                <span
                  className="font-mono text-[7px] tracking-wide leading-none text-center w-full truncate"
                  style={{ color: isSelected ? "var(--gold-bright)" : "var(--text-dim)" }}
                >
                  {skin.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ProModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        onPreviewUnlocked={handlePreviewUnlocked}
      />
    </>
  );
}
