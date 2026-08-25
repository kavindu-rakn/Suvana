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
   * reading. Violet is deliberately far from `primary` (teal) in hue and from
   * every semantic colour, so it can never be mistaken for a threat level.
   * (Kept violet in the Suvana retheme for exactly that reason: brand gold
   * sits next to `warning` amber and would break this rule.)
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

  // Suvana retheme: the blue-tinted neutrals became teal-tinted at the same
  // lightness steps, and primary is the shared Suvana accent (#2DD4BF — see
  // packages/branding/palette.css). Semantic colours are untouched.
  bg: '#0A1414',
  bgElevated: '#101B1A',
  surface: '#142221',
  surfaceAlt: '#1A2C2A',
  surfaceHover: '#223634',

  border: '#233735',
  borderStrong: '#324B48',

  text: '#ECF4F2',
  textSecondary: '#A2BDB8',
  textMuted: '#6C8983',

  primary: '#2DD4BF',
  primarySoft: 'rgba(45, 212, 191, 0.16)',
  onPrimary: '#04201D',

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

  tabBar: '#101B1A',
  tabBarBorder: '#1E302E',
};

export const lightPalette: Palette = {
  scheme: 'light',

  // Suvana light mode: teal-tinted neutrals; primary is the darkened brand
  // teal (#00776A) so white text on it clears WCAG AA (5.9:1), where pure
  // #00A693 would not.
  bg: '#F4F8F7',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF5F3',
  surfaceHover: '#E5F0ED',

  border: '#DFE9E6',
  borderStrong: '#C6D6D2',

  text: '#0F1F1C',
  textSecondary: '#4B6560',
  textMuted: '#87A49D',

  primary: '#00776A',
  primarySoft: 'rgba(0, 166, 147, 0.10)',
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

  overlay: 'rgba(10, 20, 20, 0.45)',
  shadow: '#0F1F1C',

  tabBar: '#FFFFFF',
  tabBarBorder: '#DFE9E6',
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

/**
 * Suvana brand typeface — Noto Serif (packages/branding/README.md), loaded in
 * app/_layout.tsx.
 *
 * Android ignores `fontWeight` once an explicit family is set, so weight is
 * carried by the family name itself and every entry below names the face it
 * wants. `fontWeight` is kept alongside so the system fallback still looks
 * right in the moment before the faces register.
 *
 * Anything with its own `fontSize` outside this scale must set `fontFamily`
 * too — there is no inheritance in React Native.
 */
export const fonts = {
  regular: 'NotoSerif_400Regular',
  semibold: 'NotoSerif_600SemiBold',
  bold: 'NotoSerif_700Bold',
} as const;

/** Type ramp. */
export const typography = {
  display: { fontSize: 34, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 19, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: -0.2 },
  subtitle: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: '600' as const },
  body: { fontSize: 15, fontFamily: fonts.regular, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontFamily: fonts.semibold, fontWeight: '600' as const },
  caption: { fontSize: 13, fontFamily: fonts.regular, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: '600' as const },
  overline: { fontSize: 11, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: 1.1 },
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
