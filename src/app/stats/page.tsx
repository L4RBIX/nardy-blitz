"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { GameStats, RecentGame } from "../../types";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { calculateBadges, getBadgeMeta, BADGE_DEFS } from "../../lib/badges";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATS_KEY = "nardy_blitz_stats";
const EXPO = [0.23, 1, 0.32, 1] as const;

const sectionIn = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};
const itemIn = {
  hidden:   { opacity: 0, y: 14 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.38, ease: EXPO } },
};

// ── Data helpers ───────────────────────────────────────────────────────────────

function loadStats(): GameStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<GameStats>;
    return {
      gamesPlayed:              p.gamesPlayed              ?? 0,
      winsVsBot:                p.winsVsBot                ?? 0,
      lossesVsBot:              p.lossesVsBot              ?? 0,
      totalDurationMs:          p.totalDurationMs          ?? 0,
      currentStreak:            p.currentStreak            ?? 0,
      longestStreak:            p.longestStreak            ?? 0,
      games:                    p.games                    ?? [],
      totalCoachScore:          p.totalCoachScore          ?? 0,
      totalCoachScoreGames:     p.totalCoachScoreGames     ?? 0,
      bestCoachScore:           p.bestCoachScore           ?? 0,
      totalDiceEfficiency:      p.totalDiceEfficiency      ?? 0,
      totalDiceEfficiencyGames: p.totalDiceEfficiencyGames ?? 0,
      totalHitsMade:            p.totalHitsMade            ?? 0,
      totalPointsMade:          p.totalPointsMade          ?? 0,
      totalBlotsLeft:           p.totalBlotsLeft           ?? 0,
      totalBarEntries:          p.totalBarEntries          ?? 0,
      difficultyStats:          p.difficultyStats          ?? { easy: 0, balanced: 0, hard: 0 },
      recentGames:              p.recentGames              ?? [],
      winsMultiplayer:          p.winsMultiplayer          ?? 0,
      lossesMultiplayer:        p.lossesMultiplayer        ?? 0,
    };
  } catch { return null; }
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
}

function favDifficulty(ds: { easy: number; balanced: number; hard: number } | undefined): string {
  if (!ds || (ds.easy + ds.balanced + ds.hard) === 0) return "—";
  const [label] = Object.entries(ds).sort(([, a], [, b]) => b - a)[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getPerformanceSummary(s: GameStats): string {
  if (s.gamesPlayed === 0) return "Play your first match to unlock performance analytics.";
  const avgCoach = (s.totalCoachScoreGames ?? 0) > 0
    ? (s.totalCoachScore ?? 0) / (s.totalCoachScoreGames ?? 1) : null;
  const avgDice  = (s.totalDiceEfficiencyGames ?? 0) > 0
    ? (s.totalDiceEfficiency ?? 0) / (s.totalDiceEfficiencyGames ?? 1) : null;
  const totalWins   = (s.winsVsBot ?? 0) + (s.winsMultiplayer ?? 0);
  const totalLosses = (s.lossesVsBot ?? 0) + (s.lossesMultiplayer ?? 0);
  const total   = totalWins + totalLosses;
  const winRate = total > 0 ? (totalWins / total) * 100 : null;

  if (avgCoach !== null && avgCoach >= 80) {
    return "Strong tactical consistency. Your coach score is trending high — keep building protected points and limiting blots.";
  }
  if (avgDice !== null && avgDice < 50) {
    return "Your main improvement area is dice utilization. Focus on using all available die values each turn.";
  }
  if (winRate !== null && winRate < 40 && avgCoach !== null && avgCoach >= 65) {
    return "Your match results are behind your move quality. Focus on converting strong positions into wins.";
  }
  if (winRate !== null && winRate >= 60) {
    return `${Math.round(winRate)}% win rate against the bot. Your board control is consistent — consider raising the difficulty.`;
  }
  if (s.gamesPlayed < 5) {
    return "Play a few more matches to generate meaningful performance trends.";
  }
  return "Keep playing to build stronger performance insights. Focus on reducing exposed blots and improving dice efficiency.";
}

// ── Small components ───────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: "#F59E0B", B: "#10B981", C: "#60A5FA", D: "#F87171",
};

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-[11px] font-bold"
      style={{ background: `${GRADE_COLORS[grade] ?? "#64748B"}18`, color: GRADE_COLORS[grade] ?? "#64748B" }}
    >
      {grade}
    </span>
  );
}

