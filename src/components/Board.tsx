"use client";

import type { GameState, Move, PointIndex, BoardPointIndex } from "../types";
import type { BoardSkin } from "../lib/pro";
import { Point } from "./Point";
import { Checker } from "./Checker";

interface SkinConfig {
  boardBg: string;
  triGradA: string;
  triGradB: string;
  trimTop: string;
  trimBottom: string;
  trimBorder: string;
  barBg: string;
  bearOffBg: string;
}

const SKIN_CONFIGS: Record<BoardSkin, SkinConfig> = {
  classic: {
    boardBg: "linear-gradient(160deg, #071812 0%, #0A1F14 50%, #061010 100%)",
    triGradA: "linear-gradient(180deg, rgba(21,128,61,0.35) 0%, rgba(15,90,42,0.2) 100%)",
    triGradB: "linear-gradient(180deg, rgba(80,40,12,0.4) 0%, rgba(50,25,8,0.25) 100%)",
    trimTop: "linear-gradient(180deg, rgba(217,119,6,0.15) 0%, transparent 100%)",
    trimBottom: "linear-gradient(0deg, rgba(217,119,6,0.15) 0%, transparent 100%)",
    trimBorder: "rgba(217,119,6,0.12)",
    barBg: "linear-gradient(180deg, rgba(4,12,6,0.9) 0%, rgba(2,8,4,0.95) 100%)",
    bearOffBg: "rgba(4,10,6,0.6)",
  },
  obsidian: {
    boardBg: "linear-gradient(160deg, #0A0A0F 0%, #111118 50%, #070709 100%)",
    triGradA: "linear-gradient(180deg, rgba(80,80,120,0.4) 0%, rgba(55,55,90,0.22) 100%)",
    triGradB: "linear-gradient(180deg, rgba(40,40,65,0.45) 0%, rgba(25,25,45,0.25) 100%)",
    trimTop: "linear-gradient(180deg, rgba(148,163,184,0.12) 0%, transparent 100%)",
    trimBottom: "linear-gradient(0deg, rgba(148,163,184,0.12) 0%, transparent 100%)",
    trimBorder: "rgba(148,163,184,0.1)",
    barBg: "linear-gradient(180deg, rgba(5,5,10,0.9) 0%, rgba(3,3,7,0.95) 100%)",
    bearOffBg: "rgba(6,6,12,0.6)",
  },
  emerald: {
    boardBg: "linear-gradient(160deg, #051A0C 0%, #0A2814 50%, #031008 100%)",
    triGradA: "linear-gradient(180deg, rgba(5,100,55,0.55) 0%, rgba(3,70,36,0.28) 100%)",
    triGradB: "linear-gradient(180deg, rgba(3,55,28,0.45) 0%, rgba(2,35,16,0.25) 100%)",
    trimTop: "linear-gradient(180deg, rgba(16,185,129,0.2) 0%, transparent 100%)",
    trimBottom: "linear-gradient(0deg, rgba(16,185,129,0.2) 0%, transparent 100%)",
    trimBorder: "rgba(16,185,129,0.15)",
    barBg: "linear-gradient(180deg, rgba(2,10,5,0.9) 0%, rgba(1,7,3,0.95) 100%)",
    bearOffBg: "rgba(2,10,5,0.6)",
  },
  walnut: {
    boardBg: "linear-gradient(160deg, #160C04 0%, #201008 50%, #100804 100%)",
    triGradA: "linear-gradient(180deg, rgba(130,75,22,0.5) 0%, rgba(90,50,12,0.28) 100%)",
    triGradB: "linear-gradient(180deg, rgba(65,32,8,0.55) 0%, rgba(42,20,5,0.3) 100%)",
    trimTop: "linear-gradient(180deg, rgba(217,167,6,0.18) 0%, transparent 100%)",
    trimBottom: "linear-gradient(0deg, rgba(217,167,6,0.18) 0%, transparent 100%)",
    trimBorder: "rgba(217,167,6,0.14)",
    barBg: "linear-gradient(180deg, rgba(10,5,2,0.9) 0%, rgba(7,3,1,0.95) 100%)",
    bearOffBg: "rgba(10,5,2,0.6)",
  },
};

