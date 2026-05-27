"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { isProPreviewUnlocked } from "../../lib/pro";

const EXPO = [0.23, 1, 0.32, 1] as const;

interface MatchRecord {
  id: string;
  created_at: string;
  player_name: string | null;
  city: string | null;
  mode: string | null;
  result: string | null;
  player_color: string | null;
  difficulty: string | null;
  duration_seconds: number | null;
  coach_score: number | null;
  grade: string | null;
  dice_efficiency: number | null;
  moves_count: number | null;
}

// ── Local fallback from localStorage ─────────────────────────────────────────

interface LocalGame {
  id: string;
  date: number;
  mode: string;
  result: string;
  humanPlayer?: string;
  botDifficulty?: string;
  durationSeconds: number;
  coachScore?: number;
  grade?: string;
  diceEfficiency?: number;
}

function loadLocalGames(): LocalGame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("nardy_blitz_stats");
    if (!raw) return [];
    const stats = JSON.parse(raw) as { recentGames?: LocalGame[] };
    return [...(stats.recentGames ?? [])].reverse().slice(0, 20);
  } catch { return []; }
}

function formatDuration(s: number | null): string {
  if (s === null || s === undefined) return "—";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return "—"; }
}

function formatLocalDate(ts: number): string {
  try { return new Date(ts).toLocaleDateString(); } catch { return "—"; }
}

const GRADE_COLORS: Record<string, string> = {
  A: "#F59E0B", B: "#10B981", C: "#60A5FA", D: "#F87171",
};

function GradeBadge({ grade }: { grade?: string | null }) {
  if (!grade) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-[11px] font-bold"
      style={{ background: `${GRADE_COLORS[grade] ?? "#64748B"}22`, color: GRADE_COLORS[grade] ?? "#64748B" }}
    >
      {grade}
    </span>
  );
}

function ResultChip({ result }: { result: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    win:               { label: "Win",       color: "#10B981", bg: "rgba(16,185,129,0.09)" },
    win_by_surrender:  { label: "Win",       color: "#10B981", bg: "rgba(16,185,129,0.06)" },
    loss:              { label: "Loss",      color: "#F87171", bg: "rgba(248,113,113,0.09)" },
    loss_by_surrender: { label: "Surrender", color: "#FB923C", bg: "rgba(251,146,60,0.09)"  },
  };
  const cfg = map[result ?? ""] ?? { label: result ?? "—", color: "#94A3B8", bg: "rgba(148,163,184,0.06)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] tracking-wide"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Cloud history row ─────────────────────────────────────────────────────────

function CloudRow({ g }: { g: MatchRecord }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EXPO }}
      className="rounded-xl px-4 py-3 flex flex-col md:grid md:items-center gap-2"
      style={{
        gridTemplateColumns: "1fr auto auto auto auto auto auto",
        gap: "0 1rem",
        background: "rgba(14,22,39,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <ResultChip result={g.result} />
        <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>
          {formatDate(g.created_at)}
        </span>
        {g.player_name && (
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {g.player_name}
          </span>
        )}
      </div>
      <span className="font-mono text-[10px] text-center px-2 py-0.5 rounded w-16"
        style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
        {g.mode === "vs-bot" ? "Bot" : "Local"}
      </span>
      <span className="font-mono text-[10px] w-16 text-center capitalize" style={{ color: "var(--text-muted)" }}>
        {g.difficulty ?? "—"}
      </span>
      <span className="font-mono text-[10px] w-16 text-center capitalize" style={{ color: "var(--text-dim)" }}>
        {g.player_color ?? "—"}
      </span>
      <span className="font-mono text-[11px] w-14 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>
        {formatDuration(g.duration_seconds)}
      </span>
      <span className="font-mono text-[11px] w-14 text-right tabular-nums"
        style={{ color: g.coach_score !== null ? "var(--gold-bright)" : "var(--text-dim)" }}>
        {g.coach_score !== null ? g.coach_score : "—"}
      </span>
      <div className="flex justify-center w-8">
        <GradeBadge grade={g.grade} />
      </div>
    </motion.div>
  );
}

// ── Local history row ─────────────────────────────────────────────────────────

function LocalRow({ g }: { g: LocalGame }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EXPO }}
      className="rounded-xl px-4 py-3 flex flex-col md:grid md:items-center gap-2"
      style={{
        gridTemplateColumns: "1fr auto auto auto auto auto auto",
        gap: "0 1rem",
        background: "rgba(14,22,39,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <ResultChip result={g.result} />
        <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>
          {formatLocalDate(g.date)}
        </span>
      </div>
      <span className="font-mono text-[10px] text-center px-2 py-0.5 rounded w-16"
        style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
        {g.mode === "vs-bot" ? "Bot" : "Local"}
      </span>
      <span className="font-mono text-[10px] w-16 text-center capitalize" style={{ color: "var(--text-muted)" }}>
        {g.botDifficulty ?? "—"}
      </span>
      <span className="font-mono text-[10px] w-16 text-center capitalize" style={{ color: "var(--text-dim)" }}>
        {g.humanPlayer ?? "—"}
      </span>
      <span className="font-mono text-[11px] w-14 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>
        {formatDuration(g.durationSeconds)}
      </span>
      <span className="font-mono text-[11px] w-14 text-right tabular-nums"
        style={{ color: g.coachScore !== undefined ? "var(--gold-bright)" : "var(--text-dim)" }}>
        {g.coachScore !== undefined ? g.coachScore : "—"}
      </span>
      <div className="flex justify-center w-8">
        <GradeBadge grade={g.grade} />
      </div>
    </motion.div>
  );
}

