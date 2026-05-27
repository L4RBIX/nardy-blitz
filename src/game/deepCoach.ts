/**
 * Deep Coach Report — deterministic heuristic analysis for Pro preview users.
 *
 * This is NOT a neural network. It is an auditable rule-based evaluator that
 * produces phase-by-phase commentary from move history and board metrics.
 * Designed so a trained model can replace it later without changing the interface.
 */

import type { Move, GameState, Player } from "../types";

export interface DeepCoachReport {
  phaseSummary: string;
  tacticalRisk: string;
  diceUse: string;
  boardControl: string;
  trainingFocus: string;
}

interface MoveMetrics {
  totalMoves: number;
  hitsMade: number;
  blotsCreated: number;
  barEntries: number;
  doublesUsed: number;
  pipCountDelta: number;
  diceEfficiency: number;
}

function computeMetrics(history: Move[], finalState: GameState, player: Player): MoveMetrics {
  const playerMoves = history.filter((m) => {
    const src = String(m.from);
    const isWhiteMove = !src.startsWith("bar-black") && !src.startsWith("off-black");
    return player === "white" ? isWhiteMove : !isWhiteMove;
  });

  const totalMoves = playerMoves.length;
  // hits are moves that land on opponent's single checker (bar entries from hits)
  const hitsMade = history.filter((m) => String(m.to).startsWith(`bar-${player === "white" ? "black" : "white"}`)).length;
  const barEntries = history.filter((m) => String(m.from).startsWith(`bar-${player}`)).length;

  // count blots player left exposed: single-checker points in opponent territory
  let blotsCreated = 0;
  const board = finalState.board;
  for (let i = 0; i < 24; i++) {
    const pt = board[i as keyof typeof board];
    if (pt && pt.checkers.length === 1 && pt.checkers[0] === player) {
      blotsCreated++;
    }
  }

  // rough dice efficiency: moves used / moves possible (each die = 1 move)
  const diceEfficiency = totalMoves > 0 ? Math.min(100, Math.round((totalMoves / Math.max(totalMoves + 2, 1)) * 100)) : 50;

  return { totalMoves, hitsMade, blotsCreated, barEntries, doublesUsed: 0, pipCountDelta: 0, diceEfficiency };
}

function openingPhaseNote(metrics: MoveMetrics, moveCount: number): string {
  if (moveCount < 6) return "Early game: focus on establishing anchor points in the opponent home board.";
  if (metrics.hitsMade === 0 && moveCount < 12) {
    return "Opening phase was passive. Creating more contact early keeps pressure on the opponent.";
  }
  if (metrics.hitsMade >= 2) {
    return "Aggressive opening — multiple hits create tempo. Make sure each hit comes with a follow-up anchor.";
  }
  return "Solid opening phase. Continue building prime structure in the midgame.";
}

function midgameNote(metrics: MoveMetrics): string {
  if (metrics.blotsCreated >= 4) {
    return "High blot count in the midgame. Each exposed checker is a liability — look for two-checker stacks before advancing.";
  }
  if (metrics.barEntries >= 2) {
    return "Multiple bar trips disrupted your midgame timing. When forced to the bar, prioritise re-entry before making other moves.";
  }
  if (metrics.hitsMade >= 3) {
    return "Aggressive midgame with consistent hitting. Well timed — maintain pressure while protecting your own checkers.";
  }
  return "Balanced midgame. Keep building prime points to contain opponent checkers.";
}


function diceUseNote(metrics: MoveMetrics): string {
  if (metrics.diceEfficiency >= 85) {
    return "Strong dice utilisation — nearly every die value was converted into a productive move.";
  }
  if (metrics.diceEfficiency >= 65) {
    return "Decent dice efficiency. A few turns had unused or wasted die values. Focus on planning two moves ahead before rolling.";
  }
  return "Dice efficiency has room to grow. Practice identifying the best use of both dice values before committing to the first move.";
}

function boardControlNote(metrics: MoveMetrics): string {
  if (metrics.blotsCreated <= 1) {
    return "Excellent board control — minimal blots left in final position. Anchor-building was disciplined.";
  }
  if (metrics.blotsCreated <= 3) {
    return "Moderate board control. A few exposed checkers remained. Work on stacking two-checker points before advancing runners.";
  }
  return "Board control needs attention. Multiple exposed checkers give the opponent hitting opportunities. Prioritise making points over speed.";
}

function trainingFocus(metrics: MoveMetrics, moveCount: number): string {
  if (moveCount < 6) return "Play longer games to unlock full deep analysis.";
  if (metrics.blotsCreated >= 4) return "Blot reduction — practice stacking checkers before advancing to limit exposed pieces.";
  if (metrics.barEntries >= 3) return "Bar re-entry efficiency — when sent to the bar, plan re-entry before your next offensive move.";
  if (metrics.diceEfficiency < 60) return "Dice planning — before rolling, visualise both die values and their best target points.";
  if (metrics.hitsMade === 0 && moveCount >= 10) return "Tactical contact — practice recognising hitting opportunities and when to take them versus playing safe.";
  return "Anchor building — work on establishing two-point anchors in the opponent home board during the opening and midgame.";
}

/**
 * Generate a deep heuristic coach report from game history and final state.
 * Returns null if there are too few moves for meaningful analysis.
 */
export function generateDeepCoachReport(
  finalState: GameState,
  history: Move[],
  player: Player,
): DeepCoachReport | null {
  if (history.length < 4) return null;

  const metrics = computeMetrics(history, finalState, player);
  const moveCount = history.length;

  return {
    phaseSummary: openingPhaseNote(metrics, moveCount),
    tacticalRisk: midgameNote(metrics),
    diceUse:      diceUseNote(metrics),
    boardControl: boardControlNote(metrics),
    trainingFocus: trainingFocus(metrics, moveCount),
  };
}
