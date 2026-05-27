/**
 * Nardy Blitz — Rule-based AI Coach
 *
 * Replays the game move by move and detects notable patterns.
 * Returns at most 5 insights: up to 2 worst mistakes + 1 best move + 2 more.
 */

import type { CoachInsight, GameState, Move, Player } from "../types";
import {
  initializeGame,
  applyMove,
  applyRoll,
  getLegalMoves,
  opponent,
} from "./engine";

export function generateInsights(
  history: Move[],
  finalState: GameState
): CoachInsight[] {
  if (history.length === 0) return [];

  const insights: CoachInsight[] = [];

  // We need to reconstruct dice state per move.
  // The history only records individual moves; we need to group them by turn
  // and reconstruct dice. Since we don't store per-move dice snapshots, we
  // use the finalState dice history is encoded in moves themselves.
  // We'll do a best-effort simulation: replay via a fresh game.

  let state = initializeGame();
  // Override startedAt so timing data doesn't matter
  state = { ...state, startedAt: finalState.startedAt };

  const turnGroups = groupMovesByTurn(history);

  for (const group of turnGroups) {
    if (group.moves.length === 0) continue;

    // Reconstruct the dice that were used
    const diceValues = group.moves.map((m) => m.dieUsed);
    const uniqueDice = Array.from(new Set(diceValues));
    const isDoubles = uniqueDice.length === 1 && diceValues.length === 4;

    const roll: [number, number] = isDoubles
      ? [uniqueDice[0], uniqueDice[0]]
      : diceValues.length >= 2
      ? [diceValues[0], diceValues[1]]
      : [diceValues[0], diceValues[0]];

    const stateWithDice = applyRoll(state, roll);
    const allLegal = getLegalMoves(stateWithDice);
    const player = group.player;

    // Apply the group's moves
    let stateAfter = stateWithDice;
    for (const move of group.moves) {
      stateAfter = applyMove(stateAfter, move);
    }

    // Detect insights for each individual move in the group
    let stateBeforeMove = stateWithDice;
    for (let mi = 0; mi < group.moves.length; mi++) {
      const move = group.moves[mi];
      const moveIdx = getMoveIndex(history, group, mi);

      // blot_left: moved a checker into opponent's inner board leaving a blot
      if (
        typeof move.to === "number" &&
        isInOpponentInnerBoard(move.to, player)
      ) {
        const destPt = stateBeforeMove.board[move.to];
        if (destPt.checkers.length === 0) {
          // Destination was empty → leaving a blot in opp inner board
          insights.push({
            type: "blot_left",
            description: `Point ${move.to + 1}: a lone checker was left in the opponent's inner board, vulnerable to attack.`,
            moveIndex: moveIdx,
          });
        }
      }

      // good_anchor: made a point (2 checkers) in opponent's home board
      if (typeof move.to === "number" && isInOpponentHomeBoard(move.to, player)) {
        const destPt = stateBeforeMove.board[move.to];
        if (destPt.checkers.length === 1 && destPt.checkers[0] === player) {
          insights.push({
            type: "good_anchor",
            description: `Point ${move.to + 1}: an anchor was made in the opponent's home board — excellent defensive position.`,
            moveIndex: moveIdx,
          });
        }
      }

      // strong_move: hit an opponent blot
      if (typeof move.to === "number") {
        const destPt = stateBeforeMove.board[move.to];
        if (destPt.checkers.length === 1 && destPt.checkers[0] === opponent(player)) {
          insights.push({
            type: "strong_move",
            description: `Point ${move.to + 1}: an opponent checker was hit and sent to the bar.`,
            moveIndex: moveIdx,
          });
        }
      }

      stateBeforeMove = applyMove(stateBeforeMove, move);
    }

    // missed_block: player could have made a point but didn't
    const makingPointMoves = allLegal.filter((m) => {
      if (typeof m.to !== "number") return false;
      const destPt = stateWithDice.board[m.to];
      return destPt.checkers.length === 1 && destPt.checkers[0] === player;
    });
    const actuallyMadePoint = group.moves.some((m) => {
      if (typeof m.to !== "number") return false;
      const destPt = stateWithDice.board[m.to];
      return destPt.checkers.length === 1 && destPt.checkers[0] === player;
    });
    if (makingPointMoves.length > 0 && !actuallyMadePoint) {
      const firstMoveIdx =
        history.indexOf(group.moves[0]) !== -1
          ? history.indexOf(group.moves[0])
          : 0;
      insights.push({
        type: "missed_block",
        description: "A chance to make a point was available but not taken — making points reduces the opponent's safe landing zones.",
        moveIndex: firstMoveIdx,
      });
    }

    // wasted_die: a die value was not used but a legal move existed
    const usedDiceSet = new Set(group.moves.map((m) => m.dieUsed));
    const availableDice = Array.from(new Set(stateWithDice.dice?.remaining ?? []));
    for (const die of availableDice) {
      if (!usedDiceSet.has(die)) {
        const couldUse = allLegal.some((m) => m.dieUsed === die);
        if (couldUse) {
          const firstMoveIdx = history.indexOf(group.moves[0]);
          insights.push({
            type: "wasted_die",
            description: `A die showing ${die} was not used, even though a legal move was available.`,
            moveIndex: firstMoveIdx >= 0 ? firstMoveIdx : 0,
          });
        }
      }
    }

    state = stateAfter;
  }

  return selectTopInsights(insights);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TurnGroup {
  player: Player;
  moves: Move[];
}

function groupMovesByTurn(history: Move[]): TurnGroup[] {
  const groups: TurnGroup[] = [];

  let player: Player = "white";
  let i = 0;
  while (i < history.length) {
    const group: Move[] = [];
    const maxMoves = 4;
    let j = i;
    const diesSeen: number[] = [];
    while (j < history.length && group.length < maxMoves) {
      const m = history[j];
      const isDouble = history.slice(i, i + 4).every((hm) => hm.dieUsed === history[i].dieUsed)
        && history.slice(i, i + 4).length === 4;

      if (isDouble && group.length < 4) {
        group.push(history[j]);
        j++;
        if (group.length === 4) break;
      } else {
        if (!isDouble && group.length >= 2) break;
        group.push(history[j]);
        diesSeen.push(m.dieUsed);
        j++;
        if (!isDouble && diesSeen.length >= 2) break;
      }
    }
    groups.push({ player, moves: group });
    player = opponent(player);
    i = j;
  }

  return groups;
}

function getMoveIndex(history: Move[], group: TurnGroup, indexInGroup: number): number {
  const absIdx = history.indexOf(group.moves[indexInGroup]);
  return absIdx >= 0 ? absIdx : 0;
}

function isInOpponentInnerBoard(pointIdx: number, player: Player): boolean {
  // Opponent's inner board:
  //   If player=white, opp=black, opp inner board = indices 18–23
  //   If player=black, opp=white, opp inner board = indices 0–5
  if (player === "white") return pointIdx >= 18 && pointIdx <= 23;
  return pointIdx >= 0 && pointIdx <= 5;
}

function isInOpponentHomeBoard(pointIdx: number, player: Player): boolean {
  // Same as inner board for our purposes
  return isInOpponentInnerBoard(pointIdx, player);
}

/**
 * Select up to 5 insights: 2 worst mistakes + 1 best move + 2 others.
 * Deduplicate overlapping move indices.
 */
function selectTopInsights(insights: CoachInsight[]): CoachInsight[] {
  const mistakes = insights.filter(
    (i) => i.type === "blot_left" || i.type === "missed_block" || i.type === "wasted_die"
  );
  const best = insights.filter(
    (i) => i.type === "good_anchor" || i.type === "strong_move"
  );

  const result: CoachInsight[] = [];
  const usedMoveIndices = new Set<number>();

  for (const insight of mistakes.slice(0, 2)) {
    if (!usedMoveIndices.has(insight.moveIndex)) {
      result.push(insight);
      usedMoveIndices.add(insight.moveIndex);
    }
  }
  for (const insight of best.slice(0, 1)) {
    if (!usedMoveIndices.has(insight.moveIndex)) {
      result.push(insight);
      usedMoveIndices.add(insight.moveIndex);
    }
  }
  // Fill remaining up to 5
  for (const insight of insights) {
    if (result.length >= 5) break;
    if (!usedMoveIndices.has(insight.moveIndex)) {
      result.push(insight);
      usedMoveIndices.add(insight.moveIndex);
    }
  }

  return result.slice(0, 5);
}
