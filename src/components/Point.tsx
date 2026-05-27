"use client";

import { motion } from "framer-motion";
import type { Player, PointIndex, BoardPointIndex } from "../types";
import { Checker } from "./Checker";

interface PointProps {
  index: BoardPointIndex;
  checkers: Player[];
  isTop: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isLegalSource: boolean;
  onSelect: (idx: PointIndex) => void;
  onMove: (idx: PointIndex) => void;
  /** Optional skin color overrides — if omitted uses classic felt colors */
  triGradA?: string;
  triGradB?: string;
}

export function Point({
  index,
  checkers,
  isTop,
  isSelected,
  isLegalTarget,
  isLegalSource,
  onSelect,
  onMove,
  triGradA,
  triGradB,
}: PointProps) {
  const isFelt = index % 2 === 0;

  const gradA = triGradA ??
    "linear-gradient(180deg, rgba(21,128,61,0.35) 0%, rgba(15,90,42,0.2) 100%)";
  const gradB = triGradB ??
    "linear-gradient(180deg, rgba(80,40,12,0.4) 0%, rgba(50,25,8,0.25) 100%)";

  const handleClick = () => {
    if (isLegalTarget) onMove(index);
    else if (isLegalSource) onSelect(index);
  };

  const stackCount = checkers.length;

  return (
    <div
      onClick={handleClick}
      className={[
        "relative flex flex-col items-center w-full h-full",
        isTop ? "justify-start pt-1" : "justify-end pb-1",
        isLegalTarget || isLegalSource ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {/* Triangle */}
      <div className="absolute inset-0 pointer-events-none">
        {isTop ? (
          <div
            className="w-full h-full"
            style={{
              clipPath: "polygon(50% 80%, 0% 0%, 100% 0%)",
              background: isFelt ? gradA : gradB,
            }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              clipPath: "polygon(50% 20%, 0% 100%, 100% 100%)",
              background: isFelt ? gradA : gradB,
            }}
          />
        )}
      </div>

      {/* Legal target — gold glow (not cyan) */}
      {isLegalTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: "radial-gradient(ellipse at center, rgba(217,119,6,0.14) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Point number */}
      <span
        className={[
          "absolute font-mono text-[7px] select-none z-20",
          isTop ? "bottom-0.5" : "top-0.5",
        ].join(" ")}
        style={{ color: "rgba(217,119,6,0.2)" }}
      >
        {index + 1}
      </span>

      {/* Checker stack */}
      <div
        className={[
          "relative z-20 flex flex-col items-center w-full",
          isTop ? "gap-0.5 pt-1" : "gap-0.5 pb-1",
        ].join(" ")}
      >
        {stackCount > 0 && (
          <Checker
            player={checkers[0]}
            count={stackCount}
            isSelected={isSelected}
            isMovable={isLegalSource}
            onClick={isLegalSource || isSelected ? handleClick : undefined}
          />
        )}
      </div>

      {/* Landing target dot — gold */}
      {isLegalTarget && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={[
            "absolute w-3 h-3 rounded-full z-20 border",
            isTop ? "bottom-5" : "top-5",
          ].join(" ")}
          style={{
            borderColor: "rgba(217,119,6,0.7)",
            background: "rgba(217,119,6,0.15)",
            boxShadow: "0 0 8px rgba(217,119,6,0.3)",
          }}
        />
      )}
    </div>
  );
}
