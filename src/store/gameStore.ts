import { create } from "zustand";
import type { BotDifficulty, GameState, Move, Player, GameMode, RecentGame } from "../types";
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
import { isProPreviewUnlocked } from "../lib/pro";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { recordCompletedGame, patchGameWithCoachData } from "../lib/stats";

// ── Persistence helpers (difficulty only — stats live in lib/stats) ───────────

const DIFFICULTY_KEY = "nardy_blitz_difficulty";

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

// ── Helpers: compute result for the local player ──────────────────────────────

function botResult(
  winner: Player,
  humanPlayer: Player,
  isSurrender: boolean,
): RecentGame["result"] {
  const humanWon = winner === humanPlayer;
  if (humanWon) return isSurrender ? "win_by_surrender" : "win";
  return isSurrender ? "loss_by_surrender" : "loss";
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
      const result = mode === "vs-bot"
        ? botResult(winner, humanPlayer, false)
        : (winner === "white" ? "win" : "loss");
      const gameId = recordCompletedGame({ mode, result, winner, humanPlayer, botDifficulty, durationMs });
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

    const result = mode === "vs-bot"
      ? botResult(winner, humanPlayer, true)
      : "loss_by_surrender";
    const gameId = recordCompletedGame({ mode, result, winner, humanPlayer, botDifficulty, durationMs });

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
          patchGameWithCoachData(_lastGameId, {
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

        // Cloud save to match_history when Pro preview is active
        if (isProPreviewUnlocked() && isSupabaseConfigured && supabase) {
          const { gameState: gs, mode: m, humanPlayer: hp, botDifficulty: bd } = get();
          supabase.from("match_history").insert({
            mode:             m,
            result:           report.result ?? null,
            player_color:     hp,
            difficulty:       bd,
            duration_seconds: Math.round(durationSeconds),
            coach_score:      report.coachScore ?? null,
            grade:            report.grade ?? null,
            dice_efficiency:  report.metrics?.diceEfficiency ?? null,
            moves_count:      gs.history.length,
          }).then(() => { /* silent — local history is the source of truth */ });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backend unavailable";
      set({ analysisError: msg, isAnalyzing: false });
      if (_lastGameId) {
        patchGameWithCoachData(_lastGameId, { analysisMode: "local-fallback" });
      }

      // Cloud save with local-analysis data when backend unavailable
      if (isProPreviewUnlocked() && isSupabaseConfigured && supabase) {
        const { gameState: gs, mode: m, humanPlayer: hp, botDifficulty: bd } = get();
        supabase.from("match_history").insert({
          mode:             m,
          player_color:     hp,
          difficulty:       bd,
          duration_seconds: Math.round(durationSeconds),
          moves_count:      gs.history.length,
        }).then(() => { /* silent */ });
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
            const result = botResult(winner, humanPlayer, false);
            const gameId = recordCompletedGame({ mode: "vs-bot", result, winner, humanPlayer, botDifficulty: diff, durationMs });
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
