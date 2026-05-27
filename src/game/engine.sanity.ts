/**
 * Nardy Blitz — Engine Sanity Tests
 *
 * Run with:  npm run sanity
 *
 * No test framework required — plain assertions via a tiny harness below.
 * Covers 13 rule scenarios plus a 100-game simulation with invariant checks.
 */

import type { GameState, Player } from "../types";
import type { BoardPointIndex } from "../types";
import {
  initializeGame,
  rollDice,
  expandDiceToRemaining,
  getLegalMoves,
  applyMove,
  applyRoll,
  endTurn,
  canBearOff,
  checkWinner,
} from "./engine";
import { chooseBotMoves } from "./bot";

// ─── Tiny test harness ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓  ${name}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${name}`);
    failed++;
  }
}

function section(label: string) {
  console.log(`\n── ${label} ──`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countCheckers(state: GameState, player: Player): number {
  let total = 0;
  for (let i = 0; i < 24; i++) {
    total += state.board[i as BoardPointIndex].checkers.filter((c) => c === player).length;
  }
  total += state.board[`bar-${player}`].checkers.filter((c) => c === player).length;
  total += state.board[`off-${player}`].checkers.filter((c) => c === player).length;
  return total;
}

function hasColorConflict(state: GameState): boolean {
  for (let i = 0; i < 24; i++) {
    const pt = state.board[i as BoardPointIndex];
    const whites = pt.checkers.filter((c) => c === "white").length;
    const blacks = pt.checkers.filter((c) => c === "black").length;
    if (whites > 0 && blacks > 0) return true;
  }
  return false;
}

/** Build a minimal state with checkers placed as specified. */
function buildState(
  setup: Array<{ idx: BoardPointIndex | "bar-white" | "bar-black"; player: Player; count: number }>,
  turn: Player,
  dice: [number, number],
): GameState {
  const state = initializeGame();
  // Clear all positions
  for (let i = 0; i < 24; i++) state.board[i as BoardPointIndex].checkers = [];
  state.board["bar-white"].checkers = [];
  state.board["bar-black"].checkers = [];
  state.board["off-white"].checkers = [];
  state.board["off-black"].checkers = [];

  for (const { idx, player, count } of setup) {
    for (let k = 0; k < count; k++) {
      (state.board[idx] as { checkers: Player[] }).checkers.push(player);
    }
  }

  state.turn = turn;
  state.dice = { values: dice, remaining: expandDiceToRemaining(dice) };
  return state;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section("T01 — Initial setup");
{
  const s = initializeGame();
  assert(countCheckers(s, "white") === 15, "White starts with 15 checkers");
  assert(countCheckers(s, "black") === 15, "Black starts with 15 checkers");
  assert(s.board[23].checkers.filter((c) => c === "white").length === 2, "White: 2 on point 23");
  assert(s.board[12].checkers.filter((c) => c === "white").length === 5, "White: 5 on point 12");
  assert(s.board[7].checkers.filter((c) => c === "white").length === 3, "White: 3 on point 7");
  assert(s.board[5].checkers.filter((c) => c === "white").length === 5, "White: 5 on point 5");
  assert(s.board[0].checkers.filter((c) => c === "black").length === 2, "Black: 2 on point 0");
  assert(s.board[11].checkers.filter((c) => c === "black").length === 5, "Black: 5 on point 11");
  assert(s.board[16].checkers.filter((c) => c === "black").length === 3, "Black: 3 on point 16");
  assert(s.board[18].checkers.filter((c) => c === "black").length === 5, "Black: 5 on point 18");
  assert(!hasColorConflict(s), "No point contains both colors");
}

section("T02 — Dice expansion");
{
  assert(JSON.stringify(expandDiceToRemaining([3, 5])) === JSON.stringify([3, 5]), "[3,5] → [3,5]");
  assert(JSON.stringify(expandDiceToRemaining([4, 4])) === JSON.stringify([4, 4, 4, 4]), "[4,4] → [4,4,4,4]");
  assert(JSON.stringify(expandDiceToRemaining([1, 6])) === JSON.stringify([1, 6]), "[1,6] → [1,6]");
  assert(JSON.stringify(expandDiceToRemaining([6, 6])) === JSON.stringify([6, 6, 6, 6]), "[6,6] → [6,6,6,6]");
}

section("T03 — Blocked point (2+ opponent checkers)");
{
  // Black has 2 on point 3; white tries to move there from point 7 with die 4
  const s = buildState(
    [
      { idx: 7, player: "white", count: 1 },
      { idx: 3, player: "black", count: 2 },
    ],
    "white",
    [4, 2],
  );
  const moves = getLegalMoves(s);
  const blocked = moves.some((m) => m.from === 7 && m.to === 3);
  assert(!blocked, "Cannot move to point with 2+ opponent checkers");
}

section("T04 — Hit (land on single opponent — blot sent to bar)");
{
  // Black has 1 checker on point 3 (blot); white on 7 with die 4
  const s = buildState(
    [
      { idx: 7, player: "white", count: 1 },
      { idx: 3, player: "black", count: 1 },
    ],
    "white",
    [4, 2],
  );
  const moves = getLegalMoves(s);
  const hitMove = moves.find((m) => m.from === 7 && m.to === 3);
  assert(hitMove !== undefined, "Can move to point occupied by single opponent (hit)");
  if (hitMove) {
    const after = applyMove(s, hitMove);
    assert(after.board[3].checkers.length === 1 && after.board[3].checkers[0] === "white", "White occupies point 3 after hit");
    assert(after.board["bar-black"].checkers.length === 1, "Hit black checker sent to bar");
    assert(countCheckers(after, "black") === 1, "Black still has 1 checker total");
  }
}

section("T05 — Bar priority (must enter before other moves)");
{
  // White has 1 on bar; also has checkers elsewhere
  const s = buildState(
    [
      { idx: "bar-white", player: "white", count: 1 },
      { idx: 7, player: "white", count: 2 },
    ],
    "white",
    [3, 2],
  );
  const moves = getLegalMoves(s);
  assert(moves.every((m) => m.from === "bar-white"), "All moves originate from bar when checker is on bar");
}

section("T06 — Bar entry blocked (cannot enter onto 2+ opponent point)");
{
  // White on bar; black has 2 on point 21 (die 3 → 24-3=21) and 2 on point 22 (die 2 → 24-2=22)
  const s = buildState(
    [
      { idx: "bar-white", player: "white", count: 1 },
      { idx: 21, player: "black", count: 2 },
      { idx: 22, player: "black", count: 2 },
    ],
    "white",
    [3, 2],
  );
  const moves = getLegalMoves(s);
  assert(moves.length === 0, "No legal moves when all bar-entry points are blocked");
}

section("T07 — Doubles give 4 moves");
{
  // White with plenty of room; roll double 2s
  const s = buildState(
    [
      { idx: 23, player: "white", count: 4 },
      { idx: 20, player: "white", count: 4 },
    ],
    "white",
    [2, 2],
  );
  assert(s.dice!.remaining.length === 4, "Double 2s start with 4 remaining dice");

  let current = s;
  let moves = getLegalMoves(current);
  let moveCount = 0;
  while (moves.length > 0 && current.dice!.remaining.length > 0) {
    current = applyMove(current, moves[0]);
    moveCount++;
    if (current.dice!.remaining.length === 0) break;
    moves = getLegalMoves(current);
  }
  assert(moveCount === 4, `Can make exactly 4 moves on doubles (made ${moveCount})`);
}

section("T08 — Cannot bear off with checker outside home");
{
  // White has 1 checker on point 6 (outside home 0–5) and rest in home
  const s = buildState(
    [
      { idx: 6, player: "white", count: 1 },
      { idx: 0, player: "white", count: 2 },
      { idx: 1, player: "white", count: 2 },
      { idx: 2, player: "white", count: 2 },
    ],
    "white",
    [3, 2],
  );
  assert(!canBearOff(s, "white"), "Cannot bear off while checker is outside home board");
}

section("T09 — Can bear off when all checkers in home");
{
  // White has 5 in home (0–5 only)
  const s = buildState(
    [
      { idx: 0, player: "white", count: 2 },
      { idx: 1, player: "white", count: 2 },
      { idx: 2, player: "white", count: 1 },
    ],
    "white",
    [1, 2],
  );
  assert(canBearOff(s, "white"), "Can bear off when all checkers are in home board");
  const moves = getLegalMoves(s);
  assert(moves.some((m) => m.to === "off-white"), "getLegalMoves includes bear-off moves");
}

section("T10 — Oversized die: only the farthest checker may bear off");
{
  // White has checkers on points 3 and 1; rolls a 5
  // die 5 from point 3: destIdx = 3-5 = -2 < 0; is point 3 the highest in home? yes → legal
  // die 5 from point 1: destIdx = 1-5 = -4 < 0; is point 1 the highest? no (point 3 is) → ILLEGAL
  const s = buildState(
    [
      { idx: 3, player: "white", count: 1 },
      { idx: 1, player: "white", count: 1 },
    ],
    "white",
    [5, 2],
  );
  const moves = getLegalMoves(s);
  const fromHighest = moves.filter((m) => m.from === 3 && m.to === "off-white" && m.dieUsed === 5);
  const fromLower = moves.filter((m) => m.from === 1 && m.to === "off-white" && m.dieUsed === 5);
  assert(fromHighest.length > 0, "Oversized die: can bear off from farthest checker (point 3)");
  assert(fromLower.length === 0, "Oversized die: cannot bear off from lower checker when higher exists (point 1)");
}

section("T11 — Winner detection (15 checkers off)");
{
  const s = initializeGame();
  for (let i = 0; i < 15; i++) s.board["off-white"].checkers.push("white");
  assert(checkWinner(s) === "white", "checkWinner returns 'white' with 15 white checkers off");

  const s2 = initializeGame();
  for (let i = 0; i < 15; i++) s2.board["off-black"].checkers.push("black");
  assert(checkWinner(s2) === "black", "checkWinner returns 'black' with 15 black checkers off");

  assert(checkWinner(initializeGame()) === null, "checkWinner returns null on starting position");
}

section("T12 — No legal moves doesn't crash");
{
  // White on bar; all black home points (18–23) occupied by black (2 each)
  const s = buildState(
    [
      { idx: "bar-white", player: "white", count: 1 },
      { idx: 18, player: "black", count: 2 },
      { idx: 19, player: "black", count: 2 },
      { idx: 20, player: "black", count: 2 },
      { idx: 21, player: "black", count: 2 },
      { idx: 22, player: "black", count: 2 },
      { idx: 23, player: "black", count: 2 },
    ],
    "white",
    [1, 2],
  );
  let threw = false;
  try {
    const moves = getLegalMoves(s);
    assert(moves.length === 0, "getLegalMoves returns empty array when fully blocked");
  } catch {
    threw = true;
  }
  assert(!threw, "getLegalMoves does not throw when no moves available");
}

section("T13 — Black bear-off oversized die regression");
{
  // Black home is 18–23, bears off past 23. "Farthest" = lowest index = 20.
  // die 5 from point 20: destIdx = 25 > 23; highestOccupiedHome scans 18→23, finds 20 first → legal
  // die 5 from point 22: destIdx = 27 > 23; 22 is NOT the farthest checker (20 is) → ILLEGAL
  const s = buildState(
    [
      { idx: 20, player: "black", count: 1 },
      { idx: 22, player: "black", count: 1 },
    ],
    "black",
    [5, 2],
  );
  const moves = getLegalMoves(s);
  const fromFarthest = moves.filter((m) => m.from === 20 && m.to === "off-black" && m.dieUsed === 5);
  const fromCloser = moves.filter((m) => m.from === 22 && m.to === "off-black" && m.dieUsed === 5);
  assert(fromFarthest.length > 0, "Black oversized die: can bear off from farthest checker (point 20)");
  assert(fromCloser.length === 0, "Black oversized die: cannot bear off from closer checker when farther exists (point 22)");
}

// ─── Simulation ───────────────────────────────────────────────────────────────

section("SIM — 100-game simulation (invariant checks)");
{
  const MAX_TURNS = 600;
  let simFailed = false;
  const failures: string[] = [];

  const checkInvariants = (state: GameState, gameIdx: number, turnIdx: number): boolean => {
    if (countCheckers(state, "white") !== 15) {
      failures.push(`Game ${gameIdx} turn ${turnIdx}: white checker count = ${countCheckers(state, "white")}`);
      return false;
    }
    if (countCheckers(state, "black") !== 15) {
      failures.push(`Game ${gameIdx} turn ${turnIdx}: black checker count = ${countCheckers(state, "black")}`);
      return false;
    }
    if (hasColorConflict(state)) {
      failures.push(`Game ${gameIdx} turn ${turnIdx}: point has both colors`);
      return false;
    }
    if (state.dice) {
      for (const d of state.dice.remaining) {
        if (d < 1 || d > 6) {
          failures.push(`Game ${gameIdx} turn ${turnIdx}: illegal die value ${d}`);
          return false;
        }
      }
    }
    const barW = state.board["bar-white"].checkers.filter((c) => c === "white").length;
    const barB = state.board["bar-black"].checkers.filter((c) => c === "black").length;
    if (barW < 0 || barB < 0) {
      failures.push(`Game ${gameIdx} turn ${turnIdx}: negative bar count`);
      return false;
    }
    return true;
  }

  let gamesCompleted = 0;
  let gamesTerminated = 0;

  for (let g = 0; g < 100; g++) {
    let state = initializeGame();
    let turns = 0;
    let ok = true;

    while (!state.winner && turns < MAX_TURNS) {
      // Roll
      const roll = rollDice();
      state = applyRoll(state, roll);

      if (!checkInvariants(state, g, turns)) { ok = false; break; }

      // Apply bot moves for both sides
      const botMoves = chooseBotMoves(state, "balanced");
      for (const m of botMoves) {
        state = applyMove(state, m);
        if (!checkInvariants(state, g, turns)) { ok = false; break; }
        if (state.winner) break;
      }

      if (!ok) break;
      if (state.winner) break;

      // End turn
      state = endTurn(state);
      if (!checkInvariants(state, g, turns)) { ok = false; break; }

      turns++;
    }

    if (!ok) { simFailed = true; }
    if (state.winner) gamesCompleted++;
    else gamesTerminated++;
  }

  if (simFailed) {
    for (const f of failures.slice(0, 5)) console.error(`    ${f}`);
  }
  assert(!simFailed, `All 100 games pass invariant checks throughout`);
  console.log(`    ${gamesCompleted} games finished with a winner, ${gamesTerminated} hit turn limit`);
  assert(gamesCompleted > 0, "At least some games complete with a winner in ≤${MAX_TURNS} turns");
}

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed.`);
}
