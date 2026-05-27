"use client";

import { motion, AnimatePresence } from "framer-motion";

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
};

interface SingleDieProps {
  value: number;
  used?: boolean;
  rollKey: number;
}

function SingleDie({ value, used = false, rollKey }: SingleDieProps) {
  const pips = PIP_POSITIONS[value] ?? [];

  return (
    <motion.div
      key={rollKey}
      /* animate skill: expo-out for entering element, spring finish */
      initial={{ rotateX: -120, opacity: 0, scale: 0.6, y: -8 }}
      animate={{ rotateX: 0, opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 18,
        /* expo-out feel: fast decelerate */
      }}
      className="relative w-11 h-11 rounded-xl flex-shrink-0"
      style={{
        background: used
          ? "linear-gradient(145deg, #0E1627 0%, #0A1020 100%)"
          : "linear-gradient(145deg, #1A2840 0%, #0E1A2E 60%, #091220 100%)",
        border: used
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid rgba(217,119,6,0.2)",
        boxShadow: used
          ? "none"
          : "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 8px rgba(217,119,6,0.06)",
        opacity: used ? 0.35 : 1,
        perspective: "200px",
      }}
    >
      {pips.map(([cx, cy], i) => (
        <span
          key={i}
          className="absolute w-[5px] h-[5px] rounded-full"
          style={{
            left: `${cx}%`,
            top: `${cy}%`,
            transform: "translate(-50%, -50%)",
            /* Gold pips (board game palette) */
            background: used ? "rgba(100,116,139,0.4)" : "var(--gold-bright)",
            boxShadow: used ? "none" : "0 0 4px rgba(245,158,11,0.6)",
          }}
        />
      ))}

      {/* Inner top-edge glint */}
      {!used && (
        <span
          className="absolute left-2 right-2 top-[3px] h-px rounded-full pointer-events-none"
          style={{ background: "rgba(255,255,255,0.12)" }}
        />
      )}
    </motion.div>
  );
}

interface DiceProps {
  values: [number, number] | null;
  remaining: number[];
  canRoll: boolean;
  isThinking: boolean;
  onRoll: () => void;
}

export function Dice({ values, remaining, canRoll, isThinking, onRoll }: DiceProps) {
  const isDoubles = values ? values[0] === values[1] : false;
  const rollKey = values ? values[0] * 10 + values[1] : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        {values ? (
          <motion.div
            key={`dice-${rollKey}`}
            className="flex gap-2 items-center flex-wrap justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            {isDoubles
              ? [0, 1, 2, 3].map((i) => (
                  <SingleDie key={i} value={values[0]} used={i >= remaining.length} rollKey={rollKey + i} />
                ))
              : values.map((v, i) => (
                  <SingleDie key={i} value={v} used={!remaining.includes(v)} rollKey={rollKey + i} />
                ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="w-11 h-11 rounded-xl border"
                style={{
                  borderStyle: "dashed",
                  borderColor: "rgba(217,119,6,0.12)",
                  background: "rgba(10,18,30,0.4)",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onRoll}
        disabled={!canRoll || isThinking}
        /* animate skill: scale feedback on press 0.97 (Modern Dark Cinema spec) */
        whileHover={canRoll && !isThinking ? { scale: 1.03 } : {}}
        whileTap={canRoll && !isThinking ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200"
        style={
          canRoll && !isThinking
            ? {
                background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)",
                color: "#0A0800",
                boxShadow: "0 0 20px rgba(217,119,6,0.25), 0 4px 12px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transitionTimingFunction: "var(--ease-expo)",
              }
            : {
                background: "rgba(14,22,39,0.8)",
                color: "var(--text-dim)",
                cursor: "not-allowed",
                border: "1px solid var(--border)",
              }
        }
      >
        {isThinking ? "Thinking..." : "Roll Dice"}
      </motion.button>
    </div>
  );
}
