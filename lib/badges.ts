import type { LucideIcon } from "lucide-react";
import { Footprints, Flame, Trophy, Crown, Users, Heart, Star, Sparkles } from "lucide-react";

// What we know about a profile so far (all derived from real data; grows over time).
export interface ProfileStats {
  adventures: number;
  crews: number;
  interests: number;
}

export interface BadgeDef {
  id: string;
  label: string;
  how: string; // what you do to earn it (shown on locked badges)
  icon: LucideIcon;
  got: (s: ProfileStats) => boolean;
}

// Ordered easiest -> hardest so the "see all" page reads as a ladder.
export const BADGES: BadgeDef[] = [
  { id: "first", label: "First Steps", how: "Finish your first adventure", icon: Footprints, got: (s) => s.adventures >= 1 },
  { id: "crew", label: "Found a Crew", how: "Join or start a crew", icon: Users, got: (s) => s.crews >= 1 },
  { id: "curious", label: "Curious Mind", how: "Pick 5+ interests", icon: Star, got: (s) => s.interests >= 5 },
  { id: "five", label: "Trailblazer", how: "Finish 5 adventures", icon: Flame, got: (s) => s.adventures >= 5 },
  { id: "connector", label: "Connector", how: "Be in 3 crews", icon: Heart, got: (s) => s.crews >= 3 },
  { id: "renaissance", label: "Renaissance", how: "Pick 15+ interests", icon: Sparkles, got: (s) => s.interests >= 15 },
  { id: "ten", label: "Seasoned", how: "Finish 10 adventures", icon: Trophy, got: (s) => s.adventures >= 10 },
  { id: "legend", label: "Legend", how: "Finish 25 adventures", icon: Crown, got: (s) => s.adventures >= 25 },
];

export function splitBadges(stats: ProfileStats) {
  const earned = BADGES.filter((b) => b.got(stats));
  const locked = BADGES.filter((b) => !b.got(stats));
  return { earned, locked };
}
