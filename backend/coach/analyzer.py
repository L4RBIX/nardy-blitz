"""
Game analyzer — orchestrates replay, feature extraction, and insight generation.

analyze_game(request) → AnalyzeGameResponse

Design notes:
  - Replays the full game from the standard initial position to detect hits,
    bar entries, and bearing-off moves with player attribution.
  - Falls back gracefully when history is short or board is incomplete.
  - coachScore reflects performance quality (move quality, board control, dice
    efficiency). It is NOT capped because of surrender or match loss.
    A player can lose or surrender and still earn a high grade.
  - analysisConfidence reflects how much move data was available:
    "none" (0 moves) → D grade, capped score, no achievements reported.
    "low"  (1–2 moves) → grade capped at C, score capped at 60.
    "medium" (3–8) / "high" (9+) → normal scoring.
  - pointsMade in metrics counts NEW protected points created from moves,
    NOT points already present in the initial board position.
"""

from __future__ import annotations

import copy
import uuid
from typing import Optional

from schemas import (
    AnalyzeGameRequest,
    AnalyzeGameResponse,
    CoachInsightItem,
    CoachMetrics,
)
from .features import extract_position_features, feature_vector_to_score, _get_checkers
from .report import generate_summary, generate_recommendations

# ── Standard initial board position ──────────────────────────────────────────
_EMPTY_BOARD: dict = {
    **{str(i): [] for i in range(24)},
    "bar-white": [], "bar-black": [],
    "off-white": [], "off-black": [],
}

_INITIAL_BOARD: dict = {
    **_EMPTY_BOARD,
    "23": ["white", "white"],
    "12": ["white"] * 5,
    "7":  ["white"] * 3,
    "5":  ["white"] * 5,
    "0":  ["black", "black"],
    "11": ["black"] * 5,
    "16": ["black"] * 3,
    "18": ["black"] * 5,
}

# Points already protected in the initial position — do NOT credit these as achievements.
_INITIAL_MADE_POINTS: dict[str, frozenset[int]] = {
    "white": frozenset({5, 7, 12, 23}),
    "black": frozenset({0, 11, 16, 18}),
}


def _count_new_made_points(board: dict, player: str) -> int:
    """Count protected points (≥2 own checkers) that were NOT in the initial position."""
    initial = _INITIAL_MADE_POINTS.get(player, frozenset())
    final_made = {i for i in range(24) if _get_checkers(board, i).count(player) >= 2}
    return len(final_made - initial)


# ── Board replay ──────────────────────────────────────────────────────────────

def _key(val) -> str:
    if isinstance(val, (int, float)):
        return str(int(val))
    return str(val)


def _replay(history: list) -> tuple[dict, list[tuple[int, str, str]], list[str]]:
    """
    Replay all moves from the initial position.
    Returns:
      board        — final board after replay
      events       — list of (move_index, event_type, player)
      move_players — player string for each valid move in history order
    """
    board: dict = copy.deepcopy(_INITIAL_BOARD)
    events: list[tuple[int, str, str]] = []
    move_players: list[str] = []

    for i, move in enumerate(history):
        from_key = _key(move.from_)
        to_key   = _key(move.to)

        if from_key in ("bar-white", "off-white"):
            player = "white"
        elif from_key in ("bar-black", "off-black"):
            player = "black"
        else:
            checkers = board.get(from_key, [])
            if not checkers:
                continue
            player = checkers[-1]

        move_players.append(player)
        opp = "black" if player == "white" else "white"

        src = list(board.get(from_key, []))
        if not src:
            continue
        src.pop()
        board[from_key] = src

        dst = list(board.get(to_key, []))
        if len(dst) == 1 and dst[0] == opp:
            board[to_key] = []
            board[f"bar-{opp}"] = board.get(f"bar-{opp}", []) + [opp]
            events.append((i, "hit", player))

        board[to_key] = board.get(to_key, []) + [player]

        if "bar-" in from_key:
            events.append((i, "bar_entry", player))
        if "off-" in to_key:
            events.append((i, "bear_off", player))

    return board, events, move_players


# ── Insight generators ────────────────────────────────────────────────────────

def _make_insight(
    ins_type: str,
    severity: str,
    title: str,
    description: str,
    move_index: Optional[int] = None,
    score_impact: Optional[float] = None,
) -> CoachInsightItem:
    return CoachInsightItem(
        id=str(uuid.uuid4())[:8],
        type=ins_type,
        severity=severity,  # type: ignore[arg-type]
        title=title,
        description=description,
        moveIndex=move_index,
        scoreImpact=score_impact,
    )


def _generate_mistakes(
    analyzed_f: dict,
    events: list,
    history: list,
    analyzed_player: str,
) -> list[CoachInsightItem]:
    mistakes: list[CoachInsightItem] = []

    if analyzed_f["own_blots_count"] >= 3:
        mistakes.append(_make_insight(
            "excessive_blots", "warning",
            "Too many exposed checkers",
            f"{analyzed_f['own_blots_count']} single checkers remain on the board. "
            "Each blot gives the opponent a direct tempo opportunity.",
            score_impact=-float(analyzed_f["own_blots_count"]) * 3.5,
        ))

    if analyzed_f["own_checkers_on_bar"] > 0:
        mistakes.append(_make_insight(
            "stranded_on_bar", "warning",
            "Checker left on the bar",
            f"{analyzed_f['own_checkers_on_bar']} of your checker(s) are still on the bar. "
            "A checker on the bar is out of play until it re-enters, costing tempo every turn.",
            score_impact=-9.0 * analyzed_f["own_checkers_on_bar"],
        ))

    if analyzed_f["exposed_checkers_in_opponent_home"] > 0:
        mistakes.append(_make_insight(
            "blot_in_opp_home", "warning",
            "Risky blot in opponent's home board",
            "A single checker inside the opponent's home board is highly vulnerable. "
            "It can be hit while the opponent controls the surrounding points.",
            score_impact=-4.0 * analyzed_f["exposed_checkers_in_opponent_home"],
        ))

    if analyzed_f["opponent_home_board_points"] >= 4:
        mistakes.append(_make_insight(
            "opp_strong_home", "warning",
            "Opponent controls their home board",
            f"The opponent has {analyzed_f['opponent_home_board_points']} protected points in their home board. "
            "Entering from the bar becomes very difficult — prioritise avoiding the bar.",
            score_impact=-2.0 * analyzed_f["opponent_home_board_points"],
        ))

    late_bar = [
        e for e in events
        if e[1] == "bar_entry" and e[2] == analyzed_player and e[0] > len(history) * 0.6
    ]
    if len(late_bar) >= 2:
        mistakes.append(_make_insight(
            "late_bar_entries", "warning",
            "Repeated bar entries in late game",
            "You were forced to enter from the bar multiple times in the later stages. "
            "Late-game bar entries burn turns and give the opponent a significant timing advantage.",
            move_index=late_bar[-1][0],
            score_impact=-12.0,
        ))

    return mistakes[:3]


def _generate_best_moves(
    analyzed_f: dict,
    events: list,
    hits: int,
    bear_offs: int,
    analyzed_player: str,
    move_count: int,
) -> list[CoachInsightItem]:
    best: list[CoachInsightItem] = []

    # Structural achievements (anchor, strong home board, clean structure) only
    # credited when the player had enough moves to actually develop position.
    MIN_STRUCTURAL_MOVES = 3

    if hits >= 2:
        best.append(_make_insight(
            "multiple_hits", "positive",
            "Strong attacking play",
            f"You landed {hits} hits during the game, sending opponent checkers to the bar. "
            "Each hit forces the opponent to re-enter, slowing their development.",
            score_impact=float(hits) * 4.0,
        ))
    elif hits == 1:
        hit_event = next((e for e in events if e[1] == "hit" and e[2] == analyzed_player), None)
        best.append(_make_insight(
            "hit_made", "positive",
            "Effective hit",
            "You sent an opponent checker to the bar, disrupting their board development "
            "and gaining a temporary tempo advantage.",
            move_index=hit_event[0] if hit_event else None,
            score_impact=7.0,
        ))

    if analyzed_f["own_home_board_points"] >= 4 and move_count >= MIN_STRUCTURAL_MOVES:
        best.append(_make_insight(
            "strong_home_board", "positive",
            "Strong home board built",
            f"You established {analyzed_f['own_home_board_points']} protected points in the home board. "
            "A strong home board maximises the penalty when the opponent re-enters from the bar.",
            score_impact=float(analyzed_f["own_home_board_points"]) * 3.5,
        ))

    if analyzed_f["anchors_in_opponent_home"] >= 1 and move_count >= MIN_STRUCTURAL_MOVES:
        best.append(_make_insight(
            "anchor_held", "positive",
            "Anchor maintained in opponent's home",
            f"You held {analyzed_f['anchors_in_opponent_home']} anchor(s) in the opponent's home board. "
            "Anchors limit the opponent's ability to close out their board and provide safe re-entry.",
            score_impact=float(analyzed_f["anchors_in_opponent_home"]) * 4.5,
        ))

    if bear_offs >= 3:
        best.append(_make_insight(
            "efficient_bearoff", "positive",
            "Efficient bearing-off",
            f"You bore off {bear_offs} checkers, building a clear race lead. "
            "Clean bearing-off sequences are the most direct path to victory.",
            score_impact=float(bear_offs) * 1.5,
        ))

    if (analyzed_f["own_made_points_count"] >= 5
            and analyzed_f["own_blots_count"] == 0
            and move_count >= MIN_STRUCTURAL_MOVES):
        best.append(_make_insight(
            "clean_structure", "positive",
            "Clean board structure",
            "Five or more protected points with no exposed blots — "
            "a well-constructed position that limits the opponent's options.",
            score_impact=10.0,
        ))

    return best[:3]


