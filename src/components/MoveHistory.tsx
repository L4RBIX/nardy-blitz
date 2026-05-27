"use client";

import { useEffect, useRef } from "react";
import type { Move } from "../types";

interface MoveHistoryProps {
  history: Move[];
}

function formatPoint(idx: Move["from"] | Move["to"]): string {
  if (idx === "bar-white" || idx === "bar-black") return "Bar";
  if (idx === "off-white" || idx === "off-black") return "Off";
  return `${(idx as number) + 1}`;
}

export function MoveHistory({ history }: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history.length]);

  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-16 font-mono text-[10px] tracking-widest uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        No moves yet
      </div>
    );
  }

  /* Group into turns */
  const turns: Move[][] = [];
  let i = 0;
  while (i < history.length) {
    const group: Move[] = [history[i]];
    let j = i + 1;
    while (j < history.length && group.length < 4) {
      group.push(history[j]);
      j++;
    }
    turns.push(group);
    i = j;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto max-h-36 space-y-1 pr-1 scrollbar-thin"
    >
      {turns.map((group, tIdx) => {
        const isWhite = tIdx % 2 === 0;
        return (
          <div key={tIdx} className="flex items-start gap-2">
            <span
              className="font-mono text-[10px] w-5 text-right flex-shrink-0 mt-0.5"
              style={{ color: isWhite ? "rgba(217,119,6,0.4)" : "rgba(148,163,184,0.45)" }}
            >
              {tIdx + 1}.
            </span>
            <div className="flex flex-wrap gap-1">
              {group.map((m, mIdx) => (
                <span
                  key={mIdx}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{
                    background: isWhite ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
                    color: isWhite ? "rgba(241,245,249,0.65)" : "rgba(241,245,249,0.6)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {formatPoint(m.from)}→{formatPoint(m.to)}
                  <span style={{ color: isWhite ? "rgba(217,119,6,0.5)" : "rgba(148,163,184,0.4)" }}>
                    /{m.dieUsed}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
