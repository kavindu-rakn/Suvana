/**
 * SoundGuard — Design System
 * ─────────────────────────────────────────────────────────────────────────────
 * A single source of truth for colour, type, spacing, radius and elevation.
 *
 * Design intent: calm, professional, "instrument-grade". This is a safety tool
 * for Deaf and hard-of-hearing users, not a game. Colour is used sparingly and
 * only to carry meaning (threat level, primary action). Everything else is a
 * neutral grey scale with hairline borders and soft elevation.
 *
 * Both palettes expose an identical key set, so `Palette` is structurally
 * interchangeable and every screen renders correctly in either scheme.
 */

export type Scheme = 'light' | 'dark';

export type Palette = {
  scheme: Scheme;

  /** Page background. */
  bg: string;
  /** Slightly raised background (headers, sheets). */
  bgElevated: string;
  /** Card / list surface. */
  surface: string;
  /** Nested surface inside a card (inputs, badges, tracks). */
  surfaceAlt: string;
  /** Pressed / hovered surface. */
  surfaceHover: string;

  /** Hairline border. */
  border: string;
  /** Emphasised border (focus, selected). */
  borderStrong: string;

  /** Primary body / heading text. */
  text: string;
  /** Secondary copy. */
  textSecondary: string;
  /** Tertiary copy, captions, disabled. */
  textMuted: string;

  /** Brand / primary action. */
  primary: string;
  /** Primary at low opacity — safe over any surface. */
  primarySoft: string;
  /** Text/icon colour placed on top of `primary`. */
  onPrimary: string;

  /**
   * Secondary brand colour, used to distinguish the app's second mode.
   *
   * The dashboard offers two doors into two different pieces of hardware
   * behaviour, and they must be told apart at a glance and without relying on
   * reading. Violet is deliberately far from `primary` (blue) in hue and from
   * every semantic colour, so it can never be mistaken for a threat level.
   */
  accent: string;
  accentSoft: string;
  onAccent: string;

  /** Semantic: informational, non-threatening sound. */
  safe: string;
  safeSoft: string;

  /** Semantic: needs attention. */
  warning: string;
  warningSoft: string;

  /** Semantic: urgent / danger. */
  critical: string;
  criticalSoft: string;

  /** Scrim behind modals. */
  overlay: string;
  /** Shadow colour for elevation. */
  shadow: string;

  tabBar: string;
  tabBarBorder: string;
};

export const darkPalette: Palette = {
  scheme: 'dark',

  bg: '#0B0E13',
  bgElevated: '#10141B',
  surface: '#141922',
  surfaceAlt: '#1A2029',
  surfaceHover: '#222A36',

  border: '#232B37',
  borderStrong: '#323C4B',

  text: '#ECEFF4',
  textSecondary: '#A2ADBD',
  textMuted: '#6C7889',

  primary: '#5B8CFF',
  primarySoft: 'rgba(91, 140, 255, 0.16)',
  onPrimary: '#FFFFFF',

  accent: '#A78BFA',
  accentSoft: 'rgba(167, 139, 250, 0.16)',
  onAccent: '#160B2E',

  safe: '#34D399',
  safeSoft: 'rgba(52, 211, 153, 0.15)',

  warning: '#F5A524',
  warningSoft: 'rgba(245, 165, 36, 0.15)',

  critical: '#F0475C',
  criticalSoft: 'rgba(240, 71, 92, 0.16)',

  overlay: 'rgba(0, 0, 0, 0.66)',
  shadow: '#000000',

  tabBar: '#10141B',
  tabBarBorder: '#1E2530',
};

export const lightPalette: Palette = {
  scheme: 'light',

  bg: '#F5F7FA',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F8',
  surfaceHover: '#E7ECF3',

  border: '#E2E7EF',
  borderStrong: '#C9D2DF',

  text: '#0F1521',
  textSecondary: '#4B5567',
  textMuted: '#8792A4',

  primary: '#2563EB',
  primarySoft: 'rgba(37, 99, 235, 0.10)',
  onPrimary: '#FFFFFF',

  accent: '#6D28D9',
  accentSoft: 'rgba(109, 40, 217, 0.10)',
  onAccent: '#FFFFFF',

  safe: '#0E9F6E',
  safeSoft: 'rgba(14, 159, 110, 0.12)',

  warning: '#C2740A',
  warningSoft: 'rgba(194, 116, 10, 0.12)',

  critical: '#D92D3E',
  criticalSoft: 'rgba(217, 45, 62, 0.10)',

  overlay: 'rgba(12, 18, 28, 0.45)',
  shadow: '#0F1521',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E7EF',
};

/** Spacing scale (4pt grid). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Corner radii. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Type ramp. */
export const typography = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2 },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, fontWeight: '600' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.1 },
} as const;

/**
 * Cross-platform elevation. Android uses `elevation`; iOS uses shadow*.
 * Kept deliberately soft — premium products do not use hard drop shadows.
 */
export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string) {
  if (level === 0) return {};
  const map = {
    1: { opacity: 0.08, radius: 6, offset: 2, elevation: 1 },
    2: { opacity: 0.12, radius: 14, offset: 6, elevation: 4 },
    3: { opacity: 0.18, radius: 28, offset: 12, elevation: 10 },
  } as const;
  const m = map[level];
  return {
    shadowColor,
    shadowOpacity: m.opacity,
    shadowRadius: m.radius,
    shadowOffset: { width: 0, height: m.offset },
    elevation: m.elevation,
  };
}

/** Blend a hex colour with an alpha channel, returning `rgba(...)`. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Threat level → palette colours. Single place that maps meaning to colour. */
export type ThreatLevel = 'safe' | 'warning' | 'critical';

export function threatColors(c: Palette, level: ThreatLevel) {
  switch (level) {
    case 'critical':
      return { fg: c.critical, bg: c.criticalSoft, label: 'Critical' };
    case 'warning':
      return { fg: c.warning, bg: c.warningSoft, label: 'Attention' };
    default:
      return { fg: c.safe, bg: c.safeSoft, label: 'Routine' };
  }
}
