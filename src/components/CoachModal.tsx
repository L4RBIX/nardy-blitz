"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CoachInsight, Player, GameMode, Move, GameState } from "../types";
import type { BackendCoachReport, BackendCoachInsight } from "../lib/coachApi";
import { generateDeepCoachReport } from "../game/deepCoach";
import { isProPreviewUnlocked } from "../lib/pro";

// ── Local insight display config ──────────────────────────────────────────────

const LOCAL_INSIGHT_CONFIG: Record<
  CoachInsight["type"],
  { label: string; bar: string; text: string; bg: string }
> = {
  blot_left:    { label: "Blot Left",    bar: "#DC2626", text: "#FCA5A5", bg: "rgba(220,38,38,0.07)"   },
  missed_block: { label: "Missed Block", bar: "#D97706", text: "#FCD34D", bg: "rgba(217,119,6,0.07)"   },
  wasted_die:   { label: "Wasted Die",   bar: "#F59E0B", text: "#FDE68A", bg: "rgba(245,158,11,0.06)"  },
  good_anchor:  { label: "Good Anchor",  bar: "#059669", text: "#6EE7B7", bg: "rgba(5,150,105,0.08)"   },
  strong_move:  { label: "Strong Move",  bar: "#10B981", text: "#34D399", bg: "rgba(16,185,129,0.07)"  },
};

// ── Backend severity config ───────────────────────────────────────────────────

const SEV_CONFIG: Record<
  BackendCoachInsight["severity"],
  { bar: string; text: string; bg: string }
> = {
  positive: { bar: "#059669", text: "#34D399", bg: "rgba(5,150,105,0.09)"  },
  warning:  { bar: "#D97706", text: "#FCD34D", bg: "rgba(217,119,6,0.08)"  },
  info:     { bar: "#3B82F6", text: "#93C5FD", bg: "rgba(59,130,246,0.07)" },
};

// ── Grade config ──────────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<
  "A" | "B" | "C" | "D",
  { color: string; bg: string; border: string }
> = {
  A: { color: "#34D399", bg: "rgba(5,150,105,0.12)",  border: "rgba(16,185,129,0.3)"  },
  B: { color: "#6EE7B7", bg: "rgba(5,150,105,0.08)",  border: "rgba(16,185,129,0.2)"  },
  C: { color: "#FCD34D", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)" },
  D: { color: "#FCA5A5", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.25)"  },
};

// ── Result display helper ─────────────────────────────────────────────────────

function formatResult(result?: string): string {
  switch (result) {
    case "win":               return "Win";
    case "loss":              return "Loss";
    case "loss_by_surrender": return "Loss by surrender";
    case "win_by_surrender":  return "Win by surrender";
    default:                  return "—";
  }
}

// ── Confidence display ────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG = {
  none:   { label: "No data",         color: "#F87171", bg: "rgba(248,113,113,0.07)", border: "rgba(248,113,113,0.2)" },
  low:    { label: "Limited sample",  color: "#FB923C", bg: "rgba(251,146,60,0.07)",  border: "rgba(251,146,60,0.2)"  },
  medium: { label: "Medium",          color: "#94A3B8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)" },
  high:   { label: "High",            color: "#10B981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.2)"  },
};

function ConfidenceBadge({
  confidence, moveCount,
}: {
  confidence: "none" | "low" | "medium" | "high";
  moveCount?: number;
}) {
  if (confidence === "high") return null;
  const cfg = CONFIDENCE_CONFIG[confidence];
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <circle cx="6" cy="6" r="5" stroke={cfg.color} strokeWidth="1.2" />
        <path d="M6 4v3M6 8.5v.5" stroke={cfg.color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-mono" style={{ color: cfg.color }}>
        Analysis confidence: {cfg.label}
        {moveCount !== undefined && ` · ${moveCount} move${moveCount === 1 ? "" : "s"} recorded`}
      </span>
    </div>
  );
}

// ── Animation constants ───────────────────────────────────────────────────────

