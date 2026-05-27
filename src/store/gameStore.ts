import { create } from "zustand";
import type { BotDifficulty, GameState, Move, Player, GameMode, GameStats, RecentGame } from "../types";
import {
  initializeGame,
  rollDice,
  applyMove,
  applyRoll,
  getLegalMoves,
  endTurn,
  checkWinner,
  opponent,
} from "../game/engine";
import { chooseBotMoves } from "../game/bot";
import { generateInsights } from "../game/coach";
import { encodeState, decodeState } from "../game/serialize";
import type { CoachInsight, PointIndex } from "../types";
import { analyzeGameWithBackend } from "../lib/coachApi";
import type { BackendCoachReport } from "../lib/coachApi";

// ── Persistence helpers ────────────────────────────────────────────────────────

const STATS_KEY      = "nardy_blitz_stats";
const DIFFICULTY_KEY = "nardy_blitz_difficulty";

function defaultStats(): GameStats {
  return {
    gamesPlayed: 0, winsVsBot: 0, lossesVsBot: 0,
    totalDurationMs: 0, currentStreak: 0, longestStreak: 0, games: [],
    totalCoachScore: 0, totalCoachScoreGames: 0, bestCoachScore: 0,
    totalDiceEfficiency: 0, totalDiceEfficiencyGames: 0,
    totalHitsMade: 0, totalPointsMade: 0, totalBlotsLeft: 0, totalBarEntries: 0,
    difficultyStats: { easy: 0, balanced: 0, hard: 0 },
    recentGames: [],
  };
}

function loadStats(): GameStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const p = JSON.parse(raw) as Partial<GameStats>;
    // Safe migration — fill every field, never throw
    return {
      gamesPlayed:           p.gamesPlayed           ?? 0,
      winsVsBot:             p.winsVsBot             ?? 0,
      lossesVsBot:           p.lossesVsBot           ?? 0,
      totalDurationMs:       p.totalDurationMs       ?? 0,
      currentStreak:         p.currentStreak         ?? 0,
      longestStreak:         p.longestStreak         ?? 0,
      games:                 p.games                 ?? [],
      totalCoachScore:       p.totalCoachScore       ?? 0,
      totalCoachScoreGames:  p.totalCoachScoreGames  ?? 0,
      bestCoachScore:        p.bestCoachScore        ?? 0,
      totalDiceEfficiency:   p.totalDiceEfficiency   ?? 0,
      totalDiceEfficiencyGames: p.totalDiceEfficiencyGames ?? 0,
      totalHitsMade:         p.totalHitsMade         ?? 0,
      totalPointsMade:       p.totalPointsMade       ?? 0,
      totalBlotsLeft:        p.totalBlotsLeft        ?? 0,
      totalBarEntries:       p.totalBarEntries       ?? 0,
      difficultyStats:       p.difficultyStats       ?? { easy: 0, balanced: 0, hard: 0 },
      recentGames:           p.recentGames           ?? [],
    };
  } catch { /* ignore */ }
  return defaultStats();
}

function saveStats(stats: GameStats) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

