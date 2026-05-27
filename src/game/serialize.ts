import type { GameState } from "../types";

export function encodeState(state: GameState): string {
  const json = JSON.stringify(state);
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(encodeURIComponent(json));
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

export function decodeState(encoded: string): GameState | null {
  try {
    let json: string;
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      json = decodeURIComponent(window.atob(encoded));
    } else {
      json = Buffer.from(encoded, "base64").toString("utf-8");
    }
    return JSON.parse(json) as GameState;
  } catch {
    return null;
  }
}
