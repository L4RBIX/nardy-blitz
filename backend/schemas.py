"""
Pydantic schemas for the Nardy Blitz AI Coach API.

Board conventions (matching the frontend engine):
  - Points 0–23 (0-indexed). White moves 23→0. Black moves 0→23.
  - White home board: 0–5. Black home board: 18–23.
  - Special keys: "bar-white", "bar-black", "off-white", "off-black".
"""

from __future__ import annotations
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


# ── Move ─────────────────────────────────────────────────────────────────────

class MoveData(BaseModel):
    """Single checker move. Uses Field alias because 'from' is a Python keyword."""
    from_: Any = Field(..., alias="from")
    to: Any
    dieUsed: int

    model_config = {"populate_by_name": True}


# ── Board / Dice ──────────────────────────────────────────────────────────────

class PointData(BaseModel):
    checkers: List[str]


class DiceData(BaseModel):
    values: List[int]
    remaining: List[int]


# ── Game state as received from the frontend ──────────────────────────────────

class GameStateData(BaseModel):
    board: dict[str, Any]        # keys: "0"–"23", "bar-white", etc.
    turn: str
    dice: Optional[DiceData] = None
    history: List[MoveData]
    winner: Optional[str] = None
    startedAt: int


# ── Request ───────────────────────────────────────────────────────────────────

class AnalyzeGameRequest(BaseModel):
    winner: Optional[str] = None
    mode: str
    durationSeconds: float
    history: List[MoveData]
    finalState: GameStateData
    humanPlayer: Optional[str] = None   # "white" | "black"  (defaults to "white")
    botDifficulty: Optional[str] = None # "easy" | "balanced" | "hard"
    isSurrender: bool = False


# ── Response pieces ───────────────────────────────────────────────────────────

class CoachInsightItem(BaseModel):
    id: str
    type: str
    severity: Literal["positive", "warning", "info"]
    title: str
    description: str
    moveIndex: Optional[int] = None
    scoreImpact: Optional[float] = None


class CoachMetrics(BaseModel):
    blotsLeft: int
    hitsMade: int
    pointsMade: int
    barEntries: int
    diceEfficiency: float
    averageMoveQuality: float
    riskScore: float
    controlScore: float


class AnalyzeGameResponse(BaseModel):
    coachScore: float
    summary: str
    grade: Literal["A", "B", "C", "D"]
    keyMistakes: List[CoachInsightItem]
    bestMoves: List[CoachInsightItem]
    recommendations: List[str]
    metrics: CoachMetrics
    analysisMode: str = "backend-ml-style-evaluator"
    # Perspective fields
    analyzedPlayer: str = "white"
    result: str = "unknown"          # "win" | "loss" | "loss_by_surrender" | "win_by_surrender"
    performanceMeaning: str = ""
    # Confidence fields
    analyzedPlayerMoveCount: int = 0
    analysisConfidence: str = "high"  # "none" | "low" | "medium" | "high"
