"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Match {
  id: string;
  player1: string;
  player2: string | null;
  winner: string | null;
}

interface Round {
  matches: Match[];
}

interface Tournament {
  id: string;
  players: string[];
  rounds: Round[];
  champion: string | null;
  currentRound: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nardy_blitz_tournaments";
const EXPO = [0.23, 1, 0.32, 1] as const;

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function buildFirstRound(players: string[]): Match[] {
  const size = nextPow2(players.length);
  const padded = [...players];
  while (padded.length < size) padded.push("BYE");

  return Array.from({ length: size / 2 }, (_, i) => {
    const p2 = padded[i * 2 + 1] === "BYE" ? null : padded[i * 2 + 1];
    return {
      id: `r0-m${i}`,
      player1: padded[i * 2],
      player2: p2,
      winner: p2 === null ? padded[i * 2] : null,
    };
  });
}

function buildNextRound(prevRound: Round, roundIdx: number): Round {
  const winners = prevRound.matches.map((m) => m.winner!);
  return {
    matches: Array.from({ length: Math.floor(winners.length / 2) }, (_, i) => ({
      id: `r${roundIdx}-m${i}`,
      player1: winners[i * 2],
      player2: winners[i * 2 + 1] ?? null,
      winner: winners[i * 2 + 1] ? null : winners[i * 2],
    })),
  };
}

function createTournament(players: string[]): Tournament {
  return {
    id: Date.now().toString(),
    players,
    rounds: [{ matches: buildFirstRound(players) }],
    champion: null,
    currentRound: 0,
    createdAt: new Date().toISOString(),
  };
}

function saveTournament(t: Tournament) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch { /* quota */ }
}

function loadTournament(): Tournament | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tournament) : null;
  } catch { return null; }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TournamentPage() {
  const [phase, setPhase]             = useState<"setup" | "bracket" | "champion">("setup");
  const [playerInputs, setPlayerInputs] = useState<string[]>(["", "", "", ""]);
  const [tournament, setTournament]   = useState<Tournament | null>(null);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    const saved = loadTournament();
    if (saved && !saved.champion) {
      setTournament(saved);
      setPhase("bracket");
    } else if (saved?.champion) {
      setTournament(saved);
      setPhase("champion");
    }
    setLoaded(true);
  }, []);

  const validPlayers = playerInputs.map((p) => p.trim()).filter(Boolean);

  function handleStart() {
    if (validPlayers.length < 2) return;
    const t = createTournament(validPlayers);
    setTournament(t);
    saveTournament(t);
    setPhase("bracket");
  }

  function handleSetWinner(roundIdx: number, matchIdx: number, winner: string) {
    if (!tournament) return;
    const t: Tournament = JSON.parse(JSON.stringify(tournament));
    t.rounds[roundIdx].matches[matchIdx].winner = winner;

    const allDone = t.rounds[roundIdx].matches.every((m) => m.winner !== null);
    if (allDone) {
      const winners = t.rounds[roundIdx].matches.map((m) => m.winner!);
      if (winners.length === 1) {
        t.champion = winners[0];
        saveTournament(t);
        setTournament(t);
        setPhase("champion");
        return;
      }
      const next = buildNextRound(t.rounds[roundIdx], roundIdx + 1);
      t.rounds.push(next);
      t.currentRound = roundIdx + 1;
    }

    saveTournament(t);
    setTournament(t);
  }

  function handleReset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
    setTournament(null);
    setPlayerInputs(["", "", "", ""]);
    setPhase("setup");
  }

  if (!loaded) return null;

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {/* Ambient */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "40%", height: "40%", background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "35%", height: "35%", background: "radial-gradient(ellipse, rgba(217,119,6,0.03) 0%, transparent 65%)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Nardy Blitz</Link>
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Leaderboard</Link>
          <Link href="/stats" className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Stats</Link>
          <Link href="/play" className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}>Play</Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <SetupPhase
              key="setup"
              playerInputs={playerInputs}
              setPlayerInputs={setPlayerInputs}
              validCount={validPlayers.length}
              onStart={handleStart}
            />
          )}
          {phase === "bracket" && tournament && (
            <BracketPhase
              key="bracket"
              tournament={tournament}
              onSetWinner={handleSetWinner}
              onReset={handleReset}
            />
          )}
          {phase === "champion" && tournament?.champion && (
            <ChampionPhase
              key="champion"
              champion={tournament.champion}
              players={tournament.players}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--text-dim)" }}>
          Family Tournament Mode — Nardy Blitz
        </p>
      </footer>
    </div>
  );
}

