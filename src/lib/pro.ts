/**
 * Nardy Blitz Pro — localStorage helpers for skin selection,
 * Pro preview unlock, and waitlist management.
 *
 * No payment processing. Pro skins are locally previewed only.
 * Production deployment would add Kaspi Pay / Freedom Pay / CloudPayments.
 */

export type BoardSkin = "classic" | "obsidian" | "emerald" | "walnut";

export interface SkinMeta {
  id: BoardSkin;
  label: string;
  description: string;
  isPro: boolean;
  /** Swatch colors for the selector UI */
  swatchA: string;
  swatchB: string;
}

export const SKINS: SkinMeta[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Felt green with mahogany points",
    isPro: false,
    swatchA: "#1A3A28",
    swatchB: "#2A1A10",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Charcoal black with slate points",
    isPro: true,
    swatchA: "#1C1C2E",
    swatchB: "#2C2C3C",
  },
  {
    id: "emerald",
    label: "Emerald Club",
    description: "Deep emerald with ivory accents",
    isPro: true,
    swatchA: "#0D4A28",
    swatchB: "#1A5C34",
  },
  {
    id: "walnut",
    label: "Royal Walnut",
    description: "Dark walnut with gold-ivory trim",
    isPro: true,
    swatchA: "#3A2010",
    swatchB: "#1E1008",
  },
];

const PRO_PREVIEW_KEY  = "nardy_blitz_pro_preview";
const SKIN_KEY         = "nardy_blitz_selected_skin";
const WAITLIST_KEY     = "nardy_blitz_pro_waitlist";

export function isProSkin(skin: BoardSkin): boolean {
  return SKINS.find((s) => s.id === skin)?.isPro ?? false;
}

export function isProPreviewUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(PRO_PREVIEW_KEY) === "true"; } catch { return false; }
}

export function unlockProPreview(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PRO_PREVIEW_KEY, "true"); } catch { /* ignore */ }
}

export function getSelectedSkin(): BoardSkin {
  if (typeof window === "undefined") return "classic";
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    if (raw === "classic" || raw === "obsidian" || raw === "emerald" || raw === "walnut") return raw;
  } catch { /* ignore */ }
  return "classic";
}

export function setSelectedSkin(skin: BoardSkin): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SKIN_KEY, skin); } catch { /* ignore */ }
}

export interface WaitlistEntry {
  name: string;
  email: string;
  city: string;
  note?: string;
  submittedAt: number;
}

export function saveProWaitlistEntry(entry: Omit<WaitlistEntry, "submittedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getProWaitlistEntries();
    existing.push({ ...entry, submittedAt: Date.now() });
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function getProWaitlistEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaitlistEntry[];
  } catch { return []; }
}