/** Record a completed game. Returns a stable ID for later coach-data patching. */
function recordGameResult(
  winner:       Player,
  mode:         GameMode,
  durationMs:   number,
  humanPlayer:  Player,
  botDifficulty: BotDifficulty,
  isSurrender:  boolean,
): string {
  const stats = loadStats();
  stats.gamesPlayed   += 1;
  stats.totalDurationMs += durationMs;

  const humanWon = mode === "vs-bot" ? winner === humanPlayer : winner === "white";

  if (mode === "vs-bot") {
    if (humanWon) {
      stats.winsVsBot     += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
    } else {
      stats.lossesVsBot   += 1;
      stats.currentStreak  = 0;
    }
    const ds = stats.difficultyStats ?? { easy: 0, balanced: 0, hard: 0 };
    ds[botDifficulty] = (ds[botDifficulty] ?? 0) + 1;
    stats.difficultyStats = ds;
  }

  let result: RecentGame["result"];
  if (mode === "vs-bot") {
    if (humanWon)  result = isSurrender ? "win_by_surrender"  : "win";
    else           result = isSurrender ? "loss_by_surrender" : "loss";
  } else {
    result = winner === "white" ? "win" : "loss";
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const recentGame: RecentGame = {
    id,
    date: Date.now(),
    mode,
    result,
    winner,
    ...(mode === "vs-bot" && { humanPlayer, botDifficulty }),
    durationSeconds: durationMs / 1000,
  };

  stats.games.push({ winner, mode, durationMs, date: Date.now() });
  stats.recentGames = [...(stats.recentGames ?? []), recentGame].slice(-10);

  saveStats(stats);
  return id;
}

/** Patch an existing recentGames entry with coach report data once analysis completes. */
function patchLastGameWithCoachData(
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
) {
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
    if (coachData.hitsMade    !== undefined) stats.totalHitsMade    = (stats.totalHitsMade    ?? 0) + coachData.hitsMade;
    if (coachData.pointsMade  !== undefined) stats.totalPointsMade  = (stats.totalPointsMade  ?? 0) + coachData.pointsMade;
    if (coachData.blotsLeft   !== undefined) stats.totalBlotsLeft   = (stats.totalBlotsLeft   ?? 0) + coachData.blotsLeft;
    if (coachData.barEntries  !== undefined) stats.totalBarEntries  = (stats.totalBarEntries  ?? 0) + coachData.barEntries;

    saveStats(stats);
  } catch { /* ignore */ }
}

function loadDifficulty(): BotDifficulty {
  if (typeof window === "undefined") return "balanced";
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    if (raw === "easy" || raw === "balanced" || raw === "hard") return raw;
  } catch { /* ignore */ }
  return "balanced";
}

function saveDifficulty(d: BotDifficulty) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(DIFFICULTY_KEY, d); } catch { /* ignore */ }
}

// ── Store interface ────────────────────────────────────────────────────────────

interface GameStore {
  gameState: GameState;
  mode: GameMode;
  selectedFrom: PointIndex | null;
  legalMoves: Move[];
  insights: CoachInsight[];
  showCoach: boolean;
  isBotThinking: boolean;
  backendReport: BackendCoachReport | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  humanPlayer: Player;
  botPlayer: Player;
  botDifficulty: BotDifficulty;
  wasSurrender: boolean;

  // Internal — tracks which recentGames entry to patch with coach data
  _lastGameId: string | null;

  setMode: (mode: GameMode) => void;
  startGame: () => void;
  roll: () => void;
  selectFrom: (from: PointIndex) => void;
  makeMove: (move: Move) => void;
  surrender: () => void;
  dismissCoach: () => void;
  loadFromUrl: () => void;
  copyShareUrl: () => void;
  setBotDifficulty: (d: BotDifficulty) => void;

  analyzeCompletedGame: () => Promise<void>;
  openCoachModal: () => void;
  closeCoachModal: () => void;
  clearCoachReport: () => void;

  _runBot: (state: GameState) => void;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initializeGame(),
  mode: "vs-bot",
  selectedFrom: null,
  legalMoves: [],
  insights: [],
  showCoach: false,
  isBotThinking: false,
  backendReport: null,
  isAnalyzing: false,
  analysisError: null,

  humanPlayer: "white",
  botPlayer: "black",
  botDifficulty: loadDifficulty(),
  wasSurrender: false,
  _lastGameId: null,

  // ── Mode + game start ───────────────────────────────────────────────────────

  setMode: (mode) => {
    set({ mode });
    get().startGame();
  },

  startGame: () => {
    const { mode } = get();
    const humanPlayer: Player =
      mode === "vs-bot" ? (Math.random() < 0.5 ? "white" : "black") : "white";
    const botPlayer: Player = opponent(humanPlayer);
    const initialGame = initializeGame();

    set({
      gameState: initialGame,
      humanPlayer,
      botPlayer,
      selectedFrom: null,
      legalMoves: [],
      insights: [],
      showCoach: false,
      isBotThinking: false,
      backendReport: null,
      isAnalyzing: false,
      analysisError: null,
      wasSurrender: false,
      _lastGameId: null,
    });

    if (mode === "vs-bot" && initialGame.turn === botPlayer) {
      get()._runBot(initialGame);
    }
  },

  setBotDifficulty: (d) => {
    saveDifficulty(d);
    set({ botDifficulty: d });
  },

  // ── Roll ────────────────────────────────────────────────────────────────────

