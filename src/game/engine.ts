/**
 * Nardy Blitz — Backgammon Engine
 *
 * CONVENTION:
 *   Points are numbered 1–24 internally but stored as 0-indexed (0–23).
 *   White moves from index 23 down toward index 0. White's home board: indices 0–5.
 *   Black moves from index 0 up toward index 23. Black's home board: indices 18–23.
 *
 *   Bar entry:
 *     White enters from bar onto Black's home board (indices 18–23).
 *     Black enters from bar onto White's home board (indices 0–5).
 *
 *   Bearing off:
 *     White bears off from indices 0–5 (to "off-white").
 *     Black bears off from indices 18–23 (to "off-black").
 *
 *   A simplified bearing-off rule is used:
 *     When all 15 checkers are in the home board, a player may bear off
 *     by moving the checker on the exact pip (die value = distance from
 *     the edge of the board), or if no checker exists on that pip, the
 *     highest occupied pip in the home board that is ≤ the die value.
 */

import type {
  GameState,
  Player,
  Point,
  PointIndex,
  Move,
  BoardPointIndex,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyPoint(): Point {
  return { checkers: [] };
}

function isBoardIndex(idx: PointIndex): idx is BoardPointIndex {
  return typeof idx === "number";
}

export function opponent(player: Player): Player {
  return player === "white" ? "black" : "white";
}

function cloneBoard(board: Record<PointIndex, Point>): Record<PointIndex, Point> {
  const next = {} as Record<PointIndex, Point>;
  for (const key in board) {
    const k = key as PointIndex;
    next[k] = { checkers: [...board[k].checkers] };
  }
  return next;
}

function cloneState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    dice: state.dice
      ? { values: [...state.dice.values] as [number, number], remaining: [...state.dice.remaining] }
      : null,
    history: [...state.history],
    winner: state.winner,
    startedAt: state.startedAt,
  };
}

// ─── Initialise ───────────────────────────────────────────────────────────────

export function initializeGame(): GameState {
  const board: Record<PointIndex, Point> = {} as Record<PointIndex, Point>;

  // All 24 board points start empty
  for (let i = 0; i < 24; i++) {
    board[i as BoardPointIndex] = emptyPoint();
  }
  board["bar-white"] = emptyPoint();
  board["bar-black"] = emptyPoint();
  board["off-white"] = emptyPoint();
  board["off-black"] = emptyPoint();

  // Standard backgammon starting position
  // White moves 23→0, Black moves 0→23
  //
  // Point descriptions (0-indexed):
  //  0  = White's 1-point  (White home)
  //  5  = White's 6-point  (Black's bar-point)
  //  7  = White's 8-point
  // 11  = White's 12-point (Black's bar-point mirror)
  // 12  = Black's 13-point
  // 16  = Black's 17-point (White's bar-point mirror)
  // 18  = Black's 19-point
  // 23  = Black's 24-point (Black home)

  // White checkers (2 on 23, 5 on 12, 3 on 7, 5 on 5)
  place(board, 23, "white", 2);
  place(board, 12, "white", 5);
  place(board, 7, "white", 3);
  place(board, 5, "white", 5);

  // Black checkers (mirror: 2 on 0, 5 on 11, 3 on 16, 5 on 18)
  place(board, 0, "black", 2);
  place(board, 11, "black", 5);
  place(board, 16, "black", 3);
  place(board, 18, "black", 5);

  return {
    board,
    turn: "white",
    dice: null,
    history: [],
    winner: null,
    startedAt: Date.now(),
  };
}

