"""
ML-style feature extraction from backgammon board positions.

Board conventions:
  White moves 23→0. White home: 0–5.
  Black moves 0→23. Black home: 18–23.
  Bar key: "bar-white" / "bar-black"
  Off key: "off-white" / "off-black"
  Numeric points stored as string keys "0"–"23" in the JSON board dict.

The feature vector is designed so:
  - Each feature is a meaningful scalar (count, ratio, pip-count)
  - Weights are explicit and readable — easy to swap for learned weights later
  - Higher feature_vector_to_score → better position for `player`
"""

WHITE_HOME = frozenset(range(0, 6))    # indices 0–5
BLACK_HOME = frozenset(range(18, 24))  # indices 18–23


def _get_checkers(board: dict, key) -> list:
    """Return checker list at `key`, handling int or string keys."""
    str_key = str(int(key)) if isinstance(key, (int, float)) else str(key)
    pt = board.get(str_key, {})
    if isinstance(pt, dict):
        return pt.get("checkers", [])
    return []


def extract_position_features(board: dict, player: str) -> dict:
    """
    Extract 18 numeric features from `board` for `player`.

    Returns a plain dict that can be treated as a feature vector.
    All counts refer to `player`'s perspective unless prefixed with "opponent_".
    """
    opp = "black" if player == "white" else "white"
    own_home = WHITE_HOME if player == "white" else BLACK_HOME
    opp_home = BLACK_HOME if player == "white" else WHITE_HOME

    # ── Special-point counts ────────────────────────────────────────────────
    own_bar       = len(_get_checkers(board, f"bar-{player}"))
    opp_bar       = len(_get_checkers(board, f"bar-{opp}"))
    own_off       = len(_get_checkers(board, f"off-{player}"))
    opp_off       = len(_get_checkers(board, f"off-{opp}"))

    # ── Sweep board points ───────────────────────────────────────────────────
    own_blots              = 0
    opp_blots              = 0
    own_made               = 0
    opp_made               = 0
    own_home_pts           = 0
    opp_home_pts           = 0
    anchors                = 0   # own protected points inside opp home board
    exposed_in_opp_home    = 0   # own blots inside opp home board
    own_prime              = 0   # longest consecutive own-made-point run
    cur_prime              = 0

    for i in range(24):
        own_n = _get_checkers(board, i).count(player)
        opp_n = _get_checkers(board, i).count(opp)

        if own_n == 1:
            own_blots += 1
        if opp_n == 1:
            opp_blots += 1
        if own_n >= 2:
            own_made += 1
            cur_prime += 1
            own_prime = max(own_prime, cur_prime)
        else:
            cur_prime = 0
        if opp_n >= 2:
            opp_made += 1
        if own_n >= 2 and i in own_home:
            own_home_pts += 1
        if opp_n >= 2 and i in opp_home:
            opp_home_pts += 1
        if own_n >= 2 and i in opp_home:
            anchors += 1
        if own_n == 1 and i in opp_home:
            exposed_in_opp_home += 1

    # ── Pip count (lower = closer to winning race) ────────────────────────
    own_pip = own_bar * 25
    opp_pip = opp_bar * 25
    for i in range(24):
        checkers = _get_checkers(board, i)
        own_n = checkers.count(player)
        opp_n = checkers.count(opp)
        if own_n:
            own_pip += own_n * (i + 1) if player == "white" else own_n * (24 - i)
        if opp_n:
            opp_pip += opp_n * (i + 1) if opp == "white" else opp_n * (24 - i)

    pip_advantage = opp_pip - own_pip   # positive = player is ahead in race

    # ── Mobility estimate ────────────────────────────────────────────────────
    # Rough measure of how freely the player can develop
    mobility = max(0, own_made + own_blots - own_bar * 2)

    return {
        "own_checkers_on_bar":              own_bar,
        "opponent_checkers_on_bar":         opp_bar,
        "own_borne_off":                    own_off,
        "opponent_borne_off":               opp_off,
        "own_blots_count":                  own_blots,
        "opponent_blots_count":             opp_blots,
        "own_made_points_count":            own_made,
        "opponent_made_points_count":       opp_made,
        "own_home_board_points":            own_home_pts,
        "opponent_home_board_points":       opp_home_pts,
        "anchors_in_opponent_home":         anchors,
        "pip_count_estimate":               own_pip,
        "pip_advantage":                    pip_advantage,
        "mobility_estimate":                mobility,
        "hit_opportunities":                opp_blots,
        "blocked_points_count":             opp_made,
        "exposed_checkers_in_opponent_home": exposed_in_opp_home,
        "own_prime_length":                 own_prime,
    }


def feature_vector_to_score(features: dict) -> float:
    """
    Linear weighted sum of features → positional score.

    Positive values = good for the player whose features were extracted.
    Weights are analogous to a learned linear model's coefficient vector.
    """
    s = 0.0

    # Strongly positive signals
    s += features["own_borne_off"]                      * 8.0
    s += features["opponent_checkers_on_bar"]           * 7.0
    s += features["own_made_points_count"]              * 5.0
    s += features["own_home_board_points"]              * 3.5
    s += features["anchors_in_opponent_home"]           * 4.5
    s += features["pip_advantage"]                      * 0.1
    s += features["own_prime_length"]                   * 2.0
    s += features["mobility_estimate"]                  * 1.5

    # Negative signals
    s -= features["own_checkers_on_bar"]                * 9.0
    s -= features["own_blots_count"]                    * 3.5
    s -= features["opponent_borne_off"]                 * 8.0
    s -= features["opponent_made_points_count"]         * 3.0
    s -= features["exposed_checkers_in_opponent_home"]  * 4.0
    s -= features["opponent_home_board_points"]         * 2.0

    return s