function ResultBadge({ result }: { result: RecentGame["result"] }) {
  const map: Record<RecentGame["result"], { label: string; color: string; bg: string }> = {
    win:              { label: "Win",        color: "#10B981", bg: "rgba(16,185,129,0.09)" },
    win_by_surrender: { label: "Win",        color: "#10B981", bg: "rgba(16,185,129,0.06)" },
    loss:             { label: "Loss",       color: "#F87171", bg: "rgba(248,113,113,0.09)" },
    loss_by_surrender:{ label: "Surrender",  color: "#FB923C", bg: "rgba(251,146,60,0.09)"  },
  };
  const { label, color, bg } = map[result];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] tracking-wide"
      style={{ background: bg, color, border: `1px solid ${color}22` }}
    >
      {label}
    </span>
  );
}

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <motion.div
      variants={itemIn}
      className="rounded-2xl p-4 flex flex-col gap-1 min-w-0"
      style={{
        background: "rgba(11,17,32,0.85)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="font-mono font-semibold tabular-nums leading-none"
        style={{
          fontSize: "clamp(1.25rem,4vw,2rem)",
          color: accent ? "var(--gold-bright)" : "var(--text-primary)",
        }}
      >
        {value}
      </span>
      <span
        className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
      {sub && (
        <span className="text-[11px]" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
          {sub}
        </span>
      )}
    </motion.div>
  );
}

// ── Architecture step card ─────────────────────────────────────────────────────