function place(board: Record<PointIndex, Point>, idx: number, player: Player, count: number) {
  for (let i = 0; i < count; i++) {
    board[idx as BoardPointIndex].checkers.push(player);
  }
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

export function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

export function expandDiceToRemaining(dice: [number, number]): number[] {
  if (dice[0] === dice[1]) {
    return [dice[0], dice[0], dice[0], dice[0]];
  }
  return [...dice];
}

// ─── Rule helpers ─────────────────────────────────────────────────────────────

export function mustEnterFromBar(state: GameState, player: Player): boolean {
  const barKey: PointIndex = player === "white" ? "bar-white" : "bar-black";
  return state.board[barKey].checkers.length > 0;
}

/**
 * Returns true if the target point is blocked for the given player.
 * Blocked = 2 or more opponent checkers.
 */
function isBlocked(board: Record<PointIndex, Point>, to: BoardPointIndex, player: Player): boolean {
  const pt = board[to];
  return pt.checkers.length >= 2 && pt.checkers[0] === opponent(player);
}

export function canBearOff(state: GameState, player: Player): boolean {
  const homeRange = player === "white" ? [0, 5] : [18, 23];
  let outsideHome = 0;

  for (let i = 0; i < 24; i++) {
    const idx = i as BoardPointIndex;
    const pt = state.board[idx];
    const hasOwn = pt.checkers.some((c) => c === player);
    if (hasOwn && (i < homeRange[0] || i > homeRange[1])) {
      outsideHome += pt.checkers.filter((c) => c === player).length;
    }
  }
  // Also check bar
  const barKey: PointIndex = player === "white" ? "bar-white" : "bar-black";
  outsideHome += state.board[barKey].checkers.filter((c) => c === player).length;

  return outsideHome === 0;
}

export function checkWinner(state: GameState): Player | null {
  const whiteOff = state.board["off-white"].checkers.filter((c) => c === "white").length;
  if (whiteOff >= 15) return "white";
  const blackOff = state.board["off-black"].checkers.filter((c) => c === "black").length;
  if (blackOff >= 15) return "black";
  return null;
}

// ─── Legal move generation ─────────────────────────────────────────────────────

export function getLegalMoves(state: GameState): Move[] {
  if (!state.dice || state.dice.remaining.length === 0) return [];

  const player = state.turn;
  const remaining = state.dice.remaining;
  // Deduplicate dice values to avoid redundant identical moves
  const uniqueDice = Array.from(new Set(remaining));
  const moves: Move[] = [];
  const seen = new Set<string>();

  function addMove(m: Move) {
    const key = `${m.from}:${m.to}:${m.dieUsed}`;
    if (!seen.has(key)) {
      seen.add(key);
      moves.push(m);
    }
  }

  if (mustEnterFromBar(state, player)) {
    // Must enter from bar
    const barKey: PointIndex = player === "white" ? "bar-white" : "bar-black";

    for (const die of uniqueDice) {
      // White enters onto Black's home board (indices 18–23)
      // Die 1 → point 18, die 6 → point 23 (since 24 - die = target index: 24-1=23, 24-6=18)
      // Black enters onto White's home board (indices 0–5)
      // Die 1 → point 0, die 6 → point 5

      let targetIdx: number;
      if (player === "white") {
        targetIdx = 24 - die; // die=1 → idx 23, die=6 → idx 18
      } else {
        targetIdx = die - 1; // die=1 → idx 0, die=6 → idx 5
      }

      if (targetIdx < 0 || targetIdx > 23) continue;
      const target = targetIdx as BoardPointIndex;
      if (!isBlocked(state.board, target, player)) {
        addMove({ from: barKey, to: target, dieUsed: die });
      }
    }
    return moves;
  }

  const canBO = canBearOff(state, player);

  for (let i = 0; i < 24; i++) {
    const fromIdx = i as BoardPointIndex;
    const pt = state.board[fromIdx];
    if (!pt.checkers.some((c) => c === player)) continue;

    for (const die of uniqueDice) {
      if (canBO) {
        // Bearing off
        const offKey: PointIndex = player === "white" ? "off-white" : "off-black";

        if (player === "white") {
          // White moves toward 0; bears off from indices 0–5
          if (i > 5) continue; // not in home board
          const destIdx = i - die;
          if (destIdx < 0) {
            // Exact die bears off directly; oversized die only legal from farthest checker
            const highestOccupied = highestOccupiedHome(state.board, player);
            if (die === i + 1 || i === highestOccupied) {
              addMove({ from: fromIdx, to: offKey, dieUsed: die });
            }
          } else if (destIdx >= 0) {
            const dest = destIdx as BoardPointIndex;
            if (!isBlocked(state.board, dest, player)) {
              addMove({ from: fromIdx, to: dest, dieUsed: die });
            }
          }
        } else {
          // Black moves toward 23; bears off from indices 18–23
          if (i < 18) continue;
          const destIdx = i + die;
          if (destIdx > 23) {
            // Exact die bears off directly; oversized die only legal from farthest checker
            const highestOccupied = highestOccupiedHome(state.board, player);
            if (die === 24 - i || i === highestOccupied) {
              addMove({ from: fromIdx, to: offKey, dieUsed: die });
            }
          } else if (destIdx <= 23) {
            const dest = destIdx as BoardPointIndex;
            if (!isBlocked(state.board, dest, player)) {
              addMove({ from: fromIdx, to: dest, dieUsed: die });
            }
          }
        }
      } else {
        // Normal move
        let destIdx: number;
        if (player === "white") {
          destIdx = i - die; // White moves toward 0
        } else {
          destIdx = i + die; // Black moves toward 23
        }

        if (destIdx < 0 || destIdx > 23) continue;
        const dest = destIdx as BoardPointIndex;
        if (!isBlocked(state.board, dest, player)) {
          addMove({ from: fromIdx, to: dest, dieUsed: die });
        }
      }
    }
  }

  return moves;
}

/**
 * Returns the index of the highest-pip checker in the home board.
 * "Highest pip" for White = highest board index (5), for Black = lowest board index (18).
 * Used for bearing off with a die that overshoots.
 */
function highestOccupiedHome(board: Record<PointIndex, Point>, player: Player): number {
  if (player === "white") {
    for (let i = 5; i >= 0; i--) {
      if (board[i as BoardPointIndex].checkers.some((c) => c === "white")) return i;
    }
  } else {
    for (let i = 18; i <= 23; i++) {
      if (board[i as BoardPointIndex].checkers.some((c) => c === "black")) return i;
    }
  }
  return -1;
}

// ─── Apply move ───────────────────────────────────────────────────────────────

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const player = next.turn;
  const opp = opponent(player);

  // Remove checker from source
  const fromPt = next.board[move.from];
  const checkerIdx = fromPt.checkers.lastIndexOf(player);
  if (checkerIdx === -1) {
    throw new Error(`No ${player} checker at ${move.from}`);
  }
  fromPt.checkers.splice(checkerIdx, 1);

  // Handle landing
  if (move.to === "off-white" || move.to === "off-black") {
    next.board[move.to].checkers.push(player);
  } else if (isBoardIndex(move.to)) {
    const toPt = next.board[move.to];
    // Hit?
    if (toPt.checkers.length === 1 && toPt.checkers[0] === opp) {
      toPt.checkers = [];
      const barKey: PointIndex = opp === "white" ? "bar-white" : "bar-black";
      next.board[barKey].checkers.push(opp);
    }
    toPt.checkers.push(player);
  }

  // Consume die
  if (next.dice) {
    const idx = next.dice.remaining.indexOf(move.dieUsed);
    if (idx !== -1) next.dice.remaining.splice(idx, 1);
  }

  // Record history
  next.history = [...state.history, move];

  // Check winner
  const winner = checkWinner(next);
  if (winner) {
    next.winner = winner;
    next.dice = null;
  }

  return next;
}

