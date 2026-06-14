/**
 * SkillGrid — Design Tokens & Color System
 *
 * Single source of truth for the cyberpunk/gaming aesthetic.
 * All UI components import from here — zero ad-hoc color strings elsewhere.
 */

import type { NodeTier } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // Canvas background
  background: '#06060C',
  surface: '#0D0D18',
  surfaceRaised: '#14142A',
  surfaceElevated: '#1A1A36',

  // Text
  textPrimary: '#EEEEFF',
  textSecondary: '#8888BB',
  textDim: '#444466',
  textMuted: '#333355',

  // Tier neon accents (border + glow color per tier)
  tierFoundation: '#00D4FF',    // electric cyan
  tierIntermediate: '#00FF88',  // neon mint
  tierAdvanced: '#FF8C00',      // neon amber
  tierElite: '#CC44FF',         // violet plasma

  // Node states
  nodeLocked: '#0E0E1A',
  nodeUnlockable: '#0A1422',
  nodeCompleted: '#081A0E',

  // Edge states
  edgeLocked: '#1A1A2A',
  edgeUnlockable: '#2A3A4A',
  edgeCompleted: '#00FF8888',

  // XP bar
  xpFill: '#00D4FF',
  xpTrack: '#141428',

  // Status
  success: '#00FF88',
  warning: '#FFAA00',
  error: '#FF4466',

  // Overlays
  overlay: 'rgba(0,0,0,0.88)',
  glassBorder: 'rgba(255,255,255,0.06)',
  glassHighlight: 'rgba(255,255,255,0.03)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tier → Color Mapping
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<NodeTier, string> = {
  foundation: Colors.tierFoundation,
  intermediate: Colors.tierIntermediate,
  advanced: Colors.tierAdvanced,
  elite: Colors.tierElite,
};

export const TIER_ICONS: Record<NodeTier, string> = {
  foundation: '🔧',
  intermediate: '⚡',
  advanced: '🔥',
  elite: '💎',
};

export const TIER_GLOW_OPACITY: Record<NodeTier, number> = {
  foundation: 0.55,
  intermediate: 0.55,
  advanced: 0.60,
  elite: 0.70,
};

// ─────────────────────────────────────────────────────────────────────────────
// Rank System (based on progress %)
// ─────────────────────────────────────────────────────────────────────────────

export interface Rank {
  title: string;
  icon: string;
  color: string;
  minPercent: number;
}

export const RANKS: Rank[] = [
  { title: 'Novice', icon: '🌱', color: Colors.textDim, minPercent: 0 },
  { title: 'Apprentice', icon: '⚡', color: Colors.tierFoundation, minPercent: 10 },
  { title: 'Adept', icon: '🔷', color: Colors.tierFoundation, minPercent: 25 },
  { title: 'Journeyman', icon: '🟢', color: Colors.tierIntermediate, minPercent: 40 },
  { title: 'Expert', icon: '🔥', color: Colors.tierAdvanced, minPercent: 60 },
  { title: 'Master', icon: '👑', color: Colors.tierAdvanced, minPercent: 80 },
  { title: 'Grandmaster', icon: '💎', color: Colors.tierElite, minPercent: 95 },
  { title: 'Ascended', icon: '✨', color: Colors.tierElite, minPercent: 100 },
];

export function getRank(progressPercent: number): Rank {
  let result = RANKS[0];
  for (const rank of RANKS) {
    if (progressPercent >= rank.minPercent) result = rank;
  }
  return result;
}

export function getRankByXP(totalXp: number): Rank {
  // Define XP thresholds for ranks (scales exponentially)
  const xpThresholds: { minXp: number; rank: Rank }[] = [
    { minXp: 0, rank: RANKS[0] },      // Novice
    { minXp: 50, rank: RANKS[1] },     // Apprentice
    { minXp: 150, rank: RANKS[2] },    // Adept
    { minXp: 400, rank: RANKS[3] },    // Journeyman
    { minXp: 1000, rank: RANKS[4] },   // Expert
    { minXp: 2500, rank: RANKS[5] },   // Master
    { minXp: 6000, rank: RANKS[6] },   // Grandmaster
    { minXp: 15000, rank: RANKS[7] },  // Ascended
  ];

  let result = xpThresholds[0].rank;
  for (const threshold of xpThresholds) {
    if (totalXp >= threshold.minXp) result = threshold.rank;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export const Typography = {
  // Node card
  nodeTitle: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.3 },
  nodeTier: { fontSize: 9, fontWeight: '600' as const, letterSpacing: 1.2 },
  nodeXp: { fontSize: 10, fontWeight: '600' as const },

  // UI
  heading: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
  subheading: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  small: { fontSize: 10, fontWeight: '400' as const },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shadows
// ─────────────────────────────────────────────────────────────────────────────

export const Shadows = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.6,
    elevation: 8,
  }),
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
    elevation: 4,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Durations
// ─────────────────────────────────────────────────────────────────────────────

export const Timing = {
  /** Unlockable node glow pulse (one half-cycle, ms) */
  glowPulse: 1200,
  /** Node tap completion animation */
  nodeComplete: 350,
  /** XP bar fill */
  xpFill: 600,
  /** Pan/zoom spring stiffness */
  springStiff: 200,
  springDamp: 20,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border Radii
// ─────────────────────────────────────────────────────────────────────────────

export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
