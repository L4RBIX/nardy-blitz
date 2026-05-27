"""Smoke test for the Nardy Blitz AI Coach backend.

Usage:
    python3 backend/smoke_test.py
    python3 backend/smoke_test.py https://example.com/api/analyze-game
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent))

from coach.sample_payload import SAMPLE_PAYLOAD  # noqa: E402


DEFAULT_URL = "http://localhost:8000/api/analyze-game"


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    body = json.dumps(SAMPLE_PAYLOAD).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8')}", file=sys.stderr)
        return 1
    except URLError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    print(f"coachScore: {payload.get('coachScore')}")
    print(f"grade: {payload.get('grade')}")
    print(f"analysisMode: {payload.get('analysisMode')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