const ARCH_STEPS = [
  {
    n: "01",
    title: "Move History",
    body: "Every move is recorded with dice values, player attribution, source point, destination, and outcome metadata.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="2" y="2" width="14" height="2.5" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="2" y="7" width="10" height="2.5" rx="1" fill="currentColor" opacity=".7"/>
        <rect x="2" y="12" width="6" height="2.5" rx="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Feature Extraction",
    body: "The backend extracts 18 board-control features: blots, hits, protected points, bar entries, pip count delta, home board anchors, and dice efficiency.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Position Evaluation",
    body: "A heuristic ML-style evaluator applies a linear weighted scoring formula across all features, producing a continuous position quality score.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M2 14L6 9l4 3 4-6 2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Coach Report",
    body: "The report returns a coach score (0–100), letter grade, key mistakes, best plays, and up to 4 actionable recommendations.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const TECH_CHIPS: Array<{ label: string; color: string; bg: string; strike?: boolean }> = [
  { label: "FastAPI backend",    color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  { label: "Pydantic schemas",   color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  { label: "Heuristic evaluator",color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { label: "Local fallback",     color: "#94A3B8", bg: "rgba(148,163,184,0.06)" },
  { label: "No external LLM",   color: "#F87171", bg: "rgba(248,113,113,0.06)", strike: true },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!stats || stats.gamesPlayed === 0) {
    return (
      <div className="min-h-dvh flex flex-col overflow-x-hidden">
        <nav
          className="relative z-10 flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            Nardy Blitz
          </Link>
          <Link
            href="/play"
            className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
          >
            Play
          </Link>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EXPO }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(21,128,61,0.08)", border: "1px solid rgba(21,128,61,0.18)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="14" width="3" height="7" rx="1" stroke="#15803D" strokeWidth="1.5" />
                <rect x="10" y="9" width="3" height="12" rx="1" stroke="#D97706" strokeWidth="1.5" />
                <rect x="17" y="4" width="3" height="17" rx="1" stroke="#F59E0B" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="font-sans font-semibold text-xl tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              No games yet
            </h1>
            <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              Play your first match to unlock performance analytics, coach scores, and dice efficiency tracking.
            </p>
            <Link
              href="/play"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,var(--gold-bright),var(--gold))", color: "#0A0800" }}
            >
              Play your first match
            </Link>
          </motion.div>

          {/* Architecture section still visible in empty state */}
          <div className="w-full max-w-3xl mt-12">
            <ArchitectureSection />
          </div>
        </div>
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalWins    = (stats.winsVsBot ?? 0)  + (stats.winsMultiplayer  ?? 0);
  const totalLosses  = (stats.lossesVsBot ?? 0) + (stats.lossesMultiplayer ?? 0);
  const total        = totalWins + totalLosses;
  const winRate      = total > 0 ? Math.round((totalWins / total) * 100) : 0;
  const avgDurSec    = stats.gamesPlayed > 0 ? stats.totalDurationMs / stats.gamesPlayed / 1000 : 0;

  const avgCoachScore  = (stats.totalCoachScoreGames  ?? 0) > 0
    ? Math.round((stats.totalCoachScore  ?? 0) / (stats.totalCoachScoreGames  ?? 1)) : null;
  const avgDiceEff     = (stats.totalDiceEfficiencyGames ?? 0) > 0
    ? Math.round((stats.totalDiceEfficiency ?? 0) / (stats.totalDiceEfficiencyGames ?? 1)) : null;
  const avgBlotsLeft   = (stats.totalCoachScoreGames  ?? 0) > 0
    ? ((stats.totalBlotsLeft  ?? 0) / (stats.totalCoachScoreGames  ?? 1)).toFixed(1) : null;

  const mpWins   = stats.winsMultiplayer  ?? 0;
  const mpLosses = stats.lossesMultiplayer ?? 0;
  const mpTotal  = mpWins + mpLosses;
  const mpWinRate = mpTotal > 0 ? Math.round((mpWins / mpTotal) * 100) : 0;

  const recentGames = [...(stats.recentGames ?? [])].reverse().slice(0, 5);

  const kpiCards = [
    { label: "Games Played",       value: String(stats.gamesPlayed),   sub: "all modes"              },
    { label: "Win Rate",           value: `${winRate}%`,               sub: `${totalWins}W / ${totalLosses}L total`, accent: true },
    { label: "Current Streak",     value: String(stats.currentStreak), sub: "consecutive wins"        },
    { label: "Longest Streak",     value: String(stats.longestStreak), sub: "best run"                },
    { label: "Avg Coach Score",    value: avgCoachScore !== null ? String(avgCoachScore) : "—", sub: "0–100 scale", accent: true },
    { label: "Best Coach Score",   value: (stats.bestCoachScore ?? 0) > 0 ? String(stats.bestCoachScore) : "—", sub: "personal best" },
    { label: "Avg Dice Efficiency",value: avgDiceEff !== null ? `${avgDiceEff}%` : "—", sub: "higher is better" },
    { label: "Favorite Difficulty",value: favDifficulty(stats.difficultyStats), sub: "most bot games"   },
  ];

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {/* Ambient */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        <div
          className="blob absolute w-[350px] h-[350px] opacity-[0.04]"
          style={{ background: "var(--gold)", bottom: "15%", left: "-80px" }}
        />
        <div
          className="blob blob-2 absolute w-[280px] h-[280px] opacity-[0.03]"
          style={{ background: "var(--emerald)", top: "20%", right: "-60px" }}
        />
      </div>

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="font-sans text-sm font-semibold transition-colors duration-150" style={{ color: "var(--text-muted)" }}>
          Nardy Blitz
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/history" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>History</Link>
          <Link href="/tournament" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Tournament</Link>
          <Link
            href="/play"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl transition-all duration-150"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
          >
            Play now
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10 space-y-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EXPO }}
        >
          <h1
            className="font-sans font-semibold tracking-tight text-balance mb-1"
            style={{ fontSize: "clamp(1.5rem,5vw,2.5rem)", color: "var(--text-primary)" }}
          >
            Your Performance
          </h1>
          <p className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>
            Stored locally on this device · No account required
          </p>
        </motion.div>

        {/* KPI Grid */}
        <section aria-label="Key performance indicators">
          <motion.div
            variants={sectionIn} initial="hidden" animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {kpiCards.map((c) => (
              <KpiCard key={c.label} label={c.label} value={c.value} sub={c.sub} accent={c.accent} />
            ))}
          </motion.div>
        </section>

        {/* Multiplayer stats — only shown when at least one multiplayer game was played */}
        {mpTotal > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.35, ease: EXPO }}
            aria-label="Multiplayer stats"
          >
            <SectionLabel>Multiplayer</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "MP Games",    value: String(mpTotal)          },
                { label: "MP Wins",     value: String(mpWins)           },
                { label: "MP Losses",   value: String(mpLosses)         },
                { label: "MP Win Rate", value: `${mpWinRate}%`          },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}
                >
                  <span className="block font-mono font-semibold tabular-nums text-lg" style={{ color: "#10B981" }}>
                    {value}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Performance Summary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.35, ease: EXPO }}
          aria-label="Performance summary"
        >
          <SectionLabel>Performance Summary</SectionLabel>
          <div
            className="rounded-2xl px-5 py-4 flex gap-4 items-start"
            style={{ background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span
              className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full"
              style={{ background: "var(--gold-bright)" }}
            />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              {getPerformanceSummary(stats)}
            </p>
          </div>
        </motion.section>

        {/* AI Coach Metrics */}
        {(stats.totalCoachScoreGames ?? 0) > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.35, ease: EXPO }}
            aria-label="AI Coach aggregate metrics"
          >
            <SectionLabel>AI Coach Metrics</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Avg Coach Score",     value: avgCoachScore !== null ? `${avgCoachScore}` : "—" },
                { label: "Avg Dice Efficiency", value: avgDiceEff !== null    ? `${avgDiceEff}%`   : "—" },
                { label: "Total Hits Made",     value: String(stats.totalHitsMade  ?? 0) },
                { label: "Total Points Made",   value: String(stats.totalPointsMade ?? 0) },
                { label: "Avg Blots Left",      value: avgBlotsLeft !== null ? avgBlotsLeft : "—" },
                { label: "Total Bar Entries",   value: String(stats.totalBarEntries ?? 0) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(11,17,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="block font-mono font-semibold tabular-nums text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                  <span
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.35, ease: EXPO }}
            aria-label="Recent games"
          >
            <SectionLabel>Recent Games</SectionLabel>

            {/* Header row — tablet/desktop only */}
            <div
              className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2 mb-1 font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              <span>Result</span>
              <span className="w-16 text-center">Mode</span>
              <span className="w-14 text-center">Color</span>
              <span className="w-16 text-center">Difficulty</span>
              <span className="w-14 text-right">Duration</span>
              <span className="w-14 text-right">Score</span>
              <span className="w-8  text-center">Grade</span>
            </div>

            <motion.div
              variants={sectionIn} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: "-20px" }}
              className="space-y-1.5"
            >
              {recentGames.map((g) => (
                <motion.div
                  key={g.id}
                  variants={itemIn}
                  className="rounded-xl px-4 py-3 flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] md:gap-x-4 md:items-center gap-2"
                  style={{ background: "rgba(14,22,39,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {/* Result */}
                  <div className="flex items-center gap-2">
                    <ResultBadge result={g.result} />
                    <span className="text-[11px] font-mono md:hidden" style={{ color: "var(--text-dim)" }}>
                      {new Date(g.date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Mode */}
                  <span
                    className="font-mono text-[10px] w-16 text-center px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                  >
                    {g.mode === "vs-bot" ? "Bot" : g.mode === "multiplayer" ? "Multi" : "Local"}
                  </span>

                  {/* Human color */}
                  <div className="flex items-center justify-center gap-1.5 w-14">
                    {g.humanPlayer ? (
                      <>
                        <span
                          className="w-2.5 h-2.5 rounded-full border flex-shrink-0"
                          style={{
                            background: g.humanPlayer === "white"
                              ? "linear-gradient(145deg,#F8F0E0,#CFC0A0)"
                              : "linear-gradient(145deg,#1E1E1E,#050505)",
                            borderColor: g.humanPlayer === "white" ? "rgba(200,185,155,0.5)" : "rgba(60,60,60,0.7)",
                          }}
                        />
                        <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>
                          {g.humanPlayer === "white" ? "W" : "B"}
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </div>

                  {/* Difficulty */}
                  <span
                    className="font-mono text-[10px] w-16 text-center capitalize"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {g.botDifficulty ?? "—"}
                  </span>

                  {/* Duration */}
                  <span
                    className="font-mono text-[11px] w-14 text-right tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatDuration(g.durationSeconds)}
                  </span>

                  {/* Coach score */}
                  <span
                    className="font-mono text-[11px] w-14 text-right tabular-nums"
                    style={{ color: g.coachScore !== undefined ? "var(--gold-bright)" : "var(--text-dim)" }}
                  >
                    {g.coachScore !== undefined ? g.coachScore : "—"}
                  </span>

                  {/* Grade */}
                  <div className="flex justify-center w-8">
                    <GradeBadge grade={g.grade} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* Avg duration */}
        {stats.gamesPlayed > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="font-mono text-[11px] text-center"
            style={{ color: "var(--text-dim)" }}
          >
            Average game duration: {formatDuration(avgDurSec)} · {stats.gamesPlayed} total {stats.gamesPlayed === 1 ? "game" : "games"}
          </motion.div>
        )}

        {/* Badges */}
        <BadgesSection stats={stats} winRate={winRate} avgCoachScore={avgCoachScore} />

        {/* Submit to Leaderboard */}
        <LeaderboardSubmitSection stats={stats} winRate={winRate} avgCoachScore={avgCoachScore} />

        {/* AI Coach Architecture */}
        <ArchitectureSection />

      </main>

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--text-dim)" }}>
          Built for nFactorial Incubator 2026
        </p>
      </footer>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[9px] uppercase tracking-[0.12em] mb-3"
      style={{ color: "var(--text-dim)" }}
    >
      {children}
    </div>
  );
}

function BadgesSection({
  stats, winRate, avgCoachScore,
}: {
  stats: GameStats;
  winRate: number;
  avgCoachScore: number | null;
}) {
  const totalWins = (stats.winsVsBot ?? 0) + (stats.winsMultiplayer ?? 0);
  const mpWins    = stats.winsMultiplayer ?? 0;
  const score = Math.round(
    (avgCoachScore ?? 0) * 10 +
    totalWins * 25 +
    (stats.bestCoachScore ?? 0) * 5 +
    winRate * 2 +
    mpWins * 15
  );
  const avgDice = (stats.totalDiceEfficiencyGames ?? 0) > 0
    ? (stats.totalDiceEfficiency ?? 0) / (stats.totalDiceEfficiencyGames ?? 1)
    : 0;

  const earned = calculateBadges({
    gamesPlayed:       stats.gamesPlayed,
    city:              "Unknown",
    score,
    bestCoachScore:    stats.bestCoachScore ?? 0,
    avgDiceEfficiency: avgDice,
    longestStreak:     stats.longestStreak,
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      aria-label="Your badges"
    >
      <SectionLabel>Your Badges</SectionLabel>
      {earned.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-4 text-sm"
          style={{ background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-muted)", fontWeight: 300 }}
        >
          Play more games to unlock badges.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {BADGE_DEFS.map((def) => {
            const meta = getBadgeMeta(def.id);
            if (!meta) return null;
            const has = earned.includes(def.id);
            return (
              <span
                key={def.id}
                title={def.description}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[10px] tracking-wide transition-opacity"
                style={{
                  background: has ? meta.bg : "rgba(14,22,39,0.5)",
                  border: `1px solid ${has ? meta.border : "rgba(255,255,255,0.06)"}`,
                  color: has ? meta.color : "rgba(148,163,184,0.3)",
                  opacity: has ? 1 : 0.5,
                }}
              >
                {has && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                )}
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

function LeaderboardSubmitSection({
  stats,
  winRate,
  avgCoachScore,
}: {
  stats: GameStats;
  winRate: number;
  avgCoachScore: number | null;
}) {
  const totalWins   = (stats.winsVsBot ?? 0)   + (stats.winsMultiplayer  ?? 0);
  const totalLosses = (stats.lossesVsBot ?? 0)  + (stats.lossesMultiplayer ?? 0);
  const mpWins      = stats.winsMultiplayer ?? 0;
  const score = Math.round(
    (avgCoachScore ?? 0) * 10 +
    totalWins * 25 +
    (stats.bestCoachScore ?? 0) * 5 +
    winRate * 2 +
    mpWins * 15
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const favDiff = stats.difficultyStats
    ? (Object.entries(stats.difficultyStats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus("loading");
    setErrMsg("");

    try {
      if (isSupabaseConfigured && supabase) {
        const avgDice = (stats.totalDiceEfficiencyGames ?? 0) > 0
          ? (stats.totalDiceEfficiency ?? 0) / (stats.totalDiceEfficiencyGames ?? 1)
          : 0;
        const badges = calculateBadges({
          gamesPlayed:       stats.gamesPlayed,
          city:              city.trim() || "Unknown",
          score,
          bestCoachScore:    stats.bestCoachScore ?? 0,
          avgDiceEfficiency: avgDice,
          longestStreak:     stats.longestStreak,
        });

        const { error } = await supabase.from("leaderboard_entries").insert({
          player_name:         name.trim(),
          city:                city.trim() || "Unknown",
          score,
          wins:                totalWins,
          losses:              totalLosses,
          games_played:        stats.gamesPlayed,
          best_coach_score:    stats.bestCoachScore ?? 0,
          average_coach_score: avgCoachScore ?? 0,
          win_rate:            winRate,
          favorite_difficulty: favDiff,
          badges,
        });
        if (error) {
          console.error("[leaderboard submit] Supabase error:", error);
          throw error;
        }
      }
      setStatus("success");
    } catch (err) {
      console.error("[leaderboard submit] caught:", err);
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Submission failed.");
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      aria-label="Submit to leaderboard"
    >
      <SectionLabel>City Leaderboard</SectionLabel>
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="font-mono font-bold tabular-nums"
              style={{ fontSize: "clamp(1.4rem,4vw,1.9rem)", color: "var(--gold-bright)" }}
            >
              {score.toLocaleString()}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              pts
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
            Total wins × 25 + MP bonus × 15 + coach avg × 10 + best × 5 + win-rate × 2
          </p>
        </div>

        <button
          onClick={() => { setOpen(true); setStatus("idle"); setErrMsg(""); }}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
          style={{
            background: "rgba(217,119,6,0.1)",
            border: "1px solid rgba(217,119,6,0.25)",
            color: "var(--gold-bright)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.18)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.1)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 9h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Submit my score
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(5,10,18,0.8)", backdropFilter: "blur(6px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass w-full max-w-sm rounded-2xl p-6"
                style={{ border: "1px solid rgba(217,119,6,0.2)" }}
              >
                {status === "success" ? (
                  <div className="text-center py-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path d="M4 10l4 4 8-8" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 className="font-sans font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                      Score submitted!
                    </h2>
                    <p className="text-sm mb-5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                      {isSupabaseConfigured
                        ? `${name} · ${score.toLocaleString()} pts added to the city leaderboard.`
                        : "Supabase isn't connected — submission saved locally only."}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setOpen(false)}
                        className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide cursor-pointer"
                        style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                      >
                        Close
                      </button>
                      <Link
                        href="/leaderboard"
                        className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide text-center cursor-pointer"
                        style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.25)", color: "var(--gold-bright)" }}
                        onClick={() => setOpen(false)}
                      >
                        View leaderboard
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <h2 className="font-sans font-semibold text-lg tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                        Submit to leaderboard
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                        Your score: <span className="font-mono" style={{ color: "var(--gold-bright)" }}>{score.toLocaleString()} pts</span>
                      </p>
                    </div>

                    {!isSupabaseConfigured && (
                      <div
                        className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
                        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "var(--text-muted)" }}
                      >
                        Supabase not connected — set <code className="font-mono text-[10px]" style={{ color: "var(--gold-bright)" }}>NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-[10px]" style={{ color: "var(--gold-bright)" }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable live leaderboard.
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="lb-name"
                          className="block font-mono text-[9px] uppercase tracking-widest mb-1.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Display name <span style={{ color: "var(--gold-bright)" }}>*</span>
                        </label>
                        <input
                          id="lb-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Bekarys"
                          required
                          maxLength={40}
                          className="w-full px-3 py-2.5 rounded-xl font-mono text-sm outline-none transition-all duration-150"
                          style={{
                            background: "rgba(14,22,39,0.8)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(217,119,6,0.35)"; }}
                          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="lb-city"
                          className="block font-mono text-[9px] uppercase tracking-widest mb-1.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          City <span style={{ color: "var(--text-dim)", fontWeight: 300 }}>(optional)</span>
                        </label>
                        <input
                          id="lb-city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Almaty — leave blank for Unknown"
                          maxLength={40}
                          className="w-full px-3 py-2.5 rounded-xl font-mono text-sm outline-none transition-all duration-150"
                          style={{
                            background: "rgba(14,22,39,0.8)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(217,119,6,0.35)"; }}
                          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                        />
                      </div>
                    </div>

                    {errMsg && (
                      <p className="text-[11px]" style={{ color: "#F87171" }}>{errMsg}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide cursor-pointer"
                        style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={status === "loading" || !name.trim()}
                        className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide cursor-pointer transition-opacity"
                        style={{
                          background: "rgba(217,119,6,0.15)",
                          border: "1px solid rgba(217,119,6,0.35)",
                          color: "var(--gold-bright)",
                          opacity: status === "loading" || !name.trim() ? 0.5 : 1,
                        }}
                      >
                        {status === "loading" ? "Submitting…" : "Submit"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function ArchitectureSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      aria-label="AI Coach architecture"
    >
      <SectionLabel>How AI Coach works</SectionLabel>

      <div
        className="rounded-2xl p-5 sm:p-6 space-y-6"
        style={{ background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Pipeline cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden xl:block absolute top-7 left-[13%] right-[13%] h-px pointer-events-none"
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), rgba(255,255,255,0.08), transparent)",
            }}
          />

          {ARCH_STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
              className="relative flex flex-col gap-2.5 rounded-xl p-4"
              style={{ background: "rgba(21,33,52,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* Step number */}
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] font-bold"
                  style={{ color: "var(--gold-bright)", letterSpacing: "0.05em" }}
                >
                  {step.n}
                </span>
                <span style={{ color: "rgba(217,119,6,0.4)" }}>{step.icon}</span>
              </div>
              <span
                className="font-sans font-semibold text-sm leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {step.title}
              </span>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tech chips */}
        <div className="flex flex-wrap gap-2">
          {TECH_CHIPS.map(({ label, color, bg, strike }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] tracking-wide"
              style={{
                background: bg,
                border: `1px solid ${color}30`,
                color,
                textDecoration: strike ? "line-through" : "none",
                opacity: strike ? 0.7 : 1,
              }}
            >
              {!strike && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />}
              {strike && <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>×</span>}
              {label}
            </span>
          ))}
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
          style={{
            background: "rgba(217,119,6,0.04)",
            border: "1px solid rgba(217,119,6,0.12)",
            color: "var(--text-muted)",
            fontWeight: 300,
          }}
        >
          <span style={{ color: "var(--gold-bright)", fontWeight: 500 }}>Architecture note · </span>
          The current MVP does not train a neural network. It uses deterministic feature scoring — heuristic position evaluation across 18 board features — designed so a trained move-quality model can replace the evaluator later without changing the API contract.
        </div>
      </div>
    </motion.section>
  );
}
