"""
Move-quality evaluator.

evaluate_position   — score a single board state for a player
evaluate_move_quality — compare before/after boards, return quality label + delta

Quality thresholds:
  delta >= +15 → excellent
  delta >= +6  → good
  delta >  -5  → neutral
  delta > -15  → risky
  delta <= -15 → mistake
"""

from .features import extract_position_features, feature_vector_to_score


def evaluate_position(board: dict, player: str) -> float:
    """Positional score for `player` on `board`. Higher = better."""
    return feature_vector_to_score(extract_position_features(board, player))


def evaluate_move_quality(
    before_board: dict,
    after_board: dict,
    player: str,
) -> dict:
    """
    Compare board states before and after a move for `player`.

    Returns:
        beforeScore  — positional score before the move
        afterScore   — positional score after the move
        delta        — afterScore - beforeScore
        quality      — human-readable label
    """
    before = evaluate_position(before_board, player)
    after  = evaluate_position(after_board,  player)
    delta  = after - before

    if   delta >= 15:  quality = "excellent"
    elif delta >=  6:  quality = "good"
    elif delta >  -5:  quality = "neutral"
    elif delta > -15:  quality = "risky"
    else:              quality = "mistake"

    return {
        "beforeScore": round(before, 2),
        "afterScore":  round(after,  2),
        "delta":       round(delta,  2),
        "quality":     quality,
    }
