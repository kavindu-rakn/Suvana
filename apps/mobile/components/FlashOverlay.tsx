/**
 * SoundGuard — Visual alert flash
 * ─────────────────────────────────────────────────────────────────────────────
 * A full-screen strobe for critical detections: the accessible substitute for a
 * camera-LED flash. It needs no extra native module, so the existing
 * development build keeps working.
 *
 * ── Why it was dead, and what changed ────────────────────────────────────────
 *
 *   1. The setting was off for everyone. The settings migration folded the v1
 *      `flashlight` key (default false) into `visualFlash`, so every existing
 *      install started with the strobe disabled. Fixed in storage.ts.
 *
 *   2. Testing it hid it. Simulating a siren pre-loaded the critical streak to
 *      the escalation threshold, so SosWatcher pushed the full-screen SOS route
 *      in the same frame the strobe started. Fixed in soundEngine.simulate().
 *
 *   3. The SOS route was a native `fullScreenModal`, which opens its own
 *      container above the root view — nothing rendered here could ever appear
 *      over it. It is now an ordinary faded card in the same hierarchy.
 *
 * The component no longer decides *whether* to flash. The engine owns that
 * policy and emits an explicit `flash` event, which means the rule is stated
 * once, next to the detection logic, and can be exercised directly by the
 * "Test visual flash" control in Settings.
 *
 * A white core over the colour wash makes the strobe unmistakable in both
 * themes and at any screen brightness; `pointerEvents="none"` guarantees it can
 * never swallow a tap.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useEngineActions } from '@/providers/EngineProvider';
import { useColors } from '@/providers/ThemeProvider';

/** Three hard pulses then a fade — legible without being seizure-inducing. */
const ON = { duration: 85, easing: Easing.linear } as const;
const OFF = { duration: 120, easing: Easing.linear } as const;
const TAIL = { duration: 260, easing: Easing.out(Easing.quad) } as const;

export function FlashOverlay() {
  const { onEvent } = useEngineActions();
  const c = useColors();

  const wash = useSharedValue(0);
  const core = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = onEvent((event) => {
      if (event.type !== 'flash') return;

      cancelAnimation(wash);
      cancelAnimation(core);

      wash.value = withSequence(
        withTiming(0.92, ON),
        withTiming(0.12, OFF),
        withTiming(0.92, ON),
        withTiming(0.12, OFF),
        withTiming(0.92, ON),
        withTiming(0, TAIL),
      );
      core.value = withSequence(
        withTiming(0.85, ON),
        withTiming(0, OFF),
        withTiming(0.85, ON),
        withTiming(0, OFF),
        withTiming(0.85, ON),
        withTiming(0, TAIL),
      );
    });

    return () => {
      unsubscribe();
      cancelAnimation(wash);
      cancelAnimation(core);
    };
  }, [onEvent, wash, core]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  const coreStyle = useAnimatedStyle(() => ({ opacity: core.value }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: c.critical }, washStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.core, coreStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // zIndex for iOS/web ordering, elevation for Android's sibling stacking.
  layer: { zIndex: 999, elevation: 999 },
  core: { backgroundColor: '#FFFFFF' },
});