const EXPO = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden:  { opacity: 0, x: -10, y: 4 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.28, ease: EXPO } },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCell({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-0.5"
      style={{ background: "rgba(14,22,39,0.5)", border: "1px solid var(--border)" }}
    >
      <span className="text-[9px] font-mono uppercase tracking-widest leading-tight"
        style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-lg font-bold leading-none mt-0.5"
        style={{ color: highlight ? "var(--emerald-bright)" : "var(--text-primary)" }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

function InsightRow({ insight }: { insight: BackendCoachInsight }) {
  const cfg = SEV_CONFIG[insight.severity] ?? SEV_CONFIG.info;
  return (
    <motion.div variants={fadeUp}
      className="flex items-start gap-3 p-3 rounded-2xl relative overflow-hidden"
      style={{ background: cfg.bg, border: "1px solid var(--border)" }}
    >
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ background: cfg.bar }} />
      <div className="pl-3 flex items-start gap-3 w-full">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap flex-shrink-0"
          style={{ color: cfg.text }}>{insight.title}</span>
        <p className="text-[12px] leading-snug flex-1"
          style={{ color: "rgba(241,245,249,0.7)" }}>{insight.description}</p>
      </div>
    </motion.div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CoachModalProps {
  isOpen: boolean;
  winner: Player | null;
  insights: CoachInsight[];
  backendReport: BackendCoachReport | null;
  isAnalyzing: boolean;
  analysisError?: string | null;
  humanPlayer?: Player;
  mode: GameMode;
  history?: Move[];
  gameState?: GameState;
  onClose: () => void;
}

// ── Deep Coach Report UI ──────────────────────────────────────────────────────

function DeepCoachSection({ history, gameState, player }: {
  history: Move[];
  gameState: GameState;
  player: Player;
}) {
  const report = generateDeepCoachReport(gameState, history, player);

  if (!report) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
        style={{ background: "rgba(217,119,6,0.04)", border: "1px solid rgba(217,119,6,0.1)", color: "var(--text-muted)" }}
      >
        Play a longer game to unlock deeper analysis.
      </div>
    );
  }

  const rows = [
    { label: "Opening phase",   value: report.phaseSummary  },
    { label: "Midgame risk",    value: report.tacticalRisk  },
    { label: "Dice use",        value: report.diceUse       },
    { label: "Board control",   value: report.boardControl  },
    { label: "Training focus",  value: report.trainingFocus },
  ];

  return (
    <div className="space-y-2">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(14,22,39,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--gold-bright)" }}>
            {label}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "rgba(241,245,249,0.72)" }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoachModal({
  isOpen, winner, insights, backendReport, isAnalyzing, analysisError,
  humanPlayer, mode, history, gameState, onClose,
}: CoachModalProps) {
  const effectiveHuman = humanPlayer ?? "white";
  const proUnlocked = typeof window !== "undefined" ? isProPreviewUnlocked() : false;
  const isVsBot = mode === "vs-bot";

  // Winner label from analyzed player's perspective
  const winnerLabel = isVsBot
    ? (winner === effectiveHuman ? "You" : "Bot")
    : (winner === "white" ? "White" : "Black");

  // Analyzed player capitalised (for header)
  const analyzedCap = backendReport?.analyzedPlayer
    ? (backendReport.analyzedPlayer === "white" ? "White" : "Black")
    : (isVsBot ? (effectiveHuman === "white" ? "White" : "Black") : null);

  // Section labels — personalised in bot mode
  const mistakesLabel = isVsBot ? "Your Key Mistakes" : "Key Mistakes";
  const bestLabel     = isVsBot ? "Your Best Plays"   : "Best Plays";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(5,10,18,0.78)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto"
          >
            <div className="glass rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl overflow-y-auto"
              style={{
                borderTop:   "1px solid var(--emerald-border)",
                borderLeft:  "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                maxHeight: "90dvh",
              }}
            >
              {/* Handle */}
              <div className="w-10 h-[3px] rounded-full mx-auto mb-5"
                style={{ background: "rgba(16,185,129,0.28)" }} />

              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="font-sans font-semibold text-xl tracking-tight mb-0.5"
                    style={{ color: "var(--text-primary)" }}>
                    Game Analysis
                  </h2>
                  {winner && (
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {winnerLabel} won
                      {isAnalyzing && " · analyzing…"}
                      {!isAnalyzing && analyzedCap && ` · Analyzing ${analyzedCap}`}
                      {!isAnalyzing && !analyzedCap && (backendReport ? " · ML-style backend analysis" : " · Local analysis")}
                    </p>
                  )}
                </div>
                <button onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
                  style={{ color: "var(--text-muted)" }} aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* ── Loading ─────────────────────────────────────────────── */}
              {isAnalyzing && !backendReport && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--emerald-bright)" }} />
                    <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                      Analyzing game…
                    </span>
                  </motion.div>
                  <p className="text-[11px] text-center" style={{ color: "var(--text-dim)", maxWidth: 220 }}>
                    Running ML-style heuristic evaluation
                  </p>
                </div>
              )}

              {/* ── Backend report ──────────────────────────────────────── */}
              {!isAnalyzing && backendReport && (
                <motion.div initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                  className="space-y-5"
                >
                  {/* Grade + score */}
                  <motion.div variants={fadeUp} className="flex items-center gap-4">
                    {(() => {
                      const gc = GRADE_CONFIG[backendReport.grade];
                      return (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: gc.bg, border: `1px solid ${gc.border}` }}>
                          <span className="text-3xl font-bold font-mono" style={{ color: gc.color }}>
                            {backendReport.grade}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          Performance Score
                        </span>
                        <span className="text-lg font-bold font-mono" style={{ color: "var(--emerald-bright)" }}>
                          {backendReport.coachScore}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{
                            background: "linear-gradient(90deg, #059669, #10B981)",
                            boxShadow: "0 0 8px rgba(16,185,129,0.4)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${backendReport.coachScore}%` }}
                          transition={{ duration: 0.9, ease: EXPO, delay: 0.15 }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Analyzed player + result chips */}
                  {(backendReport.analyzedPlayer || backendReport.result) && (
                    <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
                      {backendReport.analyzedPlayer && (
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg"
                          style={{
                            background: "rgba(16,185,129,0.08)",
                            border: "1px solid var(--emerald-border)",
                            color: "var(--emerald-bright)",
                          }}>
                          Analyzed: {backendReport.analyzedPlayer === "white" ? "White" : "Black"}
                        </span>
                      )}
                      {backendReport.result && (
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg"
                          style={{
                            background: "rgba(14,22,39,0.6)",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                          }}>
                          Result: {formatResult(backendReport.result)}
                        </span>
                      )}
                    </motion.div>
                  )}

                  {/* Confidence badge — shown for none / low / medium */}
                  {backendReport.analysisConfidence && (
                    <motion.div variants={fadeUp}>
                      <ConfidenceBadge
                        confidence={backendReport.analysisConfidence}
                        moveCount={backendReport.analyzedPlayerMoveCount}
                      />
                    </motion.div>
                  )}

                  {/* Summary */}
                  {backendReport.summary && (
                    <motion.p variants={fadeUp} className="text-sm leading-relaxed"
                      style={{ color: "rgba(241,245,249,0.72)" }}>
                      {backendReport.summary}
                    </motion.p>
                  )}

                  {/* Performance meaning */}
                  {backendReport.performanceMeaning && (
                    <motion.p variants={fadeUp} className="text-[11px] leading-snug italic"
                      style={{ color: "rgba(241,245,249,0.62)" }}>
                      {(backendReport.analysisConfidence === "none" || backendReport.analyzedPlayerMoveCount === 0)
                        ? "Coach Score requires meaningful move history. With no recorded moves, the report only evaluates the match outcome, not tactical performance."
                        : backendReport.performanceMeaning}
                    </motion.p>
                  )}

                  {/* Metrics 2×4 */}
                  <motion.div variants={fadeUp}>
                    <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                      style={{ color: "var(--text-muted)" }}>Metrics</p>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCell label="Blots Left"    value={backendReport.metrics.blotsLeft} />
                      <MetricCell label="Hits Made"     value={backendReport.metrics.hitsMade} highlight={backendReport.metrics.hitsMade > 0} />
                      <MetricCell label="Points Made"   value={backendReport.metrics.pointsMade} />
                      <MetricCell label="Bar Entries"   value={backendReport.metrics.barEntries} />
                      <MetricCell label="Dice Eff."     value={`${backendReport.metrics.diceEfficiency}%`} sub="utilisation" />
                      <MetricCell label="Move Quality"  value={(backendReport.metrics.averageMoveQuality * 100).toFixed(0) + "%"} sub="avg per move" />
                      <MetricCell label="Risk Score"    value={backendReport.metrics.riskScore}    sub="0=safe 100=risky" />
                      <MetricCell label="Control Score" value={backendReport.metrics.controlScore} sub="0=low 100=high" highlight />
                    </div>
                  </motion.div>

                  {/* Key mistakes */}
                  <motion.div variants={fadeUp}>
                    <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                      style={{ color: "var(--text-muted)" }}>{mistakesLabel}</p>
                    {backendReport.keyMistakes.length === 0 ? (
                      <p className="text-[12px] leading-snug"
                        style={{ color: "rgba(241,245,249,0.48)" }}>
                        No major tactical mistakes detected. The main issue was game outcome, not move quality.
                      </p>
                    ) : (
                      <motion.div className="space-y-2" initial="hidden" animate="visible" variants={stagger}>
                        {backendReport.keyMistakes.map((ins) => <InsightRow key={ins.id} insight={ins} />)}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Best plays */}
                  {backendReport.analysisConfidence === "none" ? (
                    <motion.div variants={fadeUp}>
                      <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                        style={{ color: "var(--text-muted)" }}>{bestLabel}</p>
                      <p className="text-[12px] leading-snug"
                        style={{ color: "rgba(241,245,249,0.55)" }}>
                        Not enough moves for best-play analysis.
                      </p>
                    </motion.div>
                  ) : backendReport.bestMoves.length > 0 ? (
                    <motion.div variants={fadeUp}>
                      <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                        style={{ color: "var(--text-muted)" }}>{bestLabel}</p>
                      <motion.div className="space-y-2" initial="hidden" animate="visible" variants={stagger}>
                        {backendReport.bestMoves.map((ins) => <InsightRow key={ins.id} insight={ins} />)}
                      </motion.div>
                    </motion.div>
                  ) : null}

                  {/* Recommendations */}
                  {backendReport.recommendations.length > 0 && (
                    <motion.div variants={fadeUp}>
                      <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                        style={{ color: "var(--text-muted)" }}>Recommendations</p>
                      <ul className="space-y-1.5">
                        {backendReport.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] leading-snug"
                            style={{ color: "rgba(241,245,249,0.68)" }}>
                            <span className="mt-[3px] flex-shrink-0 text-[8px]"
                              style={{ color: "var(--emerald-bright)" }}>◆</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Local fallback ──────────────────────────────────────── */}
              {!isAnalyzing && !backendReport && (
                <>
                  {analysisError && (
                    <p className="text-[11px] text-center mb-3"
                      style={{ color: "rgba(241,245,249,0.55)" }}>
                      Backend unavailable. Showing local analysis fallback.
                    </p>
                  )}
                  {insights.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                      Not enough moves to generate insights.
                    </p>
                  ) : (
                    <motion.div className="space-y-2" initial="hidden" animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                    >
                      {insights.map((insight, idx) => {
                        const cfg = LOCAL_INSIGHT_CONFIG[insight.type];
                        return (
                          <motion.div key={idx} variants={fadeUp}
                            className="flex items-start gap-3 p-3 rounded-2xl relative overflow-hidden"
                            style={{ background: cfg.bg, border: "1px solid var(--border)" }}
                          >
                            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                              style={{ background: cfg.bar }} />
                            <div className="pl-3 flex items-start gap-3 w-full">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap flex-shrink-0"
                                style={{ color: cfg.text }}>{cfg.label}</span>
                              <p className="text-[13px] leading-snug flex-1"
                                style={{ color: "rgba(241,245,249,0.75)" }}>{insight.description}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </>
              )}

              {/* ── Deep Coach Report (Pro) ─────────────────────────── */}
              {!isAnalyzing && proUnlocked && history && gameState && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                      Deep Coach Report
                    </p>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] tracking-widest uppercase"
                      style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--gold-bright)" }}
                    >
                      Pro
                    </span>
                  </div>
                  <DeepCoachSection history={history} gameState={gameState} player={effectiveHuman} />
                </motion.div>
              )}

              {/* CTA */}
              <motion.button onClick={onClose}
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="mt-6 w-full py-3.5 rounded-2xl font-semibold text-sm tracking-wide cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, var(--emerald-bright) 0%, var(--emerald) 100%)",
                  color: "#040C07",
                  boxShadow: "0 0 24px rgba(16,185,129,0.22)",
                }}
              >
                Play Again
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
