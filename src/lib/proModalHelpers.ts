/**
 * Helpers for ProModal — separates Supabase import (server-safe) from component.
 */
import { saveProWaitlistEntry as saveLocal, unlockProPreview } from "./pro";
import type { WaitlistEntry } from "./pro";

export { saveLocal as saveProWaitlistEntry, unlockProPreview };

/** Optionally insert waitlist entry into Supabase if configured. Never throws. */
export async function isSupabaseReadyForWaitlist(
  entry: Omit<WaitlistEntry, "submittedAt">,
): Promise<void> {
  try {
    const { supabase, isSupabaseConfigured } = await import("./supabase");
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from("pro_waitlist").insert({
      name: entry.name || null,
      email: entry.email || null,
      city: entry.city || null,
      note: entry.note || null,
    });
  } catch { /* non-fatal */ }
}
