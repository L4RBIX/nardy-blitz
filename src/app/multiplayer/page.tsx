"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getRoomRole, setRoomRole } from "../../lib/multiplayerIdentity";
import { isProPreviewUnlocked } from "../../lib/pro";
import { recordCompletedGame } from "../../lib/stats";
import {
  initializeGame,
  rollDice,
  applyMove,
  applyRoll,
  getLegalMoves,
  endTurn,
  checkWinner,
  opponent,
} from "../../game/engine";
import { Board } from "../../components/Board";
import { Dice } from "../../components/Dice";
import { TurnIndicator } from "../../components/TurnIndicator";
import { MoveHistory } from "../../components/MoveHistory";
import type { GameState, Player, PointIndex, Move } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MultiplayerRoom {
  id: string;
  // "waiting" = host created, no guest yet
  // "live"    = both joined, game in progress
  // "finished" = game over
  status: "waiting" | "live" | "finished";
  host_name: string;
  guest_name: string | null;
  // which role is white / black  ("host" or "guest")
  white_player: "host" | "guest";
  black_player: "host" | "guest";
  current_turn: "white" | "black";
  game_state: GameState;
  winner: string | null;
  end_reason: string | null;
  is_private: boolean;
  room_pin: string | null;
}

type MyRole = "host" | "guest";
type ConnStatus = "connecting" | "live" | "polling";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genRoomId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── SetupNeeded ───────────────────────────────────────────────────────────────

