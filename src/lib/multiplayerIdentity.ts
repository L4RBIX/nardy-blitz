// Browser identity for multiplayer without auth.
// Uses localStorage to track which rooms this browser created (host) or joined (guest).
// Two different browsers/devices opening the same room URL get different roles.

const PLAYER_ID_KEY  = "nardy_blitz_mp_player_id";
const ROOM_ROLES_KEY = "nardy_blitz_mp_room_roles";

type RoomRoles = Record<string, "host" | "guest">;

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage full or blocked */ }
}

// Stable anonymous ID for this browser — not used for auth, just identity tracking
export function getOrCreatePlayerId(): string {
  let id = safeGet(PLAYER_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    safeSet(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getRoomRole(roomId: string): "host" | "guest" | null {
  try {
    const raw = safeGet(ROOM_ROLES_KEY);
    if (!raw) return null;
    const roles = JSON.parse(raw) as RoomRoles;
    return roles[roomId] ?? null;
  } catch { return null; }
}

export function setRoomRole(roomId: string, role: "host" | "guest"): void {
  try {
    const raw = safeGet(ROOM_ROLES_KEY);
    const roles: RoomRoles = raw ? (JSON.parse(raw) as RoomRoles) : {};
    roles[roomId] = role;
    safeSet(ROOM_ROLES_KEY, JSON.stringify(roles));
  } catch { /* ignore */ }
}

export function clearRoomRole(roomId: string): void {
  try {
    const raw = safeGet(ROOM_ROLES_KEY);
    if (!raw) return;
    const roles = JSON.parse(raw) as RoomRoles;
    delete roles[roomId];
    safeSet(ROOM_ROLES_KEY, JSON.stringify(roles));
  } catch { /* ignore */ }
}
