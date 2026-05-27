"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { Board } from "../../components/Board";
import { Dice } from "../../components/Dice";
import { TurnIndicator } from "../../components/TurnIndicator";
import { MoveHistory } from "../../components/MoveHistory";
import { CoachModal } from "../../components/CoachModal";
import { SkinSelector } from "../../components/SkinSelector";
import { UpgradeProButton } from "../../components/UpgradeProButton";
import { getSelectedSkin } from "../../lib/pro";
import type { BotDifficulty, PointIndex } from "../../types";
import type { BoardSkin } from "../../lib/pro";

export default function PlayPage() {
  const {
    gameState, mode, selectedFrom, legalMoves,
    insights, showCoach, isBotThinking, backendReport, isAnalyzing, analysisError,
    humanPlayer, botPlayer, botDifficulty, setBotDifficulty,
    setMode, startGame, roll, selectFrom, makeMove,
    surrender, dismissCoach, loadFromUrl, copyShareUrl,
  } = useGameStore();

  useEffect(() => { loadFromUrl(); }, [loadFromUrl]);

  const { turn, dice, winner, history } = gameState;
  const isPlayerTurn = mode === "2player" || turn === humanPlayer;
  const canRoll = !dice && !winner && isPlayerTurn && !isBotThinking;

  function handlePointClick(idx: PointIndex) {
    if (winner || !dice) return;
    if (mode === "vs-bot" && turn === botPlayer) return;

    const isTarget =
      selectedFrom !== null &&
      legalMoves.some((m) => m.from === selectedFrom && m.to === idx);
    const isSource = legalMoves.some((m) => m.from === idx);

    if (isTarget && selectedFrom !== null) {
      const move = legalMoves.find((m) => m.from === selectedFrom && m.to === idx);
      if (move) makeMove(move);
    } else if (isSource) {
      selectFrom(idx);
    }
  }

  const [skin, setSkin] = useState<BoardSkin>("classic");
  useEffect(() => { setSkin(getSelectedSkin()); }, []);

  const [copied, setCopied] = useState(false);
  function handleShare() {
    copyShareUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  function handleSurrenderConfirm() {
    setShowSurrenderConfirm(false);
    surrender();
  }

  const toolbarBtn =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer border";
  const toolbarBtnStyle = {
    background: "rgba(14,22,39,0.7)",
    borderColor: "var(--border)",
    color: "var(--text-muted)",
  };

  const difficultyLabels: Record<BotDifficulty, string> = {
    easy: "Easy",
    balanced: "Balanced",
    hard: "Hard",
  };

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {/* Ambient blob */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="blob absolute w-[400px] h-[400px] opacity-[0.04]"
          style={{ background: "var(--green)", top: "-80px", right: "10%" }}
        />
      </div>

      {/* Toolbar */}
      <header
        className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href="/"
          className="font-sans text-sm font-semibold transition-colors duration-150 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Nardy Blitz
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nav links */}
          <Link href="/multiplayer" className="font-mono text-[11px] tracking-wider transition-colors duration-150 hidden sm:inline" style={{ color: "#475569" }}>Multiplayer</Link>
          <Link href="/leaderboard" className="font-mono text-[11px] tracking-wider transition-colors duration-150 hidden sm:inline" style={{ color: "#475569" }}>Leaderboard</Link>
          {/* Mode toggle */}
          <div
            className="flex rounded-xl overflow-hidden font-mono text-[11px]"
            style={{ border: "1px solid var(--border)" }}
          >
            {(["vs-bot", "2player"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1.5 transition-colors duration-150 cursor-pointer"
                style={
                  mode === m
                    ? { background: "rgba(217,119,6,0.12)", color: "var(--gold-bright)" }
                    : { color: "var(--text-dim)" }
                }
              >
                {m === "vs-bot" ? "vs Bot" : "2 Player"}
              </button>
            ))}
          </div>

          {/* Difficulty selector — vs-bot only */}
          {mode === "vs-bot" && (
            <div
              className="flex rounded-xl overflow-hidden font-mono text-[11px]"
              style={{ border: "1px solid var(--border)" }}
            >
              {(["easy", "balanced", "hard"] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setBotDifficulty(d)}
                  className="px-2.5 py-1.5 transition-colors duration-150 cursor-pointer"
                  style={
                    botDifficulty === d
                      ? { background: "rgba(217,119,6,0.12)", color: "var(--gold-bright)" }
                      : { color: "var(--text-dim)" }
                  }
                >
                  {difficultyLabels[d]}
                </button>
              ))}
            </div>
          )}

          <button onClick={handleShare} className={toolbarBtn} style={toolbarBtnStyle}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <circle cx="2.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="8.5" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="8.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 4.8l3-1.8M4 6.2l3 1.8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {copied ? "Copied" : "Share"}
          </button>

          <button onClick={startGame} className={toolbarBtn} style={toolbarBtnStyle}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M2 5.5A3.5 3.5 0 015.5 2a3.5 3.5 0 012.6 1.15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 3V1.5M9 3H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Restart
          </button>

          <Link href="/stats" className={toolbarBtn} style={toolbarBtnStyle}>
            Stats
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start gap-4 px-4 py-4 max-w-6xl mx-auto w-full min-w-0">
        {/* Board */}
        <div className="flex-1 w-full min-w-0">
          <Board
            state={gameState}
            selectedFrom={selectedFrom}
            legalMoves={legalMoves}
            onSelectFrom={selectFrom}
            onMoveTo={handlePointClick}
            skin={skin}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-3 min-w-0">
          <TurnIndicator turn={turn} winner={winner} mode={mode} humanPlayer={humanPlayer} />

          {/* You/Bot color chip — vs-bot only */}
          {mode === "vs-bot" && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl font-mono text-[10px]"
              style={{
                background: "rgba(14,22,39,0.6)",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
              }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border"
                  style={{
                    background: humanPlayer === "white"
                      ? "linear-gradient(145deg,#F8F0E0,#CFC0A0)"
                      : "linear-gradient(145deg,#1E1E1E,#050505)",
                    borderColor: humanPlayer === "white" ? "rgba(200,185,155,0.5)" : "rgba(60,60,60,0.7)",
                  }}
                />
                You · {humanPlayer === "white" ? "White" : "Black"}
              </span>
              <span className="flex items-center gap-1.5">
                Bot · {botPlayer === "white" ? "White" : "Black"}
                <span
                  className="w-3 h-3 rounded-full border"
                  style={{
                    background: botPlayer === "white"
                      ? "linear-gradient(145deg,#F8F0E0,#CFC0A0)"
                      : "linear-gradient(145deg,#1E1E1E,#050505)",
                    borderColor: botPlayer === "white" ? "rgba(200,185,155,0.5)" : "rgba(60,60,60,0.7)",
                  }}
                />
              </span>
            </div>
          )}

          {/* Dice card */}
          <div
            className="glass rounded-2xl p-4 flex flex-col items-center gap-3"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <Dice
              values={dice?.values ?? null}
              remaining={dice?.remaining ?? []}
              canRoll={canRoll}
              isThinking={isBotThinking}
              onRoll={roll}
            />
          </div>

          {/* Move history card */}
          <div
            className="glass rounded-2xl p-4"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <h3
              className="font-mono text-[9px] uppercase tracking-widest mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Move History
            </h3>
            <MoveHistory history={history} />
          </div>

          {/* Board skin selector */}
          <SkinSelector selected={skin} onSelect={setSkin} />

          {/* Upgrade Pro */}
          <div className="flex justify-center">
            <UpgradeProButton variant="compact" onPreviewUnlocked={() => setSkin(getSelectedSkin())} />
          </div>

          {/* Surrender — hidden once game is over */}
          {!winner && (
            <button
              onClick={() => setShowSurrenderConfirm(true)}
              className="w-full py-2 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
              style={{
                background: "rgba(220,38,38,0.04)",
                border: "1px solid rgba(220,38,38,0.15)",
                color: "rgba(252,165,165,0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(252,165,165,0.8)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(252,165,165,0.4)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.15)";
              }}
            >
              Surrender
            </button>
          )}
        </aside>
      </div>

      <CoachModal
        isOpen={showCoach}
        winner={winner}
        insights={insights}
        backendReport={backendReport}
        isAnalyzing={isAnalyzing}
        analysisError={analysisError}
        mode={mode}
        humanPlayer={humanPlayer}
        history={history}
        gameState={gameState}
        onClose={dismissCoach}
      />

      {/* Surrender confirmation dialog */}
      <AnimatePresence>
        {showSurrenderConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(5,10,18,0.8)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowSurrenderConfirm(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass w-full max-w-xs rounded-2xl p-6"
                style={{ border: "1px solid rgba(220,38,38,0.2)" }}
              >
                <h2
                  className="font-sans font-semibold text-lg tracking-tight mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Surrender?
                </h2>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "var(--text-muted)", fontWeight: 300 }}
                >
                  {mode === "vs-bot"
                    ? "The bot will be declared the winner. This action cannot be undone."
                    : `${turn === "white" ? "Black" : "White"} will be declared the winner. This action cannot be undone.`
                  }
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSurrenderConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
                    style={{
                      background: "rgba(14,22,39,0.8)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSurrenderConfirm}
                    className="flex-1 py-2.5 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
                    style={{
                      background: "rgba(220,38,38,0.15)",
                      border: "1px solid rgba(220,38,38,0.35)",
                      color: "rgba(252,165,165,0.9)",
                    }}
                  >
                    Surrender
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
