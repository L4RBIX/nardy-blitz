export type Player = "white" | "black";

export type BotDifficulty = "easy" | "balanced" | "hard";

export type BoardPointIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
  12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

export type PointIndex = BoardPointIndex | "bar-white" | "bar-black" | "off-white" | "off-black";

export interface Point {
  checkers: Player[];
}

export interface Dice {
  values: [number, number];
  remaining: number[];
}

export interface Move {
  from: PointIndex;
  to: PointIndex;
  dieUsed: number;
}

export interface GameState {
  board: Record<PointIndex, Point>;
  turn: Player;
  dice: Dice | null;
  history: Move[];
  winner: Player | null;
  startedAt: number;
}

export type CoachInsightType =
  | "blot_left"
  | "missed_block"
  | "good_anchor"
  | "wasted_die"
  | "strong_move";

export interface CoachInsight {
  type: CoachInsightType;
  description: string;
  moveIndex: number;
}

export type GameMode = "vs-bot" | "2player";

export interface RecentGame {
  id: string;
  date: number;
  mode: GameMode;
  result: "win" | "loss" | "loss_by_surrender" | "win_by_surrender";
  winner: Player;
  humanPlayer?: Player;
  botDifficulty?: BotDifficulty;
  durationSeconds: number;
  coachScore?: number;
  grade?: "A" | "B" | "C" | "D";
  diceEfficiency?: number;
  hitsMade?: number;
  pointsMade?: number;
  blotsLeft?: number;
  analysisMode?: "backend-ml-style-evaluator" | "local-fallback";
}

export interface GameStats {
  // Core fields — always present
  gamesPlayed: number;
  winsVsBot: number;
  lossesVsBot: number;
  totalDurationMs: number;
  currentStreak: number;
  longestStreak: number;
  games: Array<{
    winner: Player;
    mode: GameMode;
    durationMs: number;
    date: number;
  }>;
  // Extended analytics — optional for backward-compat with old saves
  totalCoachScore?: number;
  totalCoachScoreGames?: number;
  bestCoachScore?: number;
  totalDiceEfficiency?: number;
  totalDiceEfficiencyGames?: number;
  totalHitsMade?: number;
  totalPointsMade?: number;
  totalBlotsLeft?: number;
  totalBarEntries?: number;
  difficultyStats?: { easy: number; balanced: number; hard: number };
  recentGames?: RecentGame[];
}
