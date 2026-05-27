/**
 * Nardy Blitz — Backend AI Coach API client.
 *
 * Sends completed game data to the FastAPI backend.
 * Throws on network errors or non-OK responses so the caller (gameStore)
 * can set analysisError and fall back to local insights.
 */

import type { GameState, Move } from "../types";

// ── Response types ─────────────────────────────────────────────────────────────

export interface BackendCoachInsight {
  id: string;
  type: string;
  severity: "positive" | "warning" | "info";
  title: string;
  description: string;
  moveIndex: number | null;
  scoreImpact: number | null;
}

export interface BackendCoachMetrics {
  blotsLeft: number;
  hitsMade: number;
  pointsMade: number;
  barEntries: number;
  diceEfficiency: number;     // 0–100
  averageMoveQuality: number; // 0–1
  riskScore: number;          // 0–100
  controlScore: number;       // 0–100
}

export interface BackendCoachReport {
  coachScore: number;           // 0–100
  summary: string;
  grade: "A" | "B" | "C" | "D";
  keyMistakes: BackendCoachInsight[];
  bestMoves: BackendCoachInsight[];
  recommendations: string[];
  metrics: BackendCoachMetrics;
  analysisMode: string;
  /** Perspective fields */
  analyzedPlayer?: string;   // "white" | "black"
  result?: string;           // "win" | "loss" | "loss_by_surrender" | "win_by_surrender"
  performanceMeaning?: string;
  /** Confidence fields */
  analyzedPlayerMoveCount?: number;
  analysisConfidence?: "none" | "low" | "medium" | "high";
  /** Added client-side to track report origin. */
  source: "backend" | "local";
}

// ── Request payload ────────────────────────────────────────────────────────────

export interface AnalyzeGamePayload {
  winner: string | null;
  mode: string;
  durationSeconds: number;
  history: Move[];
  finalState: GameState;
  humanPlayer?: string;    // "white" | "black"
  botDifficulty?: string;  // "easy" | "balanced" | "hard"
  isSurrender?: boolean;
}

// ── API call ───────────────────────────────────────────────────────────────────

const DEFAULT_URL = "http://localhost:8000/api/analyze-game";
const TIMEOUT_MS  = 8_000;

/**
 * POST the completed game to the FastAPI backend.
 * Throws a descriptive Error on any failure — callers should catch and fall back.
 */
export async function analyzeGameWithBackend(
  payload: AnalyzeGamePayload,
): Promise<BackendCoachReport> {
  const url = process.env.NEXT_PUBLIC_COACH_API_URL ?? DEFAULT_URL;

  let response: Response;
  try {
    response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Coach backend unreachable: ${msg}`);
  }

  if (!response.ok) {
    throw new Error(`Coach backend returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as Omit<BackendCoachReport, "source">;
  return { ...data, source: "backend" };
}