// ── Column headers ────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div
      className="hidden md:grid items-center px-4 py-2 mb-1 font-mono text-[9px] uppercase tracking-widest"
      style={{
        gridTemplateColumns: "1fr auto auto auto auto auto auto",
        gap: "0 1rem",
        color: "var(--text-dim)",
      }}
    >
      <span>Result</span>
      <span className="w-16 text-center">Mode</span>
      <span className="w-16 text-center">Difficulty</span>
      <span className="w-16 text-center">Color</span>
      <span className="w-14 text-right">Duration</span>
      <span className="w-14 text-right">Score</span>
      <span className="w-8  text-center">Grade</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [cloudRows, setCloudRows]     = useState<MatchRecord[]>([]);
  const [localGames, setLocalGames]   = useState<LocalGame[]>([]);
  const [loading, setLoading]         = useState(true);
  const [proUnlocked, setProUnlocked] = useState(false);
  const [cloudAvail, setCloudAvail]   = useState(false);

  useEffect(() => {
    const pro = isProPreviewUnlocked();
    setProUnlocked(pro);
    setLocalGames(loadLocalGames());

    if (pro && isSupabaseConfigured && supabase) {
      setCloudAvail(true);
      supabase
        .from("match_history")
        .select("id,created_at,player_name,city,mode,result,player_color,difficulty,duration_seconds,coach_score,grade,dice_efficiency,moves_count")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setCloudRows(data as MatchRecord[]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const nav = (
    <nav
      className="relative z-10 flex items-center justify-between px-6 py-5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
        Nardy Blitz
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/stats"  className="font-mono text-[11px] tracking-wide" style={{ color: "var(--text-dim)" }}>Stats</Link>
        <Link href="/play"   className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl"
          style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}>
          Play
        </Link>
      </div>
    </nav>
  );

  // ── Not Pro ───────────────────────────────────────────────────────────────

  if (!proUnlocked) {
    return (
      <div className="min-h-dvh flex flex-col overflow-x-hidden">
        {nav}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EXPO }}
            className="w-full max-w-sm"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                <rect x="3" y="10" width="16" height="10" rx="2" stroke="var(--gold-bright)" strokeWidth="1.5"/>
                <path d="M7 10V7a4 4 0 018 0v3" stroke="var(--gold-bright)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="font-sans font-semibold text-xl tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              Pro feature
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              Cloud match history is available with Pro Preview. Your recent local games are always available on the Stats page.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/play"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ background: "linear-gradient(135deg,var(--gold-bright),var(--gold))", color: "#0A0800" }}
              >
                Play and unlock
              </Link>
              <Link
                href="/stats"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-mono text-[11px] tracking-wide"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                View local stats instead
              </Link>
            </div>
            <p className="mt-5 text-[10px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              Click &ldquo;Upgrade to Pro&rdquo; on the play page, then &ldquo;Preview Pro Features&rdquo; to unlock on this device.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Pro unlocked ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {nav}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10 space-y-10">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EXPO }}
        >
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-sans font-semibold tracking-tight" style={{ fontSize: "clamp(1.4rem,4vw,2rem)", color: "var(--text-primary)" }}>
              Match History
            </h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[9px] tracking-widest uppercase"
              style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--gold-bright)" }}
            >
              Pro
            </span>
          </div>
          <p className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>
            {cloudAvail ? "Cloud-saved · Supabase" : "Local device only · Supabase not connected"}
          </p>
        </motion.div>

        {/* Cloud history */}
        {cloudAvail && (
          <section>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              Cloud history
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-4" style={{ color: "var(--text-dim)" }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold-bright)" }} />
                </motion.div>
                <span className="font-mono text-[11px]">Loading cloud history…</span>
              </div>
            ) : cloudRows.length === 0 ? (
              <div
                className="rounded-xl px-4 py-3 text-[12px]"
                style={{ background: "rgba(14,22,39,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-dim)" }}
              >
                No cloud matches yet. Finish a game with Pro Preview active to save here.
              </div>
            ) : (
              <div className="space-y-1.5">
                <TableHeader />
                {cloudRows.map((g) => <CloudRow key={g.id} g={g} />)}
              </div>
            )}
          </section>
        )}

        {/* Local fallback */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Local recent games
            </p>
            <span className="font-mono text-[9px]" style={{ color: "var(--text-dim)" }}>(last 20 · localStorage)</span>
          </div>
          {localGames.length === 0 ? (
            <div
              className="rounded-xl px-4 py-3 text-[12px]"
              style={{ background: "rgba(14,22,39,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-dim)" }}
            >
              No local games yet. Play your first match at <Link href="/play" style={{ color: "var(--gold-bright)" }}>/play</Link>.
            </div>
          ) : (
            <div className="space-y-1.5">
              <TableHeader />
              {localGames.map((g) => <LocalRow key={g.id} g={g} />)}
            </div>
          )}
        </section>

        {!cloudAvail && (
          <div
            className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
            style={{ background: "rgba(217,119,6,0.04)", border: "1px solid rgba(217,119,6,0.12)", color: "var(--text-muted)" }}
          >
            <span style={{ color: "var(--gold-bright)", fontWeight: 500 }}>Cloud history note · </span>
            Supabase is not connected. Add <code className="font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable cloud-backed match history.
          </div>
        )}

      </main>

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--text-dim)" }}>
          Built for nFactorial Incubator 2026
        </p>
      </footer>
    </div>
  );
}
