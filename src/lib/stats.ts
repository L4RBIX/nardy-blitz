/**
 * Shared stats recorder used by both /play (gameStore) and /multiplayer.
 * All localStorage access is silently guarded — never throws.
 */

import type { BotDifficulty, GameMode, GameStats, Player, RecentGame } from "../types";

// ── Storage key ───────────────────────────────────────────────────────────────

export const STATS_KEY = "nardy_blitz_stats";

// ── Default / load / save ─────────────────────────────────────────────────────

export function defaultStats(): GameStats {
  return {
    gamesPlayed: 0, winsVsBot: 0, lossesVsBot: 0,
    totalDurationMs: 0, currentStreak: 0, longestStreak: 0, games: [],
    totalCoachScore: 0, totalCoachScoreGames: 0, bestCoachScore: 0,
    totalDiceEfficiency: 0, totalDiceEfficiencyGames: 0,
    totalHitsMade: 0, totalPointsMade: 0, totalBlotsLeft: 0, totalBarEntries: 0,
    difficultyStats: { easy: 0, balanced: 0, hard: 0 },
    recentGames: [],
    winsMultiplayer: 0,
    lossesMultiplayer: 0,
  };
}

export function loadStats(): GameStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
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
  } catch { /* corrupt data — reset */ }
  return defaultStats();
}

export function saveStats(stats: GameStats): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* quota */ }
}

// ── Record a completed game ───────────────────────────────────────────────────

export interface RecordGameInput {
  mode: GameMode;
  result: RecentGame["result"];
  winner: Player;
  humanPlayer?: Player;
  botDifficulty?: BotDifficulty;
  durationMs: number;
}

/**
 * Atomically update local stats for a completed game.
 * Returns a stable ID that can be used later with patchGameWithCoachData.
 */
export function recordCompletedGame(input: RecordGameInput): string {
  const stats = loadStats();
  stats.gamesPlayed     += 1;
  stats.totalDurationMs += input.durationMs;

  const won = input.result === "win" || input.result === "win_by_surrender";

  if (input.mode === "vs-bot") {
    if (won) {
      stats.winsVsBot     += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
    } else {
      stats.lossesVsBot   += 1;
      stats.currentStreak  = 0;
    }
    if (input.botDifficulty) {
      const ds = stats.difficultyStats ?? { easy: 0, balanced: 0, hard: 0 };
      ds[input.botDifficulty] = (ds[input.botDifficulty] ?? 0) + 1;
      stats.difficultyStats = ds;
    }
  } else if (input.mode === "multiplayer") {
    if (won) {
      stats.winsMultiplayer = (stats.winsMultiplayer ?? 0) + 1;
      stats.currentStreak  += 1;
      if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
    } else {
      stats.lossesMultiplayer = (stats.lossesMultiplayer ?? 0) + 1;
      stats.currentStreak = 0;
    }
  }
  // "2player" local mode: gamesPlayed + duration only, no win/loss tracking.

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry: RecentGame = {
    id,
    date:            Date.now(),
    mode:            input.mode,
    result:          input.result,
    winner:          input.winner,
    durationSeconds: input.durationMs / 1000,
    ...(input.humanPlayer   !== undefined && { humanPlayer:   input.humanPlayer   }),
    ...(input.botDifficulty !== undefined && { botDifficulty: input.botDifficulty }),
  };

  stats.games.push({ winner: input.winner, mode: input.mode, durationMs: input.durationMs, date: Date.now() });
  stats.recentGames = [...(stats.recentGames ?? []), entry].slice(-10);

  saveStats(stats);
  return id;
}

// ── Patch a completed game with coach data once analysis finishes ─────────────

export function patchGameWithCoachData(
  gameId: string,
  coachData: {
    coachScore?: number;
    grade?: "A" | "B" | "C" | "D";
    diceEfficiency?: number;
    hitsMade?: number;
    pointsMade?: number;
    blotsLeft?: number;
    barEntries?: number;
    analysisMode: "backend-ml-style-evaluator" | "local-fallback";
  },
): void {
  if (typeof window === "undefined") return;
  try {
    const stats = loadStats();
    const games = stats.recentGames ?? [];
    const idx   = games.findIndex((g) => g.id === gameId);
    if (idx === -1) return;

    games[idx] = { ...games[idx], ...coachData };
    stats.recentGames = games;

    if (coachData.coachScore !== undefined) {
      stats.totalCoachScore      = (stats.totalCoachScore      ?? 0) + coachData.coachScore;
      stats.totalCoachScoreGames = (stats.totalCoachScoreGames ?? 0) + 1;
      if (coachData.coachScore > (stats.bestCoachScore ?? 0)) stats.bestCoachScore = coachData.coachScore;
    }
    if (coachData.diceEfficiency !== undefined) {
      stats.totalDiceEfficiency      = (stats.totalDiceEfficiency      ?? 0) + coachData.diceEfficiency;
      stats.totalDiceEfficiencyGames = (stats.totalDiceEfficiencyGames ?? 0) + 1;
    }
    if (coachData.hitsMade   !== undefined) stats.totalHitsMade   = (stats.totalHitsMade   ?? 0) + coachData.hitsMade;
    if (coachData.pointsMade !== undefined) stats.totalPointsMade = (stats.totalPointsMade ?? 0) + coachData.pointsMade;
    if (coachData.blotsLeft  !== undefined) stats.totalBlotsLeft  = (stats.totalBlotsLeft  ?? 0) + coachData.blotsLeft;
    if (coachData.barEntries !== undefined) stats.totalBarEntries = (stats.totalBarEntries ?? 0) + coachData.barEntries;

    saveStats(stats);
  } catch { /* ignore */ }
}
