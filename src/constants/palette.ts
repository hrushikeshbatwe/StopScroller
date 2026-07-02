/** StopScroller design tokens — dark, punchy, "brain rot" theme. */

export const Palette = {
  // neutral ramp — surfaces get lighter as they come forward (never pure black/white)
  bg: '#0B0B0F',
  bgElevated: '#15151C',
  bgCard: '#1B1B24',
  bgCardHi: '#22222D',
  border: '#2A2A35',
  borderSoft: '#20202A',

  // text ramp
  text: '#F5F5F7',
  textDim: '#9A9AA8',
  textFaint: '#63636F',

  // brand accent (the "10%") + a magenta partner used only on the hero ring
  accent: '#8B5CF6',
  accentDeep: '#6D3FE0',
  accentInk: '#EDE7FF', // readable text/icon on an accent fill
  hot: '#EC4899',

  // semantic (brain state)
  healthy: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

/** Translucent tints for status backgrounds — layer a color at low alpha over a surface. */
export function tint(hex: string, alpha = 0.14): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** One spacing scale. Every padding / margin / gap comes from here (skill §1). */
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

/** Two radii, used consistently. */
export const Radius = {
  card: 20,
  control: 14,
  pill: 999,
} as const;

/** Type scale — sizes + the weights we allow. */
export const Type = {
  display: { fontSize: 52, fontWeight: '800' as const, letterSpacing: -1.5 },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6 },
  heading: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  overline: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
} as const;

/** Soft elevation for cards (RN: shadow props on iOS, elevation on Android). */
export const Elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
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
