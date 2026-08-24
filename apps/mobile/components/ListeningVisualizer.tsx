/**
 * SoundGuard — Listening visualiser
 * ─────────────────────────────────────────────────────────────────────────────
 * The orb and the level meter both read the microphone level straight from a
 * Reanimated shared value and animate on the UI thread. Neither one causes a
 * React render, so the visualiser stays perfectly smooth even while the JS
 * thread is busy extracting features.
 *
 * Every looping animation is gated on `reduceMotion`, which is a real user
 * setting rather than decoration.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { alpha, radius } from '@/constants/theme';
import { useColors, useTheme } from '@/providers/ThemeProvider';
import { useAudioLevel } from '@/providers/EngineProvider';

const RING_COUNT = 3;
const RING_DURATION = 2800;

// ─── Expanding sonar ring ────────────────────────────────────────────────────

const Ring = memo(function Ring({
  index,
  size,
  color,
  active,
}: {
  index: number;
  size: number;
  color: string;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (!active) {
      progress.value = withTiming(0, { duration: 240 });
      return;
    }

    // Identical cycle for every ring, offset in time — an evenly spaced sonar.
    progress.value = 0;
    progress.value = withDelay(
      (index * RING_DURATION) / RING_COUNT,
      withRepeat(
        withTiming(1, { duration: RING_DURATION, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(progress);
  }, [active, index, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{ scale: interpolate(p, [0, 1], [0.42, 1]) }],
      opacity: active ? interpolate(p, [0, 0.12, 1], [0, 0.34, 0]) : 0,
    };
  }, [active]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        style,
      ]}
    />
  );
});

// ─── Orb ─────────────────────────────────────────────────────────────────────

export const ListeningOrb = memo(function ListeningOrb({
  size,
  color,
  icon,
  active,
}: {
  size: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
}) {
  const c = useColors();
  const { reduceMotion } = useTheme();
  const level = useAudioLevel();

  const breathe = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breathe);
    if (!active || reduceMotion) {
      breathe.value = withTiming(0, { duration: 300 });
      return;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(breathe);
  }, [active, reduceMotion, breathe]);

  const glowStyle = useAnimatedStyle(() => {
    const pulse = interpolate(breathe.value, [0, 1], [0, 0.08]);
    const lvl = active ? level.value : 0;
    return {
      transform: [{ scale: 1 + pulse + lvl * 0.16 }],
      opacity: 0.16 + pulse * 1.2 + lvl * 0.5,
    };
  }, [active]);

  const discStyle = useAnimatedStyle(() => {
    const lvl = active ? level.value : 0;
    return { transform: [{ scale: 1 + lvl * 0.05 }] };
  }, [active]);

  const glowSize = size * 0.62;
  const discSize = size * 0.44;
  const showRings = active && !reduceMotion;

  return (
    <View style={[styles.orbWrap, { width: size, height: size }]}>
      {/* Static range rings — quiet structure, visible in both schemes. */}
      {[0.58, 0.82, 1].map((scale) => {
        const s = size * scale;
        return (
          <View
            key={`static-${scale}`}
            pointerEvents="none"
            style={[
              styles.staticRing,
              { width: s, height: s, borderRadius: s / 2, borderColor: c.border },
            ]}
          />
        );
      })}

      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring key={`pulse-${i}`} index={i} size={size} color={color} active={showRings} />
      ))}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: alpha(color, 0.55),
          },
          glowStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.disc,
          {
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
            backgroundColor: c.surface,
            borderColor: alpha(color, 0.45),
          },
          discStyle,
        ]}
      >
        <Ionicons name={icon} size={Math.round(discSize * 0.38)} color={color} />
      </Animated.View>
    </View>
  );
});

// ─── Level meter ─────────────────────────────────────────────────────────────

/** Bar pitch in dp (3 dp bar + 4 dp gap). */
const BAR_PITCH = 7;
const MIN_BARS = 13;
const MAX_BARS = 33;

/** Fill the available width without ever overflowing it. */
function barCountFor(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 21;
  return Math.max(MIN_BARS, Math.min(MAX_BARS, Math.floor(width / BAR_PITCH)));
}

const Bar = memo(function Bar({
  index,
  total,
  color,
  active,
  reduceMotion,
  wave,
}: {
  index: number;
  total: number;
  color: string;
  active: boolean;
  reduceMotion: boolean;
  wave: SharedValue<number>;
}) {
  const level = useAudioLevel();

  // Bars near the centre react more strongly — reads as a waveform, not a
  // row of equal blocks.
  const half = Math.max(1, (total - 1) / 2);
  const centreBias = 1 - Math.abs(index - half) / half;
  const weight = 0.35 + centreBias * 0.65;
  const phase = index / total;

  const style = useAnimatedStyle(() => {
    if (!active) {
      return { transform: [{ scaleY: 0.08 }], opacity: 0.35 };
    }
    const lvl = level.value;
    const ripple = reduceMotion
      ? 1
      : 0.55 + 0.45 * Math.abs(Math.sin(Math.PI * (wave.value + phase)));
    const height = 0.08 + lvl * weight * ripple * 0.92;
    return {
      transform: [{ scaleY: Math.max(0.08, Math.min(1, height)) }],
      opacity: 0.45 + lvl * 0.55,
    };
  }, [active, reduceMotion]);

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
});

export const LevelMeter = memo(function LevelMeter({
  color,
  active,
  width,
}: {
  color: string;
  active: boolean;
  /** Available content width; the bar count adapts so it never overflows. */
  width?: number;
}) {
  const { reduceMotion } = useTheme();
  const wave = useSharedValue(0);
  const total = barCountFor(width ?? 0);

  useEffect(() => {
    cancelAnimation(wave);
    if (!active || reduceMotion) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(wave);
  }, [active, reduceMotion, wave]);

  return (
    <View style={styles.meter} pointerEvents="none" accessibilityElementsHidden>
      {Array.from({ length: total }).map((_, i) => (
        <Bar
          key={i}
          index={i}
          total={total}
          color={color}
          active={active}
          reduceMotion={reduceMotion}
          wave={wave}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  orbWrap: { alignItems: 'center', justifyContent: 'center' },
  staticRing: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth * 2 },
  ring: { position: 'absolute', borderWidth: 1.5 },
  glow: { position: 'absolute' },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    gap: 4,
  },
  bar: {
    width: 3,
    height: 34,
    borderRadius: radius.pill,
  },
});
