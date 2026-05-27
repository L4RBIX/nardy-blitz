"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Player, GameMode } from "../types";

interface TurnIndicatorProps {
  turn: Player;
  winner: Player | null;
  mode: GameMode;
  humanPlayer?: Player;
}

export function TurnIndicator({ turn, winner, mode, humanPlayer }: TurnIndicatorProps) {
  const effectiveHuman = humanPlayer ?? "white";

  if (winner) {
    const youWon = mode === "vs-bot" && winner === effectiveHuman;
    const botWon = mode === "vs-bot" && winner !== effectiveHuman;
    const label = youWon ? "You win!" : botWon ? "Bot wins" :
                  winner === "white" ? "White wins" : "Black wins";
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-1 py-3 px-4 rounded-2xl"
        style={{
          background: youWon ? "rgba(5,150,105,0.10)" : "rgba(21,128,61,0.08)",
          border: youWon ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(21,128,61,0.2)",
        }}
      >
        <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--green)" }}>
          Game Over
        </span>
        <span className="font-sans font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
      </motion.div>
    );
  }

  const isHumanTurn = mode === "2player" || turn === effectiveHuman;
  const isWhiteTurn = turn === "white";
  const label = mode === "vs-bot"
    ? isHumanTurn ? "Your turn" : "Bot is thinking"
    : isWhiteTurn ? "White to play" : "Black to play";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={turn}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 py-2.5 px-4 rounded-2xl"
        style={{
          background: "rgba(14,22,39,0.8)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="w-5 h-5 rounded-full flex-shrink-0 border"
          style={{
            background: isWhiteTurn
              ? "linear-gradient(145deg, #F8F0E0, #CFC0A0)"
              : "linear-gradient(145deg, #1E1E1E, #050505)",
            borderColor: isWhiteTurn ? "rgba(200,185,155,0.6)" : "rgba(60,60,60,0.8)",
            boxShadow: isWhiteTurn
              ? "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)"
              : "0 2px 6px rgba(0,0,0,0.5)",
          }}
        />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
        {mode === "vs-bot" && !isHumanTurn && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full ml-auto"
            style={{ background: "var(--gold)" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
