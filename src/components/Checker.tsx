"use client";

import { motion } from "framer-motion";
import type { Player } from "../types";

interface CheckerProps {
  player: Player;
  count?: number;
  isSelected?: boolean;
  isMovable?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}

export function Checker({
  player,
  count = 1,
  isSelected = false,
  isMovable = false,
  size = "md",
  onClick,
}: CheckerProps) {
  const isWhite = player === "white";
  const dim = size === "sm" ? "w-5 h-5" : "w-8 h-8 sm:w-9 sm:h-9";
  const textSize = size === "sm" ? "text-[8px]" : "text-[10px]";

  return (
    <motion.button
      onClick={onClick}
      disabled={!isMovable && !isSelected}
      /* animate skill: spring physics for interruptible feel */
      whileHover={isMovable ? { scale: 1.12, y: -1 } : {}}
      whileTap={isMovable ? { scale: 0.94 } : {}}
      animate={
        isSelected
          ? { scale: 1.15, y: -2 }
          : { scale: 1, y: 0 }
      }
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={[
        dim,
        "rounded-full flex items-center justify-center font-semibold select-none relative",
        !isMovable && !isSelected ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      style={{
        /* Ivory / Obsidian gradients */
        background: isWhite
          ? "linear-gradient(145deg, #F8F0E0 0%, #E8DCC8 40%, #CFC0A0 100%)"
          : "linear-gradient(145deg, #1E1E1E 0%, #101010 50%, #050505 100%)",
        /* Selection ring — gold (not cyan) */
        boxShadow: isSelected
          ? "0 0 0 2px var(--gold-bright), 0 0 16px rgba(245,158,11,0.45), 0 4px 12px rgba(0,0,0,0.5)"
          : isMovable
          ? "0 0 0 1.5px rgba(217,119,6,0.5), 0 0 10px rgba(217,119,6,0.2), 0 3px 8px rgba(0,0,0,0.4)"
          : isWhite
          ? "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)"
          : "0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        border: isWhite
          ? "1px solid rgba(200,185,155,0.8)"
          : "1px solid rgba(50,50,50,0.9)",
      }}
      aria-label={`${player} checker${count > 1 ? `, ${count} stacked` : ""}`}
    >
      {count > 1 && (
        <span
          className={`${textSize} font-bold leading-none font-mono z-10 relative`}
          style={{ color: isWhite ? "#5a4a30" : "#808080" }}
        >
          {count}
        </span>
      )}

      {/* Inner specular highlight — premium glass look */}
      <span
        className="absolute inset-[3px] rounded-full pointer-events-none"
        style={{
          background: isWhite
            ? "linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
        }}
      />
    </motion.button>
  );
}