interface BoardProps {
  state: GameState;
  selectedFrom: PointIndex | null;
  legalMoves: Move[];
  onSelectFrom: (idx: PointIndex) => void;
  onMoveTo: (idx: PointIndex) => void;
  skin?: BoardSkin;
}

export function Board({ state, selectedFrom, legalMoves, onSelectFrom, onMoveTo, skin = "classic" }: BoardProps) {
  const { board } = state;
  const sc = SKIN_CONFIGS[skin];

  const legalSources = new Set(legalMoves.map((m) => m.from));
  const legalTargets = selectedFrom
    ? new Set(legalMoves.filter((m) => m.from === selectedFrom).map((m) => m.to))
    : new Set<PointIndex>();

  const topLeft:  BoardPointIndex[] = [12, 13, 14, 15, 16, 17];
  const topRight: BoardPointIndex[] = [18, 19, 20, 21, 22, 23];
  const botLeft:  BoardPointIndex[] = [11, 10,  9,  8,  7,  6];
  const botRight: BoardPointIndex[] = [ 5,  4,  3,  2,  1,  0];

  const barWhite = board["bar-white"].checkers;
  const barBlack = board["bar-black"].checkers;
  const whiteOff = board["off-white"].checkers.filter((c) => c === "white").length;
  const blackOff = board["off-black"].checkers.filter((c) => c === "black").length;

  const whiteBarIsSource = legalSources.has("bar-white");
  const blackBarIsSource = legalSources.has("bar-black");
  const whiteOffIsTarget = legalTargets.has("off-white");
  const blackOffIsTarget = legalTargets.has("off-black");

  function renderHalf(pts: BoardPointIndex[], isTop: boolean) {
    return pts.map((idx) => (
      <div key={idx} className="flex-1 h-full min-w-0">
        <Point
          index={idx}
          checkers={board[idx].checkers}
          isTop={isTop}
          isSelected={selectedFrom === idx}
          isLegalTarget={legalTargets.has(idx)}
          isLegalSource={legalSources.has(idx)}
          onSelect={onSelectFrom}
          onMove={onMoveTo}
          triGradA={sc.triGradA}
          triGradB={sc.triGradB}
        />
      </div>
    ));
  }

  return (
    <div
      className="relative w-full select-none"
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        background: sc.boardBg,
        boxShadow:
          `0 0 0 1px ${sc.trimBorder}, ` +
          "0 0 0 3px rgba(21,128,61,0.08), " +
          "0 24px 80px rgba(0,0,0,0.7), " +
          "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Trim top rail */}
      <div
        className="h-3 w-full flex-shrink-0"
        style={{
          background: sc.trimTop,
          borderBottom: `1px solid ${sc.trimBorder}`,
        }}
      />

      {/* Play area */}
      <div className="flex" style={{ height: "clamp(300px, 56vw, 520px)" }}>

        {/* Bear-off column */}
        <div
          className="flex flex-col items-center justify-between py-3 flex-shrink-0"
          style={{
            width: "38px",
            borderRight: `1px solid ${sc.trimBorder}`,
            background: sc.bearOffBg,
          }}
        >
          {/* Black bear-off */}
          <div
            className={[
              "flex flex-col items-center gap-[2px] min-h-[2rem] rounded-lg px-0.5 py-1 transition-all duration-200",
              blackOffIsTarget
                ? "cursor-pointer ring-1 ring-amber-400/40"
                : "",
            ].join(" ")}
            style={blackOffIsTarget ? { background: "rgba(217,119,6,0.08)" } : {}}
            onClick={() => blackOffIsTarget && onMoveTo("off-black")}
          >
            {Array.from({ length: Math.min(blackOff, 7) }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-[5px] rounded-sm"
                style={{
                  background: "linear-gradient(90deg, #1a1a1a, #0a0a0a)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ))}
            {blackOff > 7 && (
              <span className="font-mono text-[8px]" style={{ color: "var(--text-dim)" }}>{blackOff}</span>
            )}
          </div>

          <span
            className="font-mono text-[7px] tracking-[0.2em] uppercase"
            style={{ color: "rgba(217,119,6,0.45)", writingMode: "vertical-rl" }}
          >
            Off
          </span>

          {/* White bear-off */}
          <div
            className={[
              "flex flex-col items-center gap-[2px] min-h-[2rem] rounded-lg px-0.5 py-1 transition-all duration-200",
              whiteOffIsTarget ? "cursor-pointer ring-1 ring-amber-400/40" : "",
            ].join(" ")}
            style={whiteOffIsTarget ? { background: "rgba(217,119,6,0.08)" } : {}}
            onClick={() => whiteOffIsTarget && onMoveTo("off-white")}
          >
            {Array.from({ length: Math.min(whiteOff, 7) }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-[5px] rounded-sm"
                style={{
                  background: "linear-gradient(90deg, #d4cbb8, #bfb49e)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            ))}
            {whiteOff > 7 && (
              <span className="font-mono text-[8px]" style={{ color: "rgba(217,119,6,0.5)" }}>{whiteOff}</span>
            )}
          </div>
        </div>

        {/* Point columns + bar */}
        <div className="flex-1 flex flex-col">
          {/* Top row */}
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-1 min-w-0 gap-px">{renderHalf(topLeft, true)}</div>

            {/* Bar */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-between py-3"
              style={{
                width: "36px",
                background: sc.barBg,
                borderLeft: `1px solid ${sc.trimBorder}`,
                borderRight: `1px solid ${sc.trimBorder}`,
              }}
            >
              <div
                className="flex flex-col items-center gap-0.5 cursor-pointer min-h-[2.5rem]"
                onClick={() => blackBarIsSource && onSelectFrom("bar-black")}
              >
                {barBlack.length > 0 && (
                  <Checker
                    player="black"
                    count={barBlack.length}
                    isMovable={blackBarIsSource}
                    isSelected={selectedFrom === "bar-black"}
                    size="sm"
                    onClick={blackBarIsSource ? () => onSelectFrom("bar-black") : undefined}
                  />
                )}
              </div>
              <span
                className="font-mono text-[7px] tracking-[0.2em] uppercase"
                style={{ color: "rgba(217,119,6,0.45)" }}
              >
                Bar
              </span>
              <div
                className="flex flex-col items-center gap-0.5 cursor-pointer min-h-[2.5rem]"
                onClick={() => whiteBarIsSource && onSelectFrom("bar-white")}
              >
                {barWhite.length > 0 && (
                  <Checker
                    player="white"
                    count={barWhite.length}
                    isMovable={whiteBarIsSource}
                    isSelected={selectedFrom === "bar-white"}
                    size="sm"
                    onClick={whiteBarIsSource ? () => onSelectFrom("bar-white") : undefined}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-1 min-w-0 gap-px">{renderHalf(topRight, true)}</div>
          </div>

          {/* Center rail */}
          <div
            className="flex-shrink-0 flex items-center h-5"
            style={{
              background: sc.bearOffBg,
              borderTop: `1px solid ${sc.trimBorder}`,
              borderBottom: `1px solid ${sc.trimBorder}`,
            }}
          >
            <div className="flex-1 h-px" style={{ background: sc.trimBorder }} />
            <div
              className="h-full"
              style={{
                width: "36px",
                borderLeft: `1px solid ${sc.trimBorder}`,
                borderRight: `1px solid ${sc.trimBorder}`,
                background: sc.barBg,
              }}
            />
            <div className="flex-1 h-px" style={{ background: sc.trimBorder }} />
          </div>

          {/* Bottom row */}
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-1 min-w-0 gap-px">{renderHalf(botLeft, false)}</div>
            <div
              className="flex-shrink-0"
              style={{
                width: "36px",
                background: sc.barBg,
                borderLeft: `1px solid ${sc.trimBorder}`,
                borderRight: `1px solid ${sc.trimBorder}`,
              }}
            />
            <div className="flex flex-1 min-w-0 gap-px">{renderHalf(botRight, false)}</div>
          </div>
        </div>
      </div>

      {/* Trim bottom rail */}
      <div
        className="h-3 w-full flex-shrink-0"
        style={{
          background: sc.trimBottom,
          borderTop: `1px solid ${sc.trimBorder}`,
        }}
      />

      {/* Subtle grain (felt texture) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.022,
          backgroundSize: "128px",
        }}
      />
    </div>
  );
}
