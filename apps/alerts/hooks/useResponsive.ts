/**
 * SoundGuard — Responsive layout metrics
 * ─────────────────────────────────────────────────────────────────────────────
 * Android phones are far narrower and far taller than the 390 × 844 reference
 * most layouts are eyeballed against. A 360 dp handset with a 20:9 aspect ratio
 * loses 13% of its horizontal space at the same fixed 24 dp gutters, which is
 * exactly enough to start truncating three-across button rows.
 *
 * Every screen derives its horizontal rhythm from here instead of hard-coding
 * a gutter, so nothing squeezes on narrow devices and nothing stretches into an
 * unreadable line length on tablets.
 *
 * Breakpoints are in dp (density-independent), so they describe real physical
 * width rather than pixel count:
 *
 *   < 340   compact  — small/older handsets, 3-across rows must go icon-first
 *   < 392   narrow   — the common Android 360 dp class
 *   < 600   regular  — large phones
 *   >= 600  wide     — tablets and foldables, content is centred and capped
 */

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Layout is designed against this width and scaled from it. */
const REFERENCE_WIDTH = 390;

/** Layout is designed against this height and scaled from it vertically. */
const REFERENCE_HEIGHT = 844;

/** Longest comfortable measure for body text; wider screens centre instead. */
const CONTENT_MAX_WIDTH = 560;

export type Responsive = {
  width: number;
  height: number;
  /** width / height — above ~2.0 counts as a tall Android panel. */
  aspect: number;

  isCompact: boolean;
  isNarrow: boolean;
  isWide: boolean;
  /** Vertically cramped: small phones in landscape, or split-screen. */
  isShort: boolean;
  /** Tall, narrow panels — the 20:9 and 21:9 Android class. */
  isTall: boolean;
  /** The 21:9+ class, where fixed-height stacks leave visible dead space. */
  isVeryTall: boolean;

  /** Minimum edge inset for this width class. */
  gutter: number;
  /**
   * Horizontal padding to apply to a full-bleed scroll container. On wide
   * screens this grows so content stays centred at CONTENT_MAX_WIDTH.
   */
  hPadding: number;
  /** Actual usable content width after padding. */
  contentWidth: number;

  /** Gap between items in a row, tightened on narrow screens. */
  gap: number;

  /**
   * Scale a fixed dimension with screen width, clamped so text never becomes
   * comically small on a 320 dp device or bloated on a tablet.
   */
  scale: (value: number) => number;

  /**
   * Scale a vertical dimension with screen *height*.
   *
   * Horizontal scaling is the wrong tool for vertical rhythm: a 20:9 handset is
   * no wider than a 16:9 one but is 25% taller, so `scale()` returns 1.0 for
   * both and any stack sized with it leaves a band of dead space at the bottom
   * of the taller device. Clamped, so a tablet does not inflate a caption into
   * a poster and a split-screen window does not crush it.
   */
  vScale: (value: number) => number;
};

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo<Responsive>(() => {
    const isCompact = width < 340;
    const isNarrow = width < 392;
    const isWide = width >= 600;
    const isShort = height < 700;
    const aspect = height / Math.max(1, width);
    const isTall = aspect >= 1.95;
    const isVeryTall = aspect >= 2.1;

    const gutter = isCompact ? 14 : isNarrow ? 16 : 20;
    // Centre and cap on wide screens; otherwise just use the gutter.
    const hPadding = Math.max(gutter, Math.floor((width - CONTENT_MAX_WIDTH) / 2));
    const contentWidth = Math.max(240, width - hPadding * 2);

    const gap = isCompact ? 6 : isNarrow ? 8 : 10;

    const factor = Math.min(1.1, Math.max(0.88, width / REFERENCE_WIDTH));
    const scale = (value: number) => Math.round(value * factor);

    const vFactor = Math.min(1.18, Math.max(0.82, height / REFERENCE_HEIGHT));
    const vScale = (value: number) => Math.round(value * vFactor);

    return {
      width,
      height,
      aspect,
      isCompact,
      isNarrow,
      isWide,
      isShort,
      isTall,
      isVeryTall,
      gutter,
      hPadding,
      contentWidth,
      gap,
      scale,
      vScale,
    };
  }, [width, height]);
}

/**
 * Diameter for the listening orb.
 *
 * Constrained by width *and* height: on a tall narrow panel the width alone
 * would allow a circle that pushes the primary control below the fold, and on
 * a short screen it would swallow the whole viewport.
 */
export function orbDiameter(r: Responsive): number {
  const byWidth = r.contentWidth - (r.isCompact ? 56 : 72);
  const byHeight = r.height * (r.isShort ? 0.22 : r.isTall ? 0.27 : 0.3);
  return Math.round(Math.max(140, Math.min(byWidth, byHeight, 250)));
}
