"""
Text generation for the AI Coach report — perspective-aware.

generate_summary      — concise game summary from the analyzed player's viewpoint
generate_recommendations — up to 4 actionable tips based on metrics
"""

from __future__ import annotations


def generate_summary(
    metrics,
    analyzed_player: str,
    result: str,
    winner: str | None,
    grade: str,
) -> str:
    """Produce a concise, honest summary from the analyzed player's perspective."""
    player_cap = "White" if analyzed_player == "white" else "Black"
    opp_cap    = "Black" if analyzed_player == "white" else "White"

    score_word = {
        "A": "strong",
        "B": "solid",
        "C": "mixed",
        "D": "difficult",
    }[grade]

    if result == "win":
        outcome_line = f"{player_cap} won"
    elif result == "win_by_surrender":
        outcome_line = f"{player_cap} won — opponent surrendered"
    elif result == "loss_by_surrender":
        outcome_line = f"{opp_cap} won after {player_cap} surrendered"
    else:  # "loss" or unknown
        outcome_line = f"{opp_cap} won the match"

    parts: list[str] = [f"{outcome_line} — a {score_word} performance overall."]

    # Acknowledge strong performance despite a loss
    if result in ("loss", "loss_by_surrender") and grade in ("A", "B"):
        parts.append(
            f"Despite the result, {player_cap} showed strong board performance: "
            f"move quality and board control were above average."
        )

    if metrics.hitsMade >= 3:
        parts.append(
            f"{player_cap} landed {metrics.hitsMade} hits, maintaining strong board pressure."
        )
    elif metrics.blotsLeft >= 4:
        parts.append(
            f"{player_cap} left {metrics.blotsLeft} exposed checkers, creating unnecessary risk."
        )

    if metrics.pointsMade >= 4:
        parts.append(f"Building {metrics.pointsMade} protected points gave solid board control.")

    if metrics.diceEfficiency < 60:
        parts.append("Dice were underutilised — several turns failed to develop the position.")

    return " ".join(parts[:2])


def generate_recommendations(
    metrics,
    features: dict,
    is_surrender: bool = False,
) -> list[str]:
    """Return up to 4 specific, actionable recommendations."""
    recs: list[str] = []

    if metrics.blotsLeft >= 3:
        recs.append(
            "Reduce exposed single checkers. Each blot is a tempo opportunity for your opponent."
        )

    if features.get("own_checkers_on_bar", 0) > 0:
        recs.append(
            "Enter from the bar immediately when possible. Checkers on the bar cannot contribute to board control."
        )

    if metrics.diceEfficiency < 65:
        recs.append(
            "Use all available dice values each turn. Unused dice waste development potential and slow your pip count."
        )

    if features.get("own_made_points_count", 0) < 3:
        recs.append(
            "Prioritise making protected points before racing. Two checkers on a point block your opponent and reduce risk."
        )

    if features.get("exposed_checkers_in_opponent_home", 0) > 0:
        recs.append(
            "Avoid leaving lone checkers in the opponent's home board. They are highly vulnerable to counter-attack."
        )

    if features.get("anchors_in_opponent_home", 0) == 0 and features.get("own_made_points_count", 0) < 4:
        recs.append(
            "Consider building anchors in the opponent's home board to slow their bearing-off phase."
        )

    if metrics.hitsMade == 0 and features.get("opponent_blots_count", 0) > 0:
        recs.append(
            "There were opponent blots available. Hitting sends checkers to the bar and disrupts their timing."
        )

    if is_surrender:
        recs.append(
            "Work on converting strong attacking positions into endgame recovery instead of ending early."
        )

    return recs[:4]
