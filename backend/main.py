"""
Nardy Blitz — AI Coach backend.

Run from the backend/ directory:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import AnalyzeGameRequest, AnalyzeGameResponse
from coach.analyzer import analyze_game

app = FastAPI(
    title="Nardy Blitz AI Coach",
    description="ML-style heuristic game analyzer for Nardy Blitz backgammon.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/analyze-game", response_model=AnalyzeGameResponse)
def analyze(request: AnalyzeGameRequest) -> AnalyzeGameResponse:
    try:
        return analyze_game(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc
