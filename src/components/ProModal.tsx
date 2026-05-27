"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveProWaitlistEntry,
  unlockProPreview,
  isSupabaseReadyForWaitlist,
} from "../lib/proModalHelpers";

export interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after preview unlock so parent can re-render skins */
  onPreviewUnlocked?: () => void;
}

const BENEFITS = [
  "Premium board skins",
  "Deeper AI Coach reports",
  "Cloud-saved match history",
  "Private friend rooms",
  "City leaderboard badges",
  "Family tournament mode",
];

export function ProModal({ isOpen, onClose, onPreviewUnlocked }: ProModalProps) {
  const [view, setView] = useState<"main" | "waitlist" | "success">("main");
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity]   = useState("");
  const [note, setNote]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setView("main");
    onClose();
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);

    // Save locally always
    saveProWaitlistEntry({ name: name.trim(), email: email.trim(), city: city.trim(), note: note.trim() || undefined });

    // Optionally also save to Supabase if configured
    await isSupabaseReadyForWaitlist({ name: name.trim(), email: email.trim(), city: city.trim(), note: note.trim() || undefined });

    setSubmitting(false);
    setView("success");
  }

  function handlePreviewUnlock() {
    unlockProPreview();
    handleClose();
    onPreviewUnlocked?.();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(10,16,30,0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "var(--font-dm-sans)",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(5,10,18,0.85)", backdropFilter: "blur(8px)" }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0E1627 0%, #0A1020 100%)",
                border: "1px solid rgba(217,119,6,0.2)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,119,6,0.08)",
              }}
            >
              {/* Gold header bar */}
              <div
                className="h-1 w-full"
                style={{ background: "linear-gradient(90deg, var(--gold) 0%, var(--gold-bright) 100%)" }}
              />

              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* ── Main view ── */}
                  {view === "main" && (
                    <motion.div
                      key="main"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-[9px] tracking-widest uppercase"
                              style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", color: "var(--gold-bright)" }}
                            >
                              Pro
                            </span>
                          </div>
                          <h2 className="font-sans font-semibold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                            Nardy Blitz Pro
                          </h2>
                          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                            Premium board skins and deeper training features.
                          </p>
                        </div>
                        <button
                          onClick={handleClose}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150 flex-shrink-0 mt-1"
                          style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}
                          aria-label="Close"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>

                      {/* Price */}
                      <div
                        className="my-5 px-4 py-3 rounded-xl flex items-center justify-between"
                        style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.14)" }}
                      >
                        <span className="font-mono text-2xl font-semibold" style={{ color: "var(--gold-bright)" }}>
                          990 ₸
                        </span>
                        <span className="font-mono text-[11px]" style={{ color: "var(--text-dim)" }}>/ month</span>
                      </div>

                      {/* Benefits */}
                      <ul className="flex flex-col gap-2 mb-5">
                        {BENEFITS.map((b) => (
                          <li key={b} className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                                <path d="M1 4l2 2 4-4" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                            <span className="text-sm" style={{ color: "var(--text-muted)", fontWeight: 300 }}>{b}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Buttons */}
                      <div className="flex flex-col gap-2.5">
                        <button
                          onClick={() => setView("waitlist")}
                          className="w-full py-3 rounded-xl font-sans font-semibold text-sm tracking-wide transition-all duration-150 cursor-pointer"
                          style={{
                            background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)",
                            color: "#0A0800",
                            boxShadow: "0 4px 16px rgba(217,119,6,0.25)",
                          }}
                        >
                          Join Pro Waitlist
                        </button>
                        <button
                          onClick={handlePreviewUnlock}
                          className="w-full py-2.5 rounded-xl font-sans text-sm tracking-wide transition-all duration-150 cursor-pointer"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Preview Pro Skins
                        </button>
                      </div>

                      {/* Honest note */}
                      <p
                        className="mt-4 text-[11px] leading-relaxed text-center"
                        style={{ color: "var(--text-dim)", fontWeight: 300 }}
                      >
                        Payments are not enabled in this prototype. For Kazakhstan launch, Nardy Blitz
                        would use Kaspi Pay, Freedom Pay, CloudPayments, or local acquiring.
                      </p>
                    </motion.div>
                  )}

                  {/* ── Waitlist form ── */}
                  {view === "waitlist" && (
                    <motion.div
                      key="waitlist"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <button
                          onClick={() => setView("main")}
                          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                          aria-label="Back"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path d="M8 2L3 6l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <h2 className="font-sans font-semibold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
                          Join Pro Waitlist
                        </h2>
                      </div>

                      <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                            Name <span style={{ color: "#F87171" }}>*</span>
                          </label>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                            style={inputStyle}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                            Email <span style={{ color: "#F87171" }}>*</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            style={inputStyle}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                            City
                          </label>
                          <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Almaty, Astana…"
                            style={inputStyle}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                            Note (optional)
                          </label>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Anything you'd like the team to know"
                            rows={2}
                            style={{ ...inputStyle, resize: "none" }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !name.trim() || !email.trim()}
                          className="w-full py-3 mt-1 rounded-xl font-sans font-semibold text-sm tracking-wide cursor-pointer transition-all duration-150"
                          style={
                            (!submitting && name.trim() && email.trim())
                              ? {
                                  background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)",
                                  color: "#0A0800",
                                  boxShadow: "0 4px 16px rgba(217,119,6,0.25)",
                                }
                              : {
                                  background: "rgba(14,22,39,0.8)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-dim)",
                                  cursor: "not-allowed",
                                }
                          }
                        >
                          {submitting ? "Submitting…" : "Submit"}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* ── Success ── */}
                  {view === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center py-6 text-center gap-4"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M5 12l5 5L19 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-lg tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                          You&apos;re on the Pro waitlist.
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontWeight: 300 }}>
                          We&apos;ll reach out when Pro launches. Meanwhile, enjoy a skin preview on this device.
                        </p>
                      </div>
                      <button
                        onClick={() => { handlePreviewUnlock(); }}
                        className="px-6 py-2.5 rounded-xl font-sans text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{
                          background: "linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)",
                          color: "#0A0800",
                          boxShadow: "0 4px 16px rgba(217,119,6,0.2)",
                        }}
                      >
                        Preview Pro Skins
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