  roll: () => {
    const { gameState, mode, botPlayer } = get();
    if (gameState.dice !== null) return;
    if (gameState.winner !== null) return;

    const roll = rollDice();
    const newState = applyRoll(gameState, roll);
    const legal = getLegalMoves(newState);

    if (legal.length === 0) {
      const passed = endTurn(newState);
      set({ gameState: passed, legalMoves: [], selectedFrom: null });
      if (mode === "vs-bot" && passed.turn === botPlayer) get()._runBot(passed);
      return;
    }

    set({ gameState: newState, legalMoves: legal, selectedFrom: null });
    if (mode === "vs-bot" && newState.turn === botPlayer) get()._runBot(newState);
  },

  // ── Select + move ───────────────────────────────────────────────────────────

  selectFrom: (from) => {
    const { gameState, legalMoves } = get();
    if (!gameState.dice) return;
    if (gameState.winner) return;
    if (legalMoves.filter((m) => m.from === from).length === 0) return;
    set({ selectedFrom: from });
  },

  makeMove: (move) => {
    const { gameState, mode, botPlayer, humanPlayer, botDifficulty } = get();
    if (!gameState.dice) return;
    if (gameState.winner) return;

    const newState = applyMove(gameState, move);
    const winner   = checkWinner(newState);

    if (winner) {
      const durationMs = Date.now() - newState.startedAt;
      const gameId = recordGameResult(winner, mode, durationMs, humanPlayer, botDifficulty, false);
      let insights: CoachInsight[] = [];
      try { insights = generateInsights(newState.history, newState); } catch { /* non-fatal */ }
      set({ gameState: newState, selectedFrom: null, legalMoves: [], insights, _lastGameId: gameId });
      get().analyzeCompletedGame();
      return;
    }

    const remaining = newState.dice?.remaining ?? [];
    if (remaining.length === 0) {
      const turned = endTurn(newState);
      set({ gameState: turned, selectedFrom: null, legalMoves: [] });
      if (mode === "vs-bot" && turned.turn === botPlayer) get()._runBot(turned);
      return;
    }

    const legal = getLegalMoves(newState);
    if (legal.length === 0) {
      const turned = endTurn(newState);
      set({ gameState: turned, selectedFrom: null, legalMoves: [] });
      if (mode === "vs-bot" && turned.turn === botPlayer) get()._runBot(turned);
      return;
    }

    set({ gameState: newState, selectedFrom: null, legalMoves: legal });
    if (mode === "vs-bot" && newState.turn === botPlayer) get()._runBot(newState);
  },

  // ── Surrender ───────────────────────────────────────────────────────────────

  surrender: () => {
    const { gameState, mode, botPlayer, humanPlayer, botDifficulty } = get();
    if (gameState.winner) return;

    const winner: Player = mode === "vs-bot" ? botPlayer : opponent(gameState.turn);
    const durationMs = Date.now() - gameState.startedAt;
    const newState: GameState = { ...gameState, winner, dice: null };
    const gameId = recordGameResult(winner, mode, durationMs, humanPlayer, botDifficulty, true);

    let insights: CoachInsight[] = [];
    try { insights = generateInsights(gameState.history, newState); } catch { /* non-fatal */ }

    set({
      gameState: newState,
      insights,
      legalMoves: [],
      selectedFrom: null,
      isBotThinking: false,
      wasSurrender: true,
      _lastGameId: gameId,
    });
    get().analyzeCompletedGame();
  },

  // ── Coach modal ─────────────────────────────────────────────────────────────

  dismissCoach: () => {
    set({ showCoach: false });
    get().startGame();
  },

  openCoachModal:   () => set({ showCoach: true }),
  closeCoachModal:  () => set({ showCoach: false }),
  clearCoachReport: () => set({ backendReport: null, isAnalyzing: false, analysisError: null }),

  // ── Analysis ────────────────────────────────────────────────────────────────

