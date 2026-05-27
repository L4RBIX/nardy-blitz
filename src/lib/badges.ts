/**
 * Badge logic for the Nardy Blitz city leaderboard.
 * Badges are calculated from local stats at submission time and stored in Supabase.
 */

export interface BadgeMeta {
  id: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

export const BADGE_DEFS: BadgeMeta[] = [
  {
    id: "city_rookie",
    label: "City Rookie",
    description: "Played at least 1 game",
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
  },
  {
    id: "local_grinder",
    label: "Local Grinder",
    description: "Played 5 or more games",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
  },
  {
    id: "almaty_contender",
    label: "Almaty Contender",
    description: "From Almaty with a score of 500+",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    id: "coach_favorite",
    label: "Coach Favorite",
    description: "Best coach score of 80 or higher",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    id: "dice_master",
    label: "Dice Master",
    description: "Average dice efficiency of 80%+",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
  },
  {
    id: "streak_hunter",
    label: "Streak Hunter",
    description: "Longest win streak of 3 or more",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.2)",
  },
];

export interface BadgeInput {
  gamesPlayed: number;
  city: string;
  score: number;
  bestCoachScore: number;
  avgDiceEfficiency: number;
  longestStreak: number;
}

export function calculateBadges(input: BadgeInput): string[] {
  const earned: string[] = [];

  if (input.gamesPlayed >= 1)  earned.push("city_rookie");
  if (input.gamesPlayed >= 5)  earned.push("local_grinder");
  if (
    input.city.toLowerCase().includes("almaty") &&
    input.score >= 500
  ) earned.push("almaty_contender");
  if (input.bestCoachScore >= 80)    earned.push("coach_favorite");
  if (input.avgDiceEfficiency >= 80) earned.push("dice_master");
  if (input.longestStreak >= 3)      earned.push("streak_hunter");

  return earned;
}

export function getBadgeMeta(id: string): BadgeMeta | null {
  return BADGE_DEFS.find((b) => b.id === id) ?? null;
}
