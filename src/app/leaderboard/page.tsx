"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getBadgeMeta } from "../../lib/badges";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  player_name: string;
  city: string;
  score: number;
  wins: number;
  losses: number;
  games_played: number;
  best_coach_score: number;
  average_coach_score: number;
  win_rate: number;
  favorite_difficulty: string | null;
  created_at: string;
  badges?: string[];
}

// ── Demo data (shown when Supabase is not configured) ─────────────────────────

const DEMO_ENTRIES: LeaderboardEntry[] = [
  { id: "1", player_name: "Aibek K.",    city: "Almaty",   score: 1340, wins: 42, losses: 18, games_played: 60, best_coach_score: 91, average_coach_score: 78, win_rate: 70, favorite_difficulty: "Hard",     created_at: "" },
  { id: "2", player_name: "Dinara S.",   city: "Almaty",   score: 1120, wins: 35, losses: 22, games_played: 57, best_coach_score: 87, average_coach_score: 71, win_rate: 61, favorite_difficulty: "Balanced",  created_at: "" },
  { id: "3", player_name: "Nurlan T.",   city: "Astana",   score: 980,  wins: 28, losses: 20, games_played: 48, best_coach_score: 83, average_coach_score: 68, win_rate: 58, favorite_difficulty: "Hard",     created_at: "" },
  { id: "4", player_name: "Zarina M.",   city: "Almaty",   score: 860,  wins: 24, losses: 21, games_played: 45, best_coach_score: 79, average_coach_score: 64, win_rate: 53, favorite_difficulty: "Balanced",  created_at: "" },
  { id: "5", player_name: "Aslan B.",    city: "Shymkent", score: 740,  wins: 20, losses: 19, games_played: 39, best_coach_score: 74, average_coach_score: 60, win_rate: 51, favorite_difficulty: "Easy",     created_at: "" },
  { id: "6", player_name: "Meiram N.",   city: "Astana",   score: 620,  wins: 16, losses: 20, games_played: 36, best_coach_score: 70, average_coach_score: 55, win_rate: 44, favorite_difficulty: "Balanced",  created_at: "" },
  { id: "7", player_name: "Kamila A.",   city: "Almaty",   score: 550,  wins: 14, losses: 18, games_played: 32, best_coach_score: 68, average_coach_score: 52, win_rate: 44, favorite_difficulty: "Easy",     created_at: "" },
  { id: "8", player_name: "Damir Zh.",   city: "Shymkent", score: 480,  wins: 12, losses: 17, games_played: 29, best_coach_score: 65, average_coach_score: 49, win_rate: 41, favorite_difficulty: "Easy",     created_at: "" },
];

const CITIES = ["All", "Almaty", "Astana", "Shymkent", "Other"];

const EXPO = [0.23, 1, 0.32, 1] as const;

const itemIn = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, ease: EXPO, delay: i * 0.04 } }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  return n.toFixed(decimals);
}

// ── Rank medal ────────────────────────────────────────────────────────────────
function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <span className="font-mono text-sm font-semibold" style={{ color: "#F59E0B" }}>1</span>;
  if (rank === 2) return <span className="font-mono text-sm font-semibold" style={{ color: "#94A3B8" }}>2</span>;
  if (rank === 3) return <span className="font-mono text-sm font-semibold" style={{ color: "#92400E" }}>3</span>;
  return <span className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>{rank}</span>;
}

