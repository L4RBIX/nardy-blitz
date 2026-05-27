/**
 * Nardy Blitz — Heuristic Bot with three difficulty levels.
 *
 * Easy    — ~52% random legal moves, occasionally misses optimal plays.
 * Balanced— greedy single-move heuristic (original behaviour).
 * Hard    — enhanced scoring: pip count, prime-building, conservative blot play,
 *           picks from top-2 moves (85% best, 15% second-best for variety).
 */

import type { BotDifficulty, GameState, Move, Player } from "../types";
import type { BoardPointIndex } from "../types";
import { getLegalMoves, applyMove, opponent } from "./engine";

// ── Balanced / base scoring ───────────────────────────────────────────────────

function scoreMove(state: GameState, move: Move, player: Player): number {
  const opp = opponent(player);
  const board = state.board;
  let score = 0;

  // 1. Bar entry — highest priority
  if (move.from === `bar-${player}`) score += 1000;

  // 2. Bear off
  if (move.to === `off-${player}`) score += 500;

  // 3. Hit blot
  if (typeof move.to === "number") {
    const toPt = board[move.to];
    if (toPt.checkers.length === 1 && toPt.checkers[0] === opp) {
      score += 800;
      // Extra bonus when opponent's re-entry is harder
      const oppHomeRange = opp === "white" ? [0, 5] : [18, 23];
      let oppBlockedEntries = 0;
      for (let i = oppHomeRange[0]; i <= oppHomeRange[1]; i++) {
        const pt = board[i as BoardPointIndex];
        if (pt && pt.checkers.length >= 2 && pt.checkers[0] === player) oppBlockedEntries++;
      }
      if (oppBlockedEntries >= 2) score += 200;
    }
  }

  // 4. Make a point (land on own blot → 2 checkers = safe)
  if (typeof move.to === "number") {
    const toPt = board[move.to];
    if (toPt.checkers.length === 1 && toPt.checkers[0] === player) {
      score += 600;
      // Anchor bonus: making a point in opponent's home board
      const oppHomeRange = opp === "white" ? [0, 5] : [18, 23];
      if (move.to >= oppHomeRange[0] && move.to <= oppHomeRange[1]) score += 300;
    }
  }

  // 5. Penalise: leaving a blot in opponent's home board
  if (typeof move.to === "number") {
    const oppHomeRange = opp === "white" ? [0, 5] : [18, 23];
    if (move.to >= oppHomeRange[0] && move.to <= oppHomeRange[1]) {
      if (board[move.to].checkers.length === 0) score -= 400;
    }
  }

  // 6. Positional bonus: advance toward home
  if (typeof move.from === "number" && typeof move.to === "number") {
    score += player === "white" ? (move.from - move.to) : (move.to - move.from);
  }

  // 7. Move to own safe point
  if (typeof move.to === "number") {
    const toPt = board[move.to];
    if (toPt.checkers.length >= 2 && toPt.checkers[0] === player) score += 200;
  }

  return score;
}

// ── Hard-mode enhanced scoring ────────────────────────────────────────────────

function scoreMoveHard(state: GameState, move: Move, player: Player): number {
  const base = scoreMove(state, move, player);
  const opp = opponent(player);
  const board = state.board;
  let bonus = 0;

  // Extra pip-count weight (reducing own pips is a proxy for race advantage)
  if (typeof move.from === "number" && typeof move.to === "number") {
    const pipDelta = player === "white" ? (move.from - move.to) : (move.to - move.from);
    bonus += pipDelta * 2;
  }

  // Avoid creating blots anywhere (not just in opp home)
  if (typeof move.to === "number" && board[move.to].checkers.length === 0) {
    bonus -= 200;
  }

  // Prime-building: bonus for placing next to own made point
  if (typeof move.to === "number") {
    const dest = board[move.to];
    if (dest.checkers.length === 0 || (dest.checkers.length === 1 && dest.checkers[0] === player)) {
      for (const adj of [move.to - 1, move.to + 1]) {
        if (adj >= 0 && adj <= 23) {
          const adjPt = board[adj as BoardPointIndex];
          if (adjPt && adjPt.checkers.length >= 2 && adjPt.checkers[0] === player) bonus += 150;
        }
      }
    }
  }

  // Extra hit bonus when opponent already has bar checkers
  if (typeof move.to === "number") {
    const toPt = board[move.to];
    if (toPt.checkers.length === 1 && toPt.checkers[0] === opp) {
      const oppBar = `bar-${opp}` as const;
      if ((board[oppBar]?.checkers.length ?? 0) > 0) bonus += 200;
    }
  }

  return base + bonus;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Choose a sequence of moves for the bot given the current state and difficulty.
 * All returned moves are legal — difficulty only affects which legal moves are chosen.
 */
export function chooseBotMoves(
  state: GameState,
  difficulty: BotDifficulty = "balanced",
): Move[] {
  const chosen: Move[] = [];
  let current = state;

  while (true) {
    if (!current.dice || current.dice.remaining.length === 0) break;
    if (current.winner) break;

    const legal = getLegalMoves(current);
    if (legal.length === 0) break;

    let best: Move;

    if (difficulty === "easy") {
      // ~52% chance of picking a random legal move
      if (Math.random() < 0.52) {
        best = legal[Math.floor(Math.random() * legal.length)];
      } else {
        const scored = legal.map((m) => ({ move: m, score: scoreMove(current, m, current.turn) }));
        scored.sort((a, b) => b.score - a.score);
        best = scored[0].move;
      }
    } else if (difficulty === "hard") {
      const scored = legal.map((m) => ({ move: m, score: scoreMoveHard(current, m, current.turn) }));
      scored.sort((a, b) => b.score - a.score);
      // 85% pick the best, 15% pick second-best (if it exists) for variety
      const topK = Math.min(2, scored.length);
      const idx = scored.length > 1 && Math.random() < 0.15 ? Math.floor(Math.random() * topK) : 0;
      best = scored[idx].move;
    } else {
      // balanced — greedy best
      const scored = legal.map((m) => ({ move: m, score: scoreMove(current, m, current.turn) }));
      scored.sort((a, b) => b.score - a.score);
      best = scored[0].move;
    }

    chosen.push(best);
    current = applyMove(current, best);
  }

  return chosen;
}