// ── Setup phase ───────────────────────────────────────────────────────────────

function SetupPhase({
  playerInputs,
  setPlayerInputs,
  validCount,
  onStart,
}: {
  playerInputs: string[];
  setPlayerInputs: (v: string[]) => void;
  validCount: number;
  onStart: () => void;
}) {
  function updatePlayer(idx: number, val: string) {
    const next = [...playerInputs];
    next[idx] = val;
    setPlayerInputs(next);
  }

  function addPlayer() {
    if (playerInputs.length < 8) setPlayerInputs([...playerInputs, ""]);
  }

  function removePlayer(idx: number) {
    if (playerInputs.length <= 2) return;
    setPlayerInputs(playerInputs.filter((_, i) => i !== idx));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: EXPO }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: "var(--text-muted)" }}>
        Family Mode
      </div>
      <h1 className="font-sans font-semibold tracking-tight mb-2" style={{ fontSize: "clamp(1.5rem,4vw,2.25rem)", color: "var(--text-primary)" }}>
        Tournament Setup
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
        Enter 2–8 player names. Single-elimination bracket — pick the winner after each match.
      </p>

      <div className="space-y-3 mb-6 max-w-sm">
        {playerInputs.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="font-mono text-[11px] w-5 text-right flex-shrink-0" style={{ color: "var(--text-dim)" }}>
              {idx + 1}
            </span>
            <input
              type="text"
              value={val}
              onChange={(e) => updatePlayer(idx, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && validCount >= 2 && onStart()}
              placeholder={`Player ${idx + 1}`}
              maxLength={20}
              className="flex-1 rounded-xl px-3 py-2.5 font-sans text-sm outline-none transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-primary)",
              }}
            />
            {playerInputs.length > 2 && (
              <button
                onClick={() => removePlayer(idx)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer flex-shrink-0"
                style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.1)", color: "#F87171" }}
                aria-label="Remove player"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {playerInputs.length < 8 && (
          <button
            onClick={addPlayer}
            className="px-4 py-2 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
          >
            + Add player
          </button>
        )}
        <button
          onClick={onStart}
          disabled={validCount < 2}
          className="px-6 py-2 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
        >
          Start tournament ({validCount} players)
        </button>
      </div>

      <div className="rounded-xl p-4 max-w-sm" style={{ background: "rgba(14,22,39,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="font-mono text-[9px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-dim)" }}>How it works</p>
        <ul className="space-y-1.5">
          {[
            "Players are seeded in entry order",
            "Play each match on this device",
            "Tap the winner to advance them",
            "Byes are awarded automatically for odd counts",
          ].map((t) => (
            <li key={t} className="text-xs flex items-start gap-2" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              <span style={{ color: "#10B981", marginTop: 1, flexShrink: 0 }}>·</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ── Bracket phase ─────────────────────────────────────────────────────────────

function BracketPhase({
  tournament,
  onSetWinner,
  onReset,
}: {
  tournament: Tournament;
  onSetWinner: (roundIdx: number, matchIdx: number, winner: string) => void;
  onReset: () => void;
}) {
  const { rounds, currentRound } = tournament;

  const totalRounds = rounds.length;

  function roundLabel(idx: number): string {
    const remaining = totalRounds - idx;
    if (remaining === 1) return "Final";
    if (remaining === 2) return "Semi-finals";
    if (remaining === 3) return "Quarter-finals";
    return `Round ${idx + 1}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: EXPO }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>
          Family Mode
        </div>
        <button
          onClick={onReset}
          className="font-mono text-[10px] px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.1)", color: "#F87171" }}
        >
          Reset
        </button>
      </div>
      <h1 className="font-sans font-semibold tracking-tight mb-6" style={{ fontSize: "clamp(1.3rem,3.5vw,2rem)", color: "var(--text-primary)" }}>
        Tournament Bracket
      </h1>

      <div className="space-y-8">
        {rounds.map((round, rIdx) => {
          const isActive = rIdx === currentRound;
          const isComplete = rIdx < currentRound;

          return (
            <div key={rIdx}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: isActive ? "#10B981" : isComplete ? "var(--text-dim)" : "var(--text-dim)" }}
                >
                  {roundLabel(rIdx)}
                </span>
                {isActive && (
                  <span
                    className="font-mono text-[8px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
                  >
                    Active
                  </span>
                )}
                {isComplete && (
                  <span
                    className="font-mono text-[8px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-dim)" }}
                  >
                    Complete
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {round.matches.map((match, mIdx) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isActive={isActive}
                    onSetWinner={(w) => onSetWinner(rIdx, mIdx, w)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-8 rounded-xl p-4"
        style={{ background: "rgba(14,22,39,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>Players</p>
        <div className="flex flex-wrap gap-2">
          {tournament.players.map((p) => (
            <span key={p} className="font-sans text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-muted)" }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  isActive,
  onSetWinner,
}: {
  match: Match;
  isActive: boolean;
  onSetWinner: (winner: string) => void;
}) {
  const isBye  = match.player2 === null;
  const isDone = match.winner !== null;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{
        background: isActive && !isDone ? "rgba(16,185,129,0.04)" : "rgba(14,22,39,0.6)",
        border: `1px solid ${isActive && !isDone ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {isBye ? (
        <div className="flex items-center gap-2">
          <PlayerChip name={match.player1} isWinner />
          <span className="font-mono text-[10px]" style={{ color: "var(--text-dim)" }}>advances (bye)</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <PlayerChip name={match.player1} isWinner={match.winner === match.player1} />
            {isActive && !isDone && (
              <button
                onClick={() => onSetWinner(match.player1)}
                className="font-mono text-[9px] px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
              >
                Won
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>vs</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div className="flex items-center justify-between">
            <PlayerChip name={match.player2!} isWinner={match.winner === match.player2} />
            {isActive && !isDone && (
              <button
                onClick={() => onSetWinner(match.player2!)}
                className="font-mono text-[9px] px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
              >
                Won
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerChip({ name, isWinner }: { name: string; isWinner?: boolean }) {
  return (
    <span className="font-sans text-sm font-medium" style={{ color: isWinner ? "#F59E0B" : "var(--text-primary)", transition: "color 0.2s" }}>
      {isWinner && <span className="mr-1.5" style={{ color: "#F59E0B" }}>★</span>}
      {name}
    </span>
  );
}

// ── Champion phase ────────────────────────────────────────────────────────────

function ChampionPhase({
  champion,
  players,
  onReset,
}: {
  champion: string;
  players: string[];
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EXPO }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EXPO }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] mb-4" style={{ color: "var(--text-dim)" }}>
          Tournament Champion
        </div>
        <div
          className="font-sans font-bold tracking-tight mb-2"
          style={{ fontSize: "clamp(2.5rem,8vw,5rem)", color: "#F59E0B", lineHeight: 1 }}
        >
          {champion}
        </div>
        <div className="font-mono text-sm mt-4 mb-8" style={{ color: "var(--text-muted)" }}>
          Wins the {players.length}-player Nardy Blitz tournament
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-6 py-2.5 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
          >
            New tournament
          </button>
          <Link
            href="/play"
            className="px-6 py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
          >
            Play solo
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
