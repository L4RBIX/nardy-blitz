"""
Sample payload for manual testing.

Usage from backend/:
    python -c "
    from coach.sample_payload import SAMPLE_PAYLOAD
    import httpx, json
    r = httpx.post('http://localhost:8000/api/analyze-game', json=SAMPLE_PAYLOAD)
    print(json.dumps(r.json(), indent=2))
    "
"""

# A mid-game state: white is slightly ahead, a few hits made, some blots left.
SAMPLE_PAYLOAD = {
    "winner": "white",
    "mode": "vs-bot",
    "durationSeconds": 62.4,
    "history": [
        # Turn 1 — white (dice 4,2)
        {"from": 23, "to": 19, "dieUsed": 4},
        {"from": 12, "to": 14, "dieUsed": 2},
        # Turn 2 — black (dice 5,3)
        {"from": 0,  "to": 5,  "dieUsed": 5},
        {"from": 0,  "to": 3,  "dieUsed": 3},
        # Turn 3 — white (dice 6,5)
        {"from": 19, "to": 13, "dieUsed": 6},
        {"from": 14, "to": 9,  "dieUsed": 5},
        # Turn 4 — black (dice 4,1) — hits white blot on 19
        {"from": 18, "to": 22, "dieUsed": 4},
        {"from": 16, "to": 17, "dieUsed": 1},
        # Turn 5 — white enters from bar (dice 5,3)
        {"from": "bar-white", "to": 20, "dieUsed": 5},
        {"from": 7,  "to": 10, "dieUsed": 3},
        # Turn 6 — black (dice 3,2)
        {"from": 17, "to": 20, "dieUsed": 3},
        {"from": 5,  "to": 7,  "dieUsed": 2},
        # Turn 7 — white hits on 20 (dice 4,3)
        {"from": 20, "to": 16, "dieUsed": 4},  # hits black
        {"from": 9,  "to": 6,  "dieUsed": 3},
        # Turn 8 — black re-enters (dice 2,1)
        {"from": "bar-black", "to": 1, "dieUsed": 2},
        {"from": 11, "to": 12, "dieUsed": 1},
        # Turn 9 — white bears off (dice 5,5 doubles)
        {"from": 5,  "to": "off-white", "dieUsed": 5},
        {"from": 5,  "to": "off-white", "dieUsed": 5},
        {"from": 4,  "to": "off-white", "dieUsed": 5},
        {"from": 3,  "to": "off-white", "dieUsed": 5},
    ],
    "finalState": {
        "board": {
            "0":  {"checkers": []},
            "1":  {"checkers": ["black"]},
            "2":  {"checkers": []},
            "3":  {"checkers": []},
            "4":  {"checkers": []},
            "5":  {"checkers": ["white"]},
            "6":  {"checkers": ["white", "white"]},
            "7":  {"checkers": ["white", "white"]},
            "8":  {"checkers": []},
            "9":  {"checkers": []},
            "10": {"checkers": ["white"]},
            "11": {"checkers": ["black", "black", "black", "black"]},
            "12": {"checkers": ["black", "white", "white", "white"]},
            "13": {"checkers": ["white"]},
            "14": {"checkers": []},
            "15": {"checkers": []},
            "16": {"checkers": ["white", "white"]},
            "17": {"checkers": []},
            "18": {"checkers": ["black", "black", "black", "black"]},
            "19": {"checkers": []},
            "20": {"checkers": []},
            "21": {"checkers": []},
            "22": {"checkers": ["black", "black"]},
            "23": {"checkers": []},
            "bar-white": {"checkers": []},
            "bar-black": {"checkers": []},
            "off-white": {"checkers": ["white", "white", "white", "white"]},
            "off-black": {"checkers": []},
        },
        "turn": "black",
        "dice": None,
        "history": [],
        "winner": "white",
        "startedAt": 1717000000000,
    },
}
