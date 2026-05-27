"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ProModal } from "../components/ProModal";

// ProModal is used for the "Join Pro Waitlist" CTA on the landing page

// ── Easing + variant constants ────────────────────────────────────────────────
const EXPO = [0.23, 1, 0.32, 1] as const;

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: EXPO } },
};

const cardContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } },
};

// ── Dice face ─────────────────────────────────────────────────────────────────
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
};

function DieFace({ value }: { value: number }) {
  return (
    <div
      style={{
        width: 28, height: 28,
        background: "#131D2C",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6, flexShrink: 0, overflow: "hidden",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden>
        {(PIPS[value] ?? []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill="#10B981" />
        ))}
      </svg>
    </div>
  );
}

// ── Mini board ────────────────────────────────────────────────────────────────
function MiniBoard() {
  const TOP = [true, false, true, false, true, false];
  const BOT = [false, true, false, true, false, true];

  const tri = (em: boolean, dir: "down" | "up"): CSSProperties => ({
    flex: "1 1 0", height: "100%",
    clipPath: dir === "down"
      ? "polygon(10% 0%, 90% 0%, 50% 92%)"
      : "polygon(50% 8%, 10% 100%, 90% 100%)",
    background: em ? "#1C3D2A" : "#2E1A0C",
  });

  const pip = (white: boolean): CSSProperties => ({
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
    background: white
      ? "linear-gradient(145deg,#F0E8D8,#C4B490)"
      : "linear-gradient(145deg,#2C2C2C,#0A0A0A)",
    border: white
      ? "1px solid rgba(190,175,145,0.5)"
      : "1px solid rgba(55,55,55,0.7)",
  });

  return (
    <div style={{
      background: "#071510", borderRadius: 8, padding: 5,
      display: "flex", flexDirection: "column", gap: 2,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 2, height: 46 }}>
        {TOP.map((e, i) => <div key={i} style={tri(e, "down")} />)}
        <div style={{ width: 8, flexShrink: 0 }} />
        {TOP.map((e, i) => <div key={`r${i}`} style={tri(!e, "down")} />)}
      </div>
      <div style={{ height: 10, display: "flex" }}>
        <div style={{ flex: 1 }} />
        <div style={{ width: 8, background: "rgba(0,0,0,0.3)", borderRadius: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 2, height: 46 }}>
        {BOT.map((e, i) => <div key={i} style={tri(e, "up")} />)}
        <div style={{ width: 8, flexShrink: 0 }} />
        {BOT.map((e, i) => <div key={`r${i}`} style={tri(!e, "up")} />)}
      </div>
      {/* White checkers */}
      <div style={{ position: "absolute", bottom: 11, left: 7, display: "flex", gap: 2 }}>
        {[0,1,2,3,4].map(i => <div key={i} style={pip(true)} />)}
      </div>
      <div style={{ position: "absolute", bottom: 11, right: 16, display: "flex", gap: 2 }}>
        {[0,1,2].map(i => <div key={i} style={pip(true)} />)}
      </div>
      {/* Black checkers */}
      <div style={{ position: "absolute", top: 9, left: 7, display: "flex", gap: 2 }}>
        {[0,1,2,3,4].map(i => <div key={i} style={pip(false)} />)}
      </div>
      <div style={{ position: "absolute", top: 9, right: 16, display: "flex", gap: 2 }}>
        {[0,1,2].map(i => <div key={i} style={pip(false)} />)}
      </div>
    </div>
  );
}

// ── Product mockup card (with internal stagger) ───────────────────────────────
function ProductMockup() {
  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.38, ease: EXPO, delay },
  });

  return (
    <div style={{
      background: "#0C1612",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20, padding: 16,
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 48px 96px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
    }}>
      {/* Header */}
      <motion.div {...reveal(0.38)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <circle cx="6" cy="6" r="5" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="6" cy="6" r="2.5" fill="#10B981" />
          </svg>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fontWeight: 600, color: "#E2E8F0" }}>
            Nardy Blitz
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.18)",
          borderRadius: 99, padding: "2px 8px",
        }}>
          {/* Pulsing status dot */}
          <motion.div
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, color: "#10B981", letterSpacing: "0.04em" }}>
            Your turn
          </span>
        </div>
      </motion.div>

      {/* Board */}
      <motion.div {...reveal(0.48)}>
        <MiniBoard />
      </motion.div>

      {/* Dice + move history */}
      <motion.div {...reveal(0.58)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <DieFace value={4} />
        <DieFace value={2} />
        <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, color: "#475569", marginLeft: 4 }}>
          2 moves left
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          {["6→2", "8→12"].map((m, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-jetbrains)", fontSize: 8,
              color: i === 0 ? "rgba(241,245,249,0.5)" : "rgba(241,245,249,0.2)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 4, padding: "1px 5px",
            }}>{m}</span>
          ))}
        </div>
      </motion.div>

      {/* AI Coach insight */}
      <motion.div
        {...reveal(0.72)}
        style={{
          background: "rgba(16,185,129,0.04)",
          border: "1px solid rgba(16,185,129,0.12)",
          borderRadius: 9, padding: "8px 10px",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}
      >
        <div style={{ width: 2, height: 30, background: "#10B981", borderRadius: 1, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{
            fontFamily: "var(--font-jetbrains)", fontSize: 8, color: "#10B981",
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3,
          }}>
            AI Coach
          </div>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>
            Blot left on point 18 — consider covering or retreating.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [proModalOpen, setProModalOpen] = useState(false);

  const features = [
    { tag: "vs Bot",    title: "Play vs Bot",      body: "Challenge a heuristic opponent that prioritizes hits, anchors, and bearing off." },
    { tag: "2 Player",  title: "Local 2-player",   body: "Pass the screen and play face-to-face on one device. No network required." },
    { tag: "Coach",     title: "AI Coach",         body: "After every game, get concise insights on blots, points, hits, and dice efficiency." },
  ];

  const trainingLoop = [
    { n: "01", label: "Play",     body: "Start instantly against a bot, a local opponent, or a friend by link." },
    { n: "02", label: "Analyze",  body: "After the match, AI Coach reviews move quality, blots, hits, anchors, and dice efficiency." },
    { n: "03", label: "Improve",  body: "Get short recommendations instead of vague win/loss feedback." },
    { n: "04", label: "Track",    body: "Stats and leaderboards turn matches into visible progress." },
  ];

  const startupFeatures = [
    { tag: "Multiplayer",  title: "Friend-link rooms",    body: "Create a room and invite a friend with a single link. Supabase Realtime keeps both boards in sync." },
    { tag: "Leaderboard",  title: "City leaderboard",     body: "Compare performance with players from Almaty and other cities. Prototype-level ranking system." },
    { tag: "Monetization", title: "Pro roadmap",          body: "Premium skins and deeper coach reports create a clear monetization path for Kazakhstan launch." },
  ];

  const proFeatures = [
    "Premium board skins",
    "Deeper AI Coach reports",
    "Cloud-saved match history",
    "Private rooms and city badges",
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh flex flex-col relative overflow-x-hidden">

        {/* Ambient gradients */}
        <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
          <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse, rgba(5,150,105,0.07) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: "0", right: "-8%", width: "45%", height: "45%", background: "radial-gradient(ellipse, rgba(5,150,105,0.04) 0%, transparent 70%)" }} />
        </div>

        {/* ── Nav ── */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="9" stroke="#10B981" strokeWidth="1.5" />
              <circle cx="11" cy="11" r="4.5" fill="#10B981" opacity="0.85" />
            </svg>
            <span className="font-sans text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Nardy Blitz
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/multiplayer" className="font-mono text-[11px] tracking-wider transition-colors duration-150 hidden sm:inline" style={{ color: "#475569" }}>Multiplayer</Link>
            <Link href="/leaderboard"  className="font-mono text-[11px] tracking-wider transition-colors duration-150 hidden sm:inline" style={{ color: "#475569" }}>Leaderboard</Link>
            <Link href="/stats"        className="font-mono text-[11px] tracking-wider transition-colors duration-150" style={{ color: "#475569" }}>Stats</Link>
            <button
              onClick={() => setProModalOpen(true)}
              className="font-mono text-[11px] tracking-wider transition-colors duration-150 cursor-pointer hidden sm:inline"
              style={{ color: "var(--gold-bright)", background: "none", border: "none", padding: 0 }}
            >
              Pro
            </button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
              <Link href="/play" className="font-sans text-xs font-medium px-4 py-2 rounded-xl transition-colors duration-150 block" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", color: "#10B981" }}>
                Play
              </Link>
            </motion.div>
          </div>
        </motion.nav>

        {/* ── Main ── */}
        <main className="relative z-10 flex-1">

          {/* Hero */}
          <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={heroContainer} initial="hidden" animate="visible">
              <motion.div
                variants={heroItem}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] tracking-wider mb-7"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", color: "#10B981" }}
              >
                <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
                No account needed · Play instantly
              </motion.div>

              <motion.h1
                variants={heroItem}
                className="font-sans font-bold text-balance leading-[1.08] tracking-tight mb-5"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", color: "var(--text-primary)" }}
              >
                Not just a board.{" "}
                <span style={{ color: "#10B981" }}>A training loop.</span>
              </motion.h1>

              <motion.p variants={heroItem} className="text-base leading-relaxed mb-10" style={{ color: "#64748B", maxWidth: "40ch" }}>
                Play fast matches, challenge a bot or friend, and get AI-style coaching after every game. Stats, leaderboards, and Pro skins turn backgammon into a platform.
              </motion.p>

              <motion.div variants={heroItem} className="flex flex-col sm:flex-row gap-3 mb-9">
                <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 24 }} className="inline-flex">
                  <Link href="/play" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-sans font-semibold text-sm w-full sm:w-auto" style={{ background: "#059669", color: "#fff", boxShadow: "0 0 0 1px rgba(5,150,105,0.5), 0 6px 20px rgba(5,150,105,0.18)" }}>
                    Play now
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                </motion.div>
                <Link href="/stats" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-sans text-sm transition-colors duration-150 w-full sm:w-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}>
                  View stats
                </Link>
              </motion.div>

              <motion.div variants={heroItem} className="flex flex-wrap gap-2">
                {["Local 2-player", "Bot opponent", "Friend-link rooms", "City leaderboard", "AI Coach"].map((label) => (
                  <div key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] tracking-wider" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: "#10B981", opacity: 0.7 }} />
                    {label}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 32, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.65, delay: 0.18, ease: EXPO }} whileHover={{ y: -5, transition: { duration: 0.22, ease: "easeOut" } }} className="lg:pl-6">
              <ProductMockup />
            </motion.div>
          </div>

          {/* ── Training loop ── */}
          <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-16" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "4rem" }}>
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.3 }} className="font-mono text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
              The product loop
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay: 0.05 }} className="font-sans font-semibold tracking-tight mb-8 text-balance" style={{ fontSize: "clamp(1.25rem,2.5vw,1.75rem)", color: "var(--text-primary)" }}>
              Play → Analyze → Improve → Track
            </motion.h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" variants={cardContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
              {trainingLoop.map((s) => (
                <motion.div key={s.label} variants={cardItem} whileHover={{ y: -4, transition: { duration: 0.15 } }} className="rounded-2xl p-5 border cursor-default" style={{ background: "#0B1110", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "#10B981" }}>{s.n}</div>
                  <h3 className="font-sans font-semibold text-sm mb-2" style={{ color: "#E2E8F0" }}>{s.label}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{s.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── What's inside ── */}
          <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-16">
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.3 }} className="font-mono text-[10px] tracking-[0.1em] uppercase mb-5" style={{ color: "var(--text-muted)" }}>
              What&apos;s inside
            </motion.div>
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3" variants={cardContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
              {features.map((f) => (
                <motion.div key={f.title} variants={cardItem} whileHover={{ y: -4, transition: { duration: 0.15, ease: "easeOut" } }} className="rounded-2xl p-5 border transition-colors duration-200 hover:border-white/[0.14] cursor-default" style={{ background: "#0B1110", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-[9px] tracking-wider mb-4" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.14)", color: "#10B981" }}>{f.tag}</div>
                  <h3 className="font-sans font-semibold text-sm mb-2" style={{ color: "#E2E8F0" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{f.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── Built like a startup prototype ── */}
          <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: EXPO }} className="max-w-6xl mx-auto px-6 sm:px-10 py-14" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>Startup thinking</div>
            <h2 className="font-sans font-semibold tracking-tight mb-8 text-balance" style={{ fontSize: "clamp(1.25rem,2.5vw,1.75rem)", color: "var(--text-primary)" }}>
              Built like a startup prototype
            </h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3" variants={cardContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
              {startupFeatures.map((f) => (
                <motion.div key={f.title} variants={cardItem} whileHover={{ y: -4, transition: { duration: 0.15 } }} className="rounded-2xl p-5 border cursor-default" style={{ background: "#0B1110", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-[9px] tracking-wider mb-4" style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.14)", color: "var(--gold-bright)" }}>{f.tag}</div>
                  <h3 className="font-sans font-semibold text-sm mb-2" style={{ color: "#E2E8F0" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{f.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* ── Roadmap to Pro ── */}
          <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: EXPO }} className="max-w-6xl mx-auto px-6 sm:px-10 py-14" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              <div className="flex-1">
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>Monetization</div>
                <h2 className="font-sans font-semibold tracking-tight mb-3 text-balance" style={{ fontSize: "clamp(1.25rem,2.5vw,1.75rem)", color: "var(--text-primary)" }}>
                  Roadmap to Pro
                </h2>
                <p className="text-sm leading-relaxed mb-6 max-w-prose" style={{ color: "#64748B" }}>
                  The MVP focuses on the core training loop: play, analyze, improve. Pro expands personalization and retention.
                </p>
                <ul className="flex flex-col gap-2 mb-6">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#64748B" }}>
                      <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden><path d="M1 4l2 2 4-4" stroke="var(--gold-bright)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-2">
                  <motion.button onClick={() => setProModalOpen(true)} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 24 }} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-sans font-semibold text-sm cursor-pointer" style={{ background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)", color: "#0A0800", boxShadow: "0 4px 16px rgba(217,119,6,0.2)" }}>
                    Join Pro Waitlist
                  </motion.button>
                </div>
                <p className="mt-4 text-[11px]" style={{ color: "var(--text-dim)", fontWeight: 300 }}>
                  No payments active. Kazakhstan launch would use Kaspi Pay, Freedom Pay, or local acquiring.
                </p>
              </div>

              <div className="w-full lg:w-72 flex-shrink-0 rounded-2xl p-5" style={{ background: "rgba(14,22,39,0.7)", border: "1px solid rgba(217,119,6,0.1)" }}>
                <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>Pro pricing</div>
                <div className="font-mono text-3xl font-semibold mb-0.5" style={{ color: "var(--gold-bright)" }}>990 ₸</div>
                <div className="font-mono text-[11px] mb-5" style={{ color: "var(--text-dim)" }}>/ month · prototype price</div>
                <div className="text-[11px] mb-4 leading-relaxed" style={{ color: "#64748B" }}>
                  Payments are not enabled in this prototype. The price shown reflects planned local pricing.
                </div>
                <button onClick={() => setProModalOpen(true)} className="w-full py-2.5 rounded-xl font-mono text-[11px] tracking-wide cursor-pointer transition-all duration-150" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--gold-bright)" }}>
                  Preview Pro Skins
                </button>
              </div>
            </div>
          </motion.section>

          {/* ── Why it's different ── */}
          <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: EXPO }} className="max-w-6xl mx-auto px-6 sm:px-10 py-12" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ maxWidth: 520 }}>
              <div className="font-mono text-[10px] tracking-[0.1em] uppercase mb-4" style={{ color: "var(--text-muted)" }}>Why it&apos;s different</div>
              <p className="text-base leading-relaxed" style={{ color: "#64748B" }}>
                Most backgammon sites stop at the board.{" "}
                <span style={{ color: "#94A3B8" }}>
                  Nardy Blitz adds a training loop: AI coaching, stats, city leaderboards, friend-link rooms, and a Pro monetization path — all in one MVP.
                </span>
              </p>
            </div>
          </motion.section>

          {/* ── Final CTA ── */}
          <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: EXPO }} className="max-w-6xl mx-auto px-6 sm:px-10 py-16 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="font-sans font-bold tracking-tight mb-3" style={{ fontSize: "clamp(1.5rem,3vw,2rem)", color: "#E2E8F0" }}>
              Ready to play?
            </h2>
            <p className="text-sm mb-8" style={{ color: "#475569" }}>No account. No install. Just open and play.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 24 }} className="inline-flex">
                <Link href="/play" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-sans font-semibold text-sm" style={{ background: "#059669", color: "#fff", boxShadow: "0 0 0 1px rgba(5,150,105,0.5), 0 10px 32px rgba(5,150,105,0.18)" }}>
                  Play now
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </motion.div>
              <Link href="/multiplayer" className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-sans text-sm" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", color: "#10B981" }}>
                Play with a friend
              </Link>
            </div>
          </motion.section>
        </main>

        {/* ── Footer ── */}
        <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: "var(--text-dim)" }}>
            Built for nFactorial Incubator 2026
          </p>
        </footer>

        {/* Pro modal */}
        <ProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
      </div>
    </MotionConfig>
  );
}