  analyzeCompletedGame: async () => {
    const { gameState, mode, humanPlayer, botDifficulty, wasSurrender, _lastGameId } = get();
    if (!gameState.winner) return;
    if (get().isAnalyzing) return;

    set({ showCoach: true, isAnalyzing: true, backendReport: null, analysisError: null });

    const durationSeconds = (Date.now() - gameState.startedAt) / 1000;

    try {
      const report = await analyzeGameWithBackend({
        winner: gameState.winner,
        mode,
        durationSeconds,
        history: gameState.history,
        finalState: gameState,
        ...(mode === "vs-bot" && { humanPlayer, botDifficulty, isSurrender: wasSurrender }),
      });

      if (get().showCoach) {
        set({ backendReport: report, isAnalyzing: false });
        if (_lastGameId && report.metrics) {
          patchLastGameWithCoachData(_lastGameId, {
            coachScore:     report.coachScore,
            grade:          report.grade,
            diceEfficiency: report.metrics.diceEfficiency,
            hitsMade:       report.metrics.hitsMade,
            pointsMade:     report.metrics.pointsMade,
            blotsLeft:      report.metrics.blotsLeft,
            barEntries:     report.metrics.barEntries,
            analysisMode:   "backend-ml-style-evaluator",
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backend unavailable";
      set({ analysisError: msg, isAnalyzing: false });
      if (_lastGameId) {
        patchLastGameWithCoachData(_lastGameId, { analysisMode: "local-fallback" });
      }
    }
  },

  // ── URL share / load ────────────────────────────────────────────────────────

  loadFromUrl: () => {
    if (typeof window === "undefined") return;
    const params  = new URLSearchParams(window.location.search);
    const encoded = params.get("state");
    if (!encoded) return;
    const decoded = decodeState(encoded);
    if (decoded) {
      const humanPlayer   = (params.get("hp") as Player | null) ?? "white";
      const botPlayer     = opponent(humanPlayer);
      const raw           = params.get("diff") ?? "balanced";
      const botDifficulty: BotDifficulty =
        raw === "easy" || raw === "hard" ? raw : "balanced";
      const legal = decoded.dice ? getLegalMoves(decoded) : [];
      set({ gameState: decoded, legalMoves: legal, selectedFrom: null, humanPlayer, botPlayer, botDifficulty });
    }
  },

  copyShareUrl: () => {
    const { gameState, humanPlayer, botDifficulty } = get();
    const encoded = encodeState(gameState);
    const url = `${window.location.origin}/play?state=${encoded}&hp=${humanPlayer}&diff=${botDifficulty}`;
    navigator.clipboard.writeText(url).catch(() => {});
  },

  // ── Bot runner ──────────────────────────────────────────────────────────────

  _runBot: (state: GameState) => {
    set({ isBotThinking: true });

    setTimeout(() => {
      const { mode, gameState: cur, botDifficulty } = get();
      if (mode !== "vs-bot" || cur.winner !== null) {
        set({ isBotThinking: false });
        return;
      }

      const roll          = rollDice();
      const stateWithDice = applyRoll(state, roll);
      const legal         = getLegalMoves(stateWithDice);

      if (legal.length === 0) {
        const turned = endTurn(stateWithDice);
        set({ gameState: turned, legalMoves: [], isBotThinking: false });
        return;
      }

      set({ gameState: stateWithDice });

      const moves = chooseBotMoves(stateWithDice, botDifficulty);
      let current = stateWithDice;

      const applyNextMove = (idx: number) => {
        if (get().gameState.winner !== null) { set({ isBotThinking: false }); return; }

        if (idx >= moves.length) {
          const winner = checkWinner(current);
          if (winner) {
            const { humanPlayer, botDifficulty: diff } = get();
            const durationMs = Date.now() - current.startedAt;
            const gameId = recordGameResult(winner, "vs-bot", durationMs, humanPlayer, diff, false);
            let insights: CoachInsight[] = [];
            try { insights = generateInsights(current.history, current); } catch { /* non-fatal */ }
            set({ gameState: current, isBotThinking: false, legalMoves: [], insights, _lastGameId: gameId });
            get().analyzeCompletedGame();
          } else {
            const remaining = current.dice?.remaining ?? [];
            if (remaining.length === 0 || moves.length === 0) {
              set({ gameState: endTurn(current), legalMoves: [], isBotThinking: false });
            } else {
              set({ gameState: current, legalMoves: [], isBotThinking: false });
            }
          }
          return;
        }

        current = applyMove(current, moves[idx]);
        set({ gameState: current });
        setTimeout(() => applyNextMove(idx + 1), 300);
      };

      setTimeout(() => applyNextMove(0), 400);
    }, 600);
  },
}));