// ── Diff chip ─────────────────────────────────────────────────────────────────
function DiffChip({ diff }: { diff: string | null }) {
  if (!diff) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  const colors: Record<string, { color: string; bg: string }> = {
    Easy:     { color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    Balanced: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    Hard:     { color: "#F87171", bg: "rgba(248,113,113,0.08)" },
  };
  const c = colors[diff] ?? { color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[9px] tracking-wide" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}22` }}>
      {diff}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [cityFilter, setCityFilter] = useState("All");
  const [loading, setLoading]     = useState(true);
  const [isDemo, setIsDemo]       = useState(false);

  const loadEntries = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setEntries(DEMO_ENTRIES);
      setIsDemo(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Load all, filter client-side — avoids complex PostgREST syntax issues
      const { data, error } = await supabase
        .from("leaderboard_entries")
        .select("*")
        .order("score", { ascending: false })
        .limit(200);
      if (error) throw error;
      setEntries((data ?? []) as LeaderboardEntry[]);
      setIsDemo(false);
    } catch {
      setEntries(DEMO_ENTRIES);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  // Re-fetch when city filter changes (client-side filter on cached data, or fresh fetch)
  useEffect(() => { loadEntries(); }, [loadEntries, cityFilter]);

  const displayed = entries.filter((e) => {
    if (cityFilter === "All") return true;
    if (cityFilter === "Other") return !["Almaty", "Astana", "Shymkent"].includes(e.city);
    return e.city === cityFilter;
  });

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {/* Ambient */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "40%", height: "40%", background: "radial-gradient(ellipse, rgba(217,119,6,0.04) 0%, transparent 65%)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Nardy Blitz</Link>
        <div className="flex items-center gap-3">
          <Link href="/history" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>History</Link>
          <Link href="/tournament" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Tournament</Link>
          <Link href="/multiplayer" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Multiplayer</Link>
          <Link href="/stats" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Stats</Link>
          <Link href="/play" className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}>Play</Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EXPO }} className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: "var(--text-muted)" }}>Global Ranking</div>
          <h1 className="font-sans font-semibold tracking-tight text-balance mb-2" style={{ fontSize: "clamp(1.5rem,4vw,2.25rem)", color: "var(--text-primary)" }}>
            City Leaderboard
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
            Top players ranked by performance score. Filter by city.
          </p>

          {isDemo && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-[10px]" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)", color: "#F59E0B" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F59E0B" }} />
              Demo preview — connect Supabase to show real data
            </div>
          )}
        </motion.div>

        {/* City filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {CITIES.map((city) => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className="px-3.5 py-1.5 rounded-full font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
              style={
                cityFilter === city
                  ? { background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)", color: "var(--gold-bright)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-dim)" }
              }
            >
              {city}
            </button>
          ))}
        </motion.div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="font-mono text-[11px] animate-pulse" style={{ color: "var(--text-dim)" }}>Loading…</div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {cityFilter === "All"
                ? "No leaderboard entries yet."
                : `No entries for ${cityFilter} yet.`}
            </p>
            <Link
              href="/stats"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
              style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
            >
              Submit your score from Stats
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid font-mono text-[9px] uppercase tracking-widest mb-2 px-4" style={{ gridTemplateColumns: "2.5rem 1fr 6rem 5rem 4rem 5rem 5rem 5rem", gap: "0.75rem", color: "var(--text-dim)" }}>
              <span>#</span><span>Player</span><span>City</span><span>Score</span><span>W/L</span><span>Win rate</span><span>Best score</span><span>Difficulty</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {displayed.map((e, i) => (
                <motion.div
                  key={e.id}
                  custom={i}
                  variants={itemIn}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl px-4 py-3 flex flex-col md:grid gap-2 transition-colors duration-150"
                  style={{
                    background: i < 3 ? "rgba(217,119,6,0.04)" : "rgba(14,22,39,0.6)",
                    border: `1px solid ${i < 3 ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.06)"}`,
                    gridTemplateColumns: "2.5rem 1fr 6rem 5rem 4rem 5rem 5rem 5rem",
                  }}
                >
                  {/* Mobile layout */}
                  <div className="md:contents">
                    {/* Rank */}
                    <div className="flex items-center justify-between md:block">
                      <RankCell rank={i + 1} />
                      {/* Mobile: show score right */}
                      <span className="md:hidden font-mono font-semibold text-sm" style={{ color: "var(--gold-bright)" }}>{e.score.toLocaleString()}</span>
                    </div>

                    {/* Name + badges */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-medium text-sm" style={{ color: "var(--text-primary)" }}>{e.player_name}</span>
                        <span className="md:hidden font-mono text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}>{e.city}</span>
                      </div>
                      {e.badges && e.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {e.badges.map((bid) => {
                            const meta = getBadgeMeta(bid);
                            if (!meta) return null;
                            return (
                              <span key={bid} className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* City (desktop) */}
                    <span className="hidden md:block font-sans text-sm" style={{ color: "var(--text-muted)" }}>{e.city}</span>

                    {/* Score (desktop) */}
                    <span className="hidden md:block font-mono font-semibold text-sm tabular-nums" style={{ color: "var(--gold-bright)" }}>{e.score.toLocaleString()}</span>

                    {/* W/L */}
                    <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "#10B981" }}>{e.wins}</span>
                      <span style={{ color: "var(--text-dim)" }}>/</span>
                      <span style={{ color: "#F87171" }}>{e.losses}</span>
                    </span>

                    {/* Win rate */}
                    <span className="hidden md:block font-mono text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {fmt(e.win_rate)}%
                    </span>

                    {/* Best coach */}
                    <span className="hidden md:block font-mono text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {e.best_coach_score > 0 ? fmt(e.best_coach_score) : "—"}
                    </span>

                    {/* Difficulty */}
                    <div className="hidden md:flex items-center">
                      <DiffChip diff={e.favorite_difficulty} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Submit CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl px-5 py-4"
          style={{ background: "rgba(14,22,39,0.7)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="font-sans font-medium text-sm" style={{ color: "var(--text-primary)" }}>Want to appear here?</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>Play matches, earn a coach score, then submit from your Stats page.</p>
          </div>
          <Link
            href="/stats"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.18)", color: "var(--gold-bright)" }}
          >
            Submit to leaderboard
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M2 5.5h7M6.5 3L9 5.5 6.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>

        {/* Setup card — shown when Supabase is not configured */}
        {!isSupabaseConfigured && (
          <div
            className="mt-6 rounded-2xl p-5"
            style={{ background: "rgba(14,22,39,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p
              className="font-mono text-[9px] uppercase tracking-widest mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Enable global leaderboard
            </p>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              Add Supabase env vars and run <span className="font-mono text-[11px]" style={{ color: "#10B981" }}>supabase/schema.sql</span> to replace the demo preview with real player data.
            </p>
            <div
              className="rounded-xl p-3 mb-4 font-mono text-[11px]"
              style={{ background: "rgba(10,16,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div style={{ color: "#10B981" }}>NEXT_PUBLIC_SUPABASE_URL=</div>
              <div style={{ color: "#10B981" }}>NEXT_PUBLIC_SUPABASE_ANON_KEY=</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/play"
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
                style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
              >
                Back to Play
              </Link>
              <Link
                href="/multiplayer"
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
                style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Multiplayer setup
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--text-dim)" }}>
          Built for nFactorial Incubator 2026
        </p>
      </footer>
    </div>
  );
}
