/** StopScroller design tokens — dark, punchy, "brain rot" theme. */
export const Palette = {
  bg: '#0B0B0F',
  bgElevated: '#16161D',
  bgCard: '#1C1C25',
  border: '#2A2A35',
  text: '#F5F5F7',
  textDim: '#9A9AA8',
  textFaint: '#6A6A78',
  // brain-state accents
  healthy: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  accent: '#8B5CF6',
} as const;

export type BrainState = {
  label: string;
  blurb: string;
  color: string;
  emoji: string;
  /** 0..1 damage */
  damage: number;
};

/** Reels-per-day that = fully cooked brain. Calibrate later (plan phase 3 note). */
export const MAX_BRAIN = 200;

export function brainStateFor(count: number, max: number = MAX_BRAIN): BrainState {
  const damage = Math.max(0, Math.min(count / max, 1));
  if (damage < 0.25) {
    return { label: 'Healthy', blurb: 'Your brain is intact. Keep it that way.', color: Palette.healthy, emoji: '🧠', damage };
  }
  if (damage < 0.55) {
    return { label: 'Fraying', blurb: 'Attention span is starting to slip.', color: Palette.warning, emoji: '😵‍💫', damage };
  }
  if (damage < 0.85) {
    return { label: 'Cracking', blurb: "You've scrolled too far. Pull up.", color: Palette.danger, emoji: '🫠', damage };
  }
  return { label: 'Cooked', blurb: 'Brain officially fried. Put the phone down.', color: Palette.danger, emoji: '💀', damage };
}