# ── Main entry point ──────────────────────────────────────────────────────────

def analyze_game(request: AnalyzeGameRequest) -> AnalyzeGameResponse:
    history = request.history
    board   = request.finalState.board
    winner  = request.winner

    analyzed_player = (request.humanPlayer or "white").lower()
    opp_player      = "black" if analyzed_player == "white" else "white"
    is_surrender    = request.isSurrender
    player_cap      = analyzed_player.capitalize()
    opp_cap         = opp_player.capitalize()

    # Result from analyzed player's perspective
    if winner == analyzed_player:
        result = "win_by_surrender" if is_surrender else "win"
    else:
        result = "loss_by_surrender" if is_surrender else "loss"

    # ── 1. Replay + move attribution ───────────────────────────────────────
    _, events, move_players = _replay(history)

    analyzed_move_count = move_players.count(analyzed_player)

    analyzed_hits     = sum(1 for _, et, p in events if et == "hit"       and p == analyzed_player)
    analyzed_bar_in   = sum(1 for _, et, p in events if et == "bar_entry" and p == analyzed_player)
    analyzed_bear_off = sum(1 for _, et, p in events if et == "bear_off"  and p == analyzed_player)

    # ── 2. Analysis confidence ─────────────────────────────────────────────
    if analyzed_move_count == 0:
        confidence = "none"
    elif analyzed_move_count <= 2:
        confidence = "low"
    elif analyzed_move_count <= 8:
        confidence = "medium"
    else:
        confidence = "high"

    # ── 3. Feature extraction ──────────────────────────────────────────────
    analyzed_f = extract_position_features(board, analyzed_player)
    opp_f      = extract_position_features(board, opp_player)

    # ── 4. Metrics ─────────────────────────────────────────────────────────
    blots_left = analyzed_f["own_blots_count"]

    # pointsMade = only NEW protected points created from moves — not initial position
    points_made = _count_new_made_points(board, analyzed_player)

    # diceEfficiency is 0 when no moves were played
    dice_efficiency = (
        max(0.0, min(100.0, 100.0 - analyzed_bar_in * 8.0))
        if analyzed_move_count > 0 else 0.0
    )

    raw_score   = feature_vector_to_score(analyzed_f)
    avg_quality = (
        round(max(0.0, min(1.0, (raw_score + 80) / 160)), 3)
        if analyzed_move_count > 0 else 0.0
    )

    risk = (
        blots_left * 12
        + analyzed_f["own_checkers_on_bar"] * 18
        + analyzed_f["exposed_checkers_in_opponent_home"] * 14
    )
    risk_score = round(min(100.0, float(risk)), 1)

    control = (
        points_made * 7
        + analyzed_f["own_home_board_points"] * 5
        + analyzed_f["anchors_in_opponent_home"] * 6
        + opp_f["own_checkers_on_bar"] * 5
    )
    control_score = round(min(100.0, float(control)), 1)

    metrics = CoachMetrics(
        blotsLeft          = blots_left,
        hitsMade           = analyzed_hits,
        pointsMade         = points_made,
        barEntries         = analyzed_bar_in,
        diceEfficiency     = round(dice_efficiency, 1),
        averageMoveQuality = avg_quality,
        riskScore          = risk_score,
        controlScore       = control_score,
    )

    # ── 5. Zero-move path ─────────────────────────────────────────────────
    if confidence == "none":
        coach_score = round(35.0 + (5.0 if winner == analyzed_player else 0.0), 1)
        grade = "D"

        key_mistakes = [_make_insight(
            "no_moves_played", "warning",
            "No moves played",
            f"The game ended before {player_cap} made a move. "
            "The coach cannot evaluate meaningful tactical decisions.",
            score_impact=-30.0,
        )]
        best_moves = []

        if result in ("loss_by_surrender", "loss"):
            summary = (
                f"{opp_cap} won after {player_cap} surrendered. "
                f"{player_cap} made no moves, so the coach cannot evaluate tactical performance. "
                "Play a longer game to unlock meaningful analysis."
            )
        else:
            summary = (
                f"{player_cap} won without the opponent recording moves. "
                "No tactical data is available to evaluate."
            )

        recommendations = [
            "Play at least several turns to receive a useful performance analysis.",
            "A coach report requires move data — the more turns played, the more accurate the evaluation.",
        ]

    # ── 6. Coach score — performance-based, NOT outcome-capped ─────────────
    else:
        score = 70.0
        score -= blots_left                                      * 5.0
        score -= analyzed_f["own_checkers_on_bar"]               * 8.0
        score -= analyzed_f["exposed_checkers_in_opponent_home"] * 6.0
        score -= max(0, 50 - dice_efficiency)                    * 0.25
        score += analyzed_hits                                   * 4.0
        score += points_made                                     * 2.5
        score += analyzed_f["own_borne_off"]                     * 1.0
        score += analyzed_f["anchors_in_opponent_home"]          * 3.0
        score += analyzed_f["own_home_board_points"]             * 1.5

        if winner == analyzed_player:
            score += 5.0

        coach_score = round(max(0.0, min(100.0, score)), 1)

        # Cap score and grade for low-confidence games
        if confidence == "low":
            coach_score = round(min(60.0, coach_score), 1)

        if   coach_score >= 90: grade = "A"
        elif coach_score >= 75: grade = "B"
        elif coach_score >= 55: grade = "C"
        else:                   grade = "D"

        if confidence == "low" and grade in ("A", "B"):
            grade = "C"

        key_mistakes = _generate_mistakes(analyzed_f, events, history, analyzed_player)
        best_moves   = _generate_best_moves(
            analyzed_f, events, analyzed_hits, analyzed_bear_off,
            analyzed_player, analyzed_move_count,
        )

        if confidence == "low":
            base = generate_summary(metrics, analyzed_player, result, winner, grade)
            summary = (
                f"{player_cap} made only {analyzed_move_count} move(s), "
                "so this analysis is limited. "
                f"The score reflects a small sample, not a full-game performance. {base}"
            )
        else:
            summary = generate_summary(metrics, analyzed_player, result, winner, grade)

        recommendations = generate_recommendations(
            metrics, analyzed_f,
            is_surrender=(is_surrender and result.startswith("loss")),
        )

        if confidence == "low":
            recommendations = [
                f"Only {analyzed_move_count} move(s) were recorded — "
                "play a full game for a complete and reliable analysis.",
            ] + recommendations

    performance_meaning = (
        "Coach Score evaluates move quality and board control, not only the final match result. "
        "A player can lose or surrender and still earn a strong grade."
    )

    return AnalyzeGameResponse(
        coachScore              = coach_score,
        summary                 = summary,
        grade                   = grade,
        keyMistakes             = key_mistakes,
        bestMoves               = best_moves,
        recommendations         = recommendations[:4],
        metrics                 = metrics,
        analyzedPlayer          = analyzed_player,
        result                  = result,
        performanceMeaning      = performance_meaning,
        analyzedPlayerMoveCount = analyzed_move_count,
        analysisConfidence      = confidence,
    )