/**
 * Advance to next turn: switch player and clear dice.
 */
export function endTurn(state: GameState): GameState {
  const next = cloneState(state);
  next.turn = opponent(state.turn);
  next.dice = null;
  return next;
}

/**
 * Apply a roll to the state and return the new state with dice set.
 */
export function applyRoll(state: GameState, roll: [number, number]): GameState {
  const next = cloneState(state);
  next.dice = {
    values: roll,
    remaining: expandDiceToRemaining(roll),
  };
  return next;
}

// ─── Mental sanity checks (not runtime tests, just documentation) ─────────────
//
// initializeGame():
//   White checkers: 2@23, 5@12, 3@7, 5@5 = 15 total ✓
//   Black checkers: 2@0, 5@11, 3@16, 5@18 = 15 total ✓
//
// expandDiceToRemaining([3,4]) → [3,4]
// expandDiceToRemaining([5,5]) → [5,5,5,5]
//
// mustEnterFromBar: if bar-white has checkers, white must enter.
//
// isBlocked: board[5] has 5 white checkers → blocked for black ✓
//
// canBearOff: white with all 15 in indices 0–5 → true ✓
//             white with checker on idx 6 → false ✓
//
// applyMove hit: black on idx 3 alone, white moves there → black sent to bar-black ✓
//
// checkWinner: off-white has 15 white checkers → "white" ✓