function SetupNeeded() {
  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      <nav
        className="relative z-10 flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          Nardy Blitz
        </Link>
        <Link
          href="/play"
          className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl"
          style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
        >
          Play
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
              <path d="M4 13h5M17 13h5M13 4v5M13 17v5" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="13" cy="13" r="3" stroke="#10B981" strokeWidth="1.8"/>
            </svg>
          </div>

          <h1 className="font-sans font-semibold text-xl tracking-tight mb-2 text-center" style={{ color: "var(--text-primary)" }}>
            Realtime multiplayer setup required
          </h1>
          <p className="text-sm leading-relaxed mb-6 text-center" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
            To play with a friend by link across devices, connect Supabase Realtime. Local game, bot, AI Coach, and stats work without it.
          </p>

          {/* Env vars */}
          <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(10,16,30,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              .env.local
            </p>
            {["NEXT_PUBLIC_SUPABASE_URL=", "NEXT_PUBLIC_SUPABASE_ANON_KEY="].map((v) => (
              <div key={v} className="font-mono text-[11px] py-0.5" style={{ color: "#10B981" }}>{v}</div>
            ))}
          </div>

          {/* Steps */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(14,22,39,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              Setup steps
            </p>
            <ol className="space-y-2.5">
              {[
                "Create a Supabase project at supabase.com.",
                "Open SQL Editor in your project dashboard.",
                "Copy and run supabase/schema.sql.",
                "Copy Project URL and anon public key.",
                "Add both to .env.local.",
                "Restart: npm run dev.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold mt-0.5"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/play"
              className="flex-1 flex items-center justify-center py-3 rounded-xl font-sans font-medium text-sm"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
            >
              Back to local game
            </Link>
            <Link
              href="/leaderboard"
              className="flex-1 flex items-center justify-center py-3 rounded-xl font-sans font-medium text-sm"
              style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              View leaderboard
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Connection badge ──────────────────────────────────────────────────────────

function ConnBadge({ status }: { status: ConnStatus }) {
  const map: Record<ConnStatus, { label: string; color: string; pulse: boolean }> = {
    connecting: { label: "Connecting…", color: "#F59E0B", pulse: true },
    live:       { label: "Realtime",    color: "#10B981", pulse: false },
    polling:    { label: "Polling",     color: "#94A3B8", pulse: true },
  };
  const { label, color, pulse } = map[status];
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px]"
      style={{ background: "rgba(14,22,39,0.7)", border: "1px solid var(--border)", color }}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color }}
        animate={pulse ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {label}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MultiplayerPage() {
  const [roomId, setRoomId]       = useState<string | null>(null);
  const [room, setRoom]           = useState<MultiplayerRoom | null>(null);
  const [myRole, setMyRole]       = useState<MyRole | null>(null);
  const [nameInput, setNameInput] = useState("Player");
  const [error, setError]         = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [joining, setJoining]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");

  // Private room state
  const [isPrivate, setIsPrivate]       = useState(false);
  const [pinInput, setPinInput]         = useState("");
  const [proUnlocked, setProUnlocked]   = useState(false);
  const [showProNote, setShowProNote]   = useState(false);

  const [selectedFrom, setSelectedFrom] = useState<PointIndex | null>(null);
  const [legalMoves, setLegalMoves]     = useState<Move[]>([]);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeFired  = useRef(false); // track if realtime has fired at least once
  const statsRecorded  = useRef(false); // session-level guard — localStorage is the cross-session guard

  // ── Derive player color from room data (not hardcoded!) ───────────────────
  // white_player / black_player store which ROLE ("host"|"guest") plays that color.
  const myColor: Player | null = myRole && room
    ? (room.white_player === myRole ? "white" : "black")
    : null;

  const isMyTurn = !!(
    room?.status === "live" &&
    !room.winner &&
    myColor &&
    room.current_turn === myColor
  );

  // ── Read room param + role from localStorage on mount ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    setProUnlocked(isProPreviewUnlocked());
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("room");
    if (rid) {
      setRoomId(rid);
      const role = getRoomRole(rid);
      if (role) setMyRole(role);
    }
  }, []);

  // ── Fetch room from DB ────────────────────────────────────────────────────
  const fetchRoom = useCallback(async (rid: string, silent = false) => {
    if (!supabase) return;
    const { data, error: e } = await supabase
      .from("multiplayer_rooms")
      .select("*")
      .eq("id", rid)
      .single();

    if (e || !data) {
      if (!silent) setError("Room not found.");
      return;
    }

    const r = data as MultiplayerRoom;
    setRoom(r);

    if (r.status === "live" && r.game_state.dice) {
      setLegalMoves(getLegalMoves(r.game_state));
    } else if (r.status !== "live") {
      setLegalMoves([]);
    }
  }, []);

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured) return;
    fetchRoom(roomId);
  }, [roomId, fetchRoom]);

  // ── Record completed game in local stats (once per room per browser) ─────
  useEffect(() => {
    if (!room || room.status !== "finished" || !myRole || !myColor || !roomId) return;
    if (!room.winner) return;

    // Session-level guard: don't record twice in the same page load
    if (statsRecorded.current) return;

    // Cross-session guard: don't record again after a page refresh
    const guardKey = `nardy_blitz_recorded_multiplayer_${roomId}`;
    if (typeof window !== "undefined" && localStorage.getItem(guardKey)) return;

    statsRecorded.current = true;

    const iWon       = room.winner === myColor;
    const surrender  = room.end_reason === "surrender";
    type R = "win" | "loss" | "win_by_surrender" | "loss_by_surrender";
    const result: R = surrender
      ? (iWon ? "win_by_surrender" : "loss_by_surrender")
      : (iWon ? "win" : "loss");

    const durationMs = Date.now() - room.game_state.startedAt;

    recordCompletedGame({
      mode:        "multiplayer",
      result,
      winner:      room.winner as "white" | "black",
      humanPlayer: myColor,
      durationMs,
    });

    // Optional cloud save to match_history (Pro + Supabase)
    if (isProPreviewUnlocked() && isSupabaseConfigured && supabase) {
      supabase.from("match_history").insert({
        mode:             "multiplayer",
        result,
        player_color:     myColor,
        duration_seconds: Math.round(durationMs / 1000),
        moves_count:      room.game_state.history.length,
      }).then(() => { /* silent */ });
    }

    try { localStorage.setItem(guardKey, "1"); } catch { /* quota */ }
  }, [room?.status, room?.winner, room?.end_reason, myRole, myColor, roomId, room]);

  // ── Supabase Realtime + polling fallback ──────────────────────────────────
  useEffect(() => {
    if (!roomId || !supabase || !isSupabaseConfigured) return;

    realtimeFired.current = false;

    const channel = supabase
      .channel(`mp_room_${roomId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "multiplayer_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          realtimeFired.current = true;
          const updated = (payload.new ?? payload.old) as MultiplayerRoom;
          if (!updated?.id) return;
          setRoom(updated);
          if (updated.status === "live" && updated.game_state?.dice) {
            setLegalMoves(getLegalMoves(updated.game_state));
          } else {
            setLegalMoves([]);
          }
          setSelectedFrom(null);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnStatus("live");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnStatus("polling");
        }
      });

    // 1500ms polling fallback — handles missed Realtime events and initial load
    pollRef.current = setInterval(async () => {
      if (!realtimeFired.current) {
        // Realtime hasn't fired yet — show polling status
        setConnStatus((prev) => (prev === "live" ? "live" : "polling"));
      }
      await fetchRoom(roomId, true);
    }, 1500);

    return () => {
      supabase!.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, fetchRoom]);

  // ── Create room ───────────────────────────────────────────────────────────
  async function handleCreateRoom() {
    if (!supabase) return;
    setCreating(true);
    setError(null);

    const rid  = genRoomId();
    const gs   = initializeGame();
    const name = nameInput.trim() || "Host";

    // Random color assignment for host
    const hostIsWhite  = Math.random() < 0.5;
    const white_player = hostIsWhite ? "host" : "guest";
    const black_player = hostIsWhite ? "guest" : "host";

    const pin = isPrivate
      ? String(Math.floor(1000 + Math.random() * 9000))
      : null;

    const { error: e } = await supabase.from("multiplayer_rooms").insert({
      id:           rid,
      status:       "waiting",
      host_name:    name,
      guest_name:   null,
      white_player,
      black_player,
      current_turn: gs.turn, // always "white" on fresh game
      game_state:   gs,
      winner:       null,
      end_reason:   null,
      is_private:   isPrivate,
      room_pin:     pin,
    });

    if (e) {
      setError(`Failed to create room: ${e.message}`);
      setCreating(false);
      return;
    }

    setRoomRole(rid, "host");
    setMyRole("host");
    setRoomId(rid);
    window.history.replaceState({}, "", `/multiplayer?room=${rid}`);
    setCreating(false);
    await fetchRoom(rid);
  }

  // ── Join room — only sets guest_name + status, preserves existing game state
  async function handleJoinRoom() {
    if (!supabase || !roomId || !room) return;

    // PIN validation for private rooms
    if (room.is_private && room.room_pin) {
      if (pinInput.trim() !== room.room_pin) {
        setError("Incorrect room PIN. Please check with the host.");
        return;
      }
    }

    setJoining(true);
    setError(null);
    const name = nameInput.trim() || "Guest";

    const { error: e } = await supabase
      .from("multiplayer_rooms")
      .update({ guest_name: name, status: "live" })
      .eq("id", roomId)
      .eq("status", "waiting"); // safety: only join if still waiting

    if (e) {
      setError(`Failed to join: ${e.message}`);
      setJoining(false);
      return;
    }

    setRoomRole(roomId, "guest");
    setMyRole("guest");
    setJoining(false);
    await fetchRoom(roomId);
  }

  // ── Copy invite link ──────────────────────────────────────────────────────
  function handleCopyLink() {
    if (!roomId) return;
    const url = `${window.location.origin}/multiplayer?room=${roomId}`;
    navigator.clipboard.writeText(url).catch(() => {
      // fallback: select the text manually
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Roll ──────────────────────────────────────────────────────────────────
  async function handleRoll() {
    if (!supabase || !room || !isMyTurn || room.game_state.dice) return;

    const roll  = rollDice();
    let newGs   = applyRoll(room.game_state, roll);
    const legal = getLegalMoves(newGs);

    if (legal.length === 0) {
      newGs = endTurn(newGs);
      await supabase.from("multiplayer_rooms").update({
        game_state:   newGs,
        current_turn: newGs.turn,
        last_action:  `${myColor} rolled ${roll[0]},${roll[1]} — no moves, turn skipped`,
      }).eq("id", room.id);
      return;
    }

    setLegalMoves(legal);
    await supabase.from("multiplayer_rooms").update({
      game_state:   newGs,
      current_turn: newGs.turn,
      last_action:  `${myColor} rolled ${roll[0]},${roll[1]}`,
    }).eq("id", room.id);
  }

  // ── Move ──────────────────────────────────────────────────────────────────
  async function handlePointClick(idx: PointIndex) {
    if (!supabase || !room || !isMyTurn || !room.game_state.dice) return;
    const gs = room.game_state;

    const isTarget = selectedFrom !== null &&
      legalMoves.some((m) => m.from === selectedFrom && m.to === idx);
    const isSource = legalMoves.some((m) => m.from === idx);

    if (isTarget && selectedFrom !== null) {
      const move = legalMoves.find((m) => m.from === selectedFrom && m.to === idx);
      if (!move) return;

      let newGs  = applyMove(gs, move);
      const win  = checkWinner(newGs);

      if (win) {
        await supabase.from("multiplayer_rooms").update({
          game_state:   newGs,
          winner:       win,
          status:       "finished",
          end_reason:   "normal",
          current_turn: newGs.turn,
          last_action:  `${myColor} wins`,
        }).eq("id", room.id);
        setSelectedFrom(null);
        setLegalMoves([]);
        return;
      }

      const remaining = newGs.dice?.remaining ?? [];

      if (remaining.length === 0) {
        newGs = endTurn(newGs);
        setSelectedFrom(null);
        setLegalMoves([]);
        await supabase.from("multiplayer_rooms").update({
          game_state:   newGs,
          current_turn: newGs.turn,
          last_action:  `${myColor} ${String(move.from)}→${String(move.to)}`,
        }).eq("id", room.id);
        return;
      }

      const nextLegal = getLegalMoves(newGs);
      if (nextLegal.length === 0) {
        newGs = endTurn(newGs);
        setSelectedFrom(null);
        setLegalMoves([]);
        await supabase.from("multiplayer_rooms").update({
          game_state:   newGs,
          current_turn: newGs.turn,
          last_action:  `${myColor} moved — no remaining moves`,
        }).eq("id", room.id);
        return;
      }

      setSelectedFrom(null);
      setLegalMoves(nextLegal);
      await supabase.from("multiplayer_rooms").update({
        game_state:   newGs,
        current_turn: newGs.turn,
        last_action:  `${myColor} ${String(move.from)}→${String(move.to)}`,
      }).eq("id", room.id);

    } else if (isSource) {
      setSelectedFrom(idx);
    }
  }

  // ── Surrender ─────────────────────────────────────────────────────────────
  async function handleSurrender() {
    if (!supabase || !room || !myColor) return;
    const win   = opponent(myColor);
    const newGs = { ...room.game_state, winner: win, dice: null } as GameState;
    await supabase.from("multiplayer_rooms").update({
      game_state:  newGs,
      winner:      win,
      status:      "finished",
      end_reason:  "surrender",
      last_action: `${myColor} surrendered`,
    }).eq("id", room.id);
    setShowSurrenderConfirm(false);
  }

  // ── Helper: player display name by color ─────────────────────────────────
  function playerName(color: Player): string {
    if (!room) return "—";
    const role = color === "white" ? room.white_player : room.black_player;
    return role === "host" ? room.host_name : (room.guest_name ?? "…");
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER TREE
  // ═══════════════════════════════════════════════════════════════

  // 1. No Supabase
  if (!isSupabaseConfigured) return <SetupNeeded />;

  // 2. Lobby (no room param)
  if (!roomId) {
    return (
      <div className="min-h-dvh flex flex-col overflow-x-hidden">
        <nav className="relative z-10 flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/" className="font-sans text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Nardy Blitz</Link>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="font-mono text-[11px] tracking-wider hidden sm:inline" style={{ color: "#475569" }}>Leaderboard</Link>
            <Link href="/play" className="font-mono text-[11px] tracking-wide px-4 py-1.5 rounded-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}>
              Play locally
            </Link>
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M17 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="font-sans font-semibold text-xl tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                Play with a friend
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                Create a realtime room and send the invite link. No account needed.
              </p>
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>Your name</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !creating) handleCreateRoom(); }}
                  placeholder="Host"
                  maxLength={24}
                  className="rounded-xl px-3 py-2.5 text-sm font-sans"
                  style={{ background: "rgba(10,16,30,0.8)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>

              {/* Private room toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                    Private room
                  </span>
                  {!proUnlocked && (
                    <span
                      className="ml-2 font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}
                    >
                      Pro
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!proUnlocked) { setShowProNote(true); return; }
                    setIsPrivate((p) => !p);
                  }}
                  className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                  style={{ background: isPrivate ? "#10B981" : "rgba(255,255,255,0.1)" }}
                  aria-label="Toggle private room"
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: isPrivate ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>
              {showProNote && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
                  Private rooms are a Pro feature. Click &ldquo;Upgrade to Pro&rdquo; on the play page and unlock Pro Preview.
                </p>
              )}

              {error && <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>}
              <motion.button
                onClick={handleCreateRoom}
                disabled={creating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl font-sans font-semibold text-sm cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.2)",
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? "Creating…" : isPrivate ? "Create private room" : "Create room"}
              </motion.button>
            </div>

            <p className="text-center text-[11px] mt-4 leading-relaxed" style={{ color: "var(--text-dim)", fontWeight: 300 }}>
              Color assigned randomly · Supabase Realtime sync · No login
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // 3. Loading room
  if (!room) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        {error ? (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: "#F87171" }}>{error}</p>
            <Link
              href="/multiplayer"
              className="inline-flex items-center gap-2 font-mono text-[11px] px-5 py-2.5 rounded-xl"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
            >
              Create new room
            </Link>
          </div>
        ) : (
          <div className="font-mono text-[11px] animate-pulse" style={{ color: "var(--text-dim)" }}>
            Loading room…
          </div>
        )}
      </div>
    );
  }

  // 4. Guest join form — room is waiting AND this browser has no role saved
  if (room.status === "waiting" && myRole === null) {
    // Derive what color the guest will play
    const guestColor = room.black_player === "guest" ? "Black" : "White";
    const hostColorLabel = room.white_player === "host" ? "White" : "Black";

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                Room {roomId?.toUpperCase()}
              </div>
              <h2 className="font-sans font-semibold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
                {room.host_name} invited you
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                You will play as <strong style={{ color: "var(--text-primary)" }}>{guestColor}</strong>.{" "}
                {room.host_name} plays as {hostColorLabel}.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                Your name
              </label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !joining) handleJoinRoom(); }}
                placeholder="Guest"
                maxLength={24}
                className="rounded-xl px-3 py-2.5 text-sm font-sans"
                style={{ background: "rgba(10,16,30,0.8)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>

            {/* PIN input for private rooms */}
            {room.is_private && (
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                  Room PIN
                  <span className="font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.15)", color: "var(--gold-bright)" }}>
                    Private
                  </span>
                </label>
                <input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !joining) handleJoinRoom(); }}
                  placeholder="4-digit PIN from host"
                  inputMode="numeric"
                  maxLength={4}
                  className="rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest"
                  style={{ background: "rgba(10,16,30,0.8)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--gold-bright)", outline: "none" }}
                />
              </div>
            )}

            {error && <p className="text-xs" style={{ color: "#F87171" }}>{error}</p>}
            <button
              onClick={handleJoinRoom}
              disabled={joining}
              className="w-full py-3 rounded-xl font-sans font-semibold text-sm cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "#fff",
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? "Joining…" : "Join game"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 5. Room already live or finished, but this browser has no role — spectator view
  if ((room.status === "live" || room.status === "finished") && myRole === null) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs text-center">
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <p className="font-sans font-semibold" style={{ color: "var(--text-primary)" }}>
              {room.status === "finished" ? "Game over" : "Game in progress"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
              This room is {room.status === "finished" ? "finished" : "already live"}. Create a new room to play.
            </p>
            <Link
              href="/multiplayer"
              className="py-2.5 rounded-xl font-mono text-[11px] tracking-wide text-center"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
            >
              Create new room
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // 6. Host waiting for guest
  if (room.status === "waiting" && myRole === "host") {
    const inviteUrl = typeof window !== "undefined"
      ? `${window.location.origin}/multiplayer?room=${roomId}`
      : `/multiplayer?room=${roomId}`;
    const myHostColor = room.white_player === "host" ? "White" : "Black";

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#F59E0B" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  Waiting for friend to join
                </span>
              </div>
              <h2 className="font-sans font-semibold text-lg tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                Room created
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                You are <strong style={{ color: "var(--text-primary)" }}>{myHostColor}</strong>. Share the invite link.
              </p>
            </div>

            {/* PIN display for private rooms */}
            {room.is_private && room.room_pin && (
              <div
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                  Room PIN
                </span>
                <span className="font-mono text-xl font-bold tracking-[0.2em]" style={{ color: "var(--gold-bright)" }}>
                  {room.room_pin}
                </span>
              </div>
            )}

            {/* Invite link — readable, selectable */}
            <div
              className="rounded-xl p-3 font-mono text-[11px] break-all cursor-text select-all"
              style={{ background: "rgba(10,16,30,0.8)", border: "1px solid var(--border)", color: "#10B981" }}
              onClick={handleCopyLink}
              title="Click to copy"
            >
              {inviteUrl}
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-xl font-mono text-[11px] tracking-wide cursor-pointer transition-all duration-150"
              style={{
                background: copied ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#10B981",
              }}
            >
              {copied ? "✓ Invite link copied!" : "Copy invite link"}
            </button>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-dim)" }}>
                Room: <span className="font-mono" style={{ color: "var(--gold-bright)", letterSpacing: "0.06em" }}>{roomId?.toUpperCase()}</span>
              </span>
              <ConnBadge status={connStatus} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 7. Finished
  if (room.status === "finished") {
    const iWon = room.winner === myColor;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center">
          <div className="glass rounded-2xl p-8 flex flex-col gap-4 items-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: iWon ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)",
                border: `1px solid ${iWon ? "rgba(16,185,129,0.2)" : "rgba(248,113,113,0.2)"}`,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                {iWon
                  ? <path d="M5 12l5 5L19 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  : <path d="M18 6L6 18M6 6l12 12" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
                }
              </svg>
            </div>
            <div>
              <h2 className="font-sans font-semibold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                {iWon
                  ? "You win!"
                  : myColor
                    ? `${room.winner === "white" ? "White" : "Black"} wins`
                    : `${room.winner === "white" ? playerName("white") : playerName("black")} wins`
                }
              </h2>
              {room.end_reason === "surrender" && (
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>by surrender</p>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <Link
                href="/multiplayer"
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
              >
                New room
              </Link>
              <Link
                href="/stats"
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl font-mono text-[11px] tracking-wide"
                style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Stats
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 8. Active game ("live")
  const gs      = room.game_state;
  const canRoll = isMyTurn && !gs.dice && !gs.winner;

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">

      {/* Header */}
      <header
        className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="font-sans text-sm font-semibold flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          Nardy Blitz
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Room chip */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-[10px]"
            style={{ background: "rgba(14,22,39,0.7)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            <span style={{ color: "var(--text-muted)" }}>Room</span>
            <span style={{ color: "var(--gold-bright)", letterSpacing: "0.08em" }}>{roomId?.toUpperCase()}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
            <span>Live</span>
          </div>

          {/* My color chip */}
          {myColor && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px]"
              style={{ background: "rgba(14,22,39,0.7)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border"
                style={{
                  background: myColor === "white" ? "linear-gradient(145deg,#F8F0E0,#CFC0A0)" : "linear-gradient(145deg,#1E1E1E,#050505)",
                  borderColor: myColor === "white" ? "rgba(200,185,155,0.5)" : "rgba(60,60,60,0.7)",
                }}
              />
              <span>You · {myColor === "white" ? "White" : "Black"}</span>
            </div>
          )}

          {/* Connection state */}
          <ConnBadge status={connStatus} />

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] cursor-pointer transition-all duration-150"
            style={{ background: "rgba(14,22,39,0.7)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <circle cx="2" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="8" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3.5 4.4l3-1.8M3.5 5.6l3 1.8" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-start gap-4 px-4 py-4 max-w-6xl mx-auto w-full min-w-0">

        {/* Board */}
        <div className="flex-1 w-full min-w-0">
          <Board
            state={gs}
            selectedFrom={selectedFrom}
            legalMoves={isMyTurn ? legalMoves : []}
            onSelectFrom={isMyTurn ? setSelectedFrom : () => {}}
            onMoveTo={handlePointClick}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-3 min-w-0">
          <TurnIndicator
            turn={gs.turn}
            winner={gs.winner}
            mode="2player"
            humanPlayer={myColor ?? "white"}
          />

          {/* Players — shows correct colors based on room config */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl font-mono text-[10px]"
            style={{ background: "rgba(14,22,39,0.6)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "linear-gradient(145deg,#F8F0E0,#CFC0A0)" }} />
              <span className="truncate">{playerName("white")}</span>
            </span>
            <span className="flex-shrink-0 px-1" style={{ color: "var(--text-dim)" }}>vs</span>
            <span className="flex items-center gap-1.5 min-w-0 justify-end">
              <span className="truncate">{playerName("black")}</span>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "linear-gradient(145deg,#1E1E1E,#050505)", border: "1px solid rgba(255,255,255,0.15)" }} />
            </span>
          </div>

          {/* Turn status */}
          <div
            className="px-3 py-2 rounded-xl font-mono text-[10px] text-center"
            style={{
              background: isMyTurn ? "rgba(16,185,129,0.06)" : "rgba(14,22,39,0.6)",
              border: `1px solid ${isMyTurn ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
              color: isMyTurn ? "#10B981" : "var(--text-dim)",
            }}
          >
            {gs.winner
              ? `${gs.winner === "white" ? playerName("white") : playerName("black")} wins`
              : isMyTurn
                ? "Your turn"
                : `${gs.turn === "white" ? playerName("white") : playerName("black")}'s turn…`
            }
          </div>

          {/* Dice */}
          <div className="glass rounded-2xl p-4 flex flex-col items-center gap-3" style={{ borderRadius: "var(--radius-card)" }}>
            <Dice
              values={gs.dice?.values ?? null}
              remaining={gs.dice?.remaining ?? []}
              canRoll={canRoll}
              isThinking={false}
              onRoll={handleRoll}
            />
          </div>

          {/* Move history */}
          <div className="glass rounded-2xl p-4" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              Move History
            </h3>
            <MoveHistory history={gs.history} />
          </div>

          {/* Surrender */}
          {!gs.winner && (
            <button
              onClick={() => setShowSurrenderConfirm(true)}
              className="w-full py-2 rounded-xl font-mono text-[11px] tracking-wide transition-all duration-150 cursor-pointer"
              style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", color: "rgba(252,165,165,0.4)" }}
              onMouseEnter={(e) => { (e.currentTarget).style.color = "rgba(252,165,165,0.8)"; (e.currentTarget).style.borderColor = "rgba(220,38,38,0.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget).style.color = "rgba(252,165,165,0.4)"; (e.currentTarget).style.borderColor = "rgba(220,38,38,0.15)"; }}
            >
              Surrender
            </button>
          )}
        </aside>
      </div>

      {/* Surrender confirm */}
      <AnimatePresence>
        {showSurrenderConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <div className="glass w-full max-w-xs rounded-2xl p-6" style={{ border: "1px solid rgba(220,38,38,0.2)" }}>
                <h2 className="font-sans font-semibold text-lg tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>Surrender?</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                  Your opponent will be declared the winner.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSurrenderConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl font-mono text-[11px] cursor-pointer"
                    style={{ background: "rgba(14,22,39,0.8)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSurrender}
                    className="flex-1 py-2.5 rounded-xl font-mono text-[11px] cursor-pointer"
                    style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)", color: "rgba(252,165,165,0.9)" }}
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
