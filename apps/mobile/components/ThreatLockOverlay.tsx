/**
 * SoundGuard — Critical threat lock
 * ─────────────────────────────────────────────────────────────────────────────
 * The screen that will not go away.
 *
 * When `threatEscalation` arms, this takes over the display from wherever the
 * user happens to be and stays there until they answer. It is deliberately the
 * least dismissible surface in the app:
 *
 *   • It is a sibling of the navigator, not a route, so it covers every screen
 *     including modals and cannot be popped by a back gesture or a deep link.
 *   • The Android hardware back button is swallowed while it is up.
 *   • It captures every touch, so nothing behind it can be operated by accident.
 *   • It holds the screen awake, because a countdown nobody can see is not a
 *     countdown.
 *
 * ── Three ways out, all of them deliberate ───────────────────────────────────
 *
 *   I'M SAFE       cancels. The largest control on the screen, at the bottom
 *                  where a thumb already is.
 *   SEND NOW       skips the wait. Someone who knows they need help should not
 *                  have to watch a timer run down.
 *   doing nothing  sends. This is the whole point: silence is treated as "the
 *                  user cannot answer", not as "everything is fine".
 *
 * ── Why the palette is fixed ─────────────────────────────────────────────────
 *
 * Same reasoning as the SOS screen. This is read under stress, possibly by
 * someone who has never seen the app, and a safety surface that changes
 * appearance with the theme is one people have to re-learn at the worst possible
 * moment.
 */

import React, { useCallback, useEffect, useSyncExternalStore } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';
import { signatureForSound } from '@/utils/hapticSignatures';
import { soundEngine } from '@/utils/soundEngine';
import { threatEscalation } from '@/utils/threatEscalation';
import { SOUND_ICONS } from '@/utils/storage';
import { type IconName } from './ui';

// Fixed emergency palette — intentionally scheme-independent.
const INK = '#180509';
const DEEP = '#4A0A15';
const GLOW = '#FF4D6A';
const SAFE = '#34D399';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.62)';
const FAINT = 'rgba(255,255,255,0.22)';

const KEEP_AWAKE_TAG = 'soundguard-threat-lock';

export function ThreatLockOverlay() {
  const state = useSyncExternalStore(
    threatEscalation.subscribe,
    threatEscalation.getState,
    threatEscalation.getState,
  );
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  const active = state.phase !== 'idle';

  // ── Hand-off into the SOS flow ──
  // Driven by the controller's event rather than by watching `phase`, so the
  // navigation happens exactly once even if this component re-renders or
  // remounts mid-countdown.
  useEffect(() => {
    return threatEscalation.onEvent((event) => {
      if (event.type !== 'fire') return;

      // Ordering matters, and all three run in one synchronous block so React
      // commits them together — there is never a frame with neither surface up.
      //
      //   1. Queue the SOS route.
      //   2. Hand off, which clears the lock and blocks re-arming.
      //   3. Only then stop the engine. `stop()` also resets the protocol, and
      //      doing it first would cancel the final haptic mid-pattern.
      const drill = event.drill ? '&drill=1' : '';
      router.push(`/sos-alert?auto=1${drill}` as never);
      threatEscalation.handOff();

      // Free the microphone before the SOS screen resolves a location and opens
      // the SMS composer. Leaving capture running there would keep re-detecting
      // the sound that started all this, behind a screen that cannot show it.
      soundEngine.stop();
    });
  }, []);

  // ── Swallow the Android back button ──
  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [active]);

  // ── Keep the screen lit for the whole countdown ──
  useEffect(() => {
    if (!active) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [active]);

  // ── Urgency pulse ──
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse);
    if (!active || reduceMotion) {
      pulse.value = active ? 0.5 : 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse, reduceMotion]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.28, 0.72]),
  }));

  const handleSafe = useCallback(() => {
    threatEscalation.cancel();
  }, []);

  const handleSendNow = useCallback(() => {
    // Same ordering as the automatic path, for the same reasons.
    const drill = threatEscalation.getState().drill ? '&drill=1' : '';
    router.push(`/sos-alert?auto=1${drill}` as never);
    threatEscalation.handOff();
    soundEngine.stop();
  }, []);

  if (!active) return null;

  const firing = state.phase === 'firing';
  const icon: IconName = state.label
    ? ((SOUND_ICONS[state.label] ?? 'warning') as IconName)
    : 'warning';
  const signature = state.label ? signatureForSound(state.label) : null;

  const timerSize = Math.round(Math.min(132, Math.max(72, r.contentWidth * 0.34)));
  const progressPercent = Math.round(Math.max(0, Math.min(1, state.progress)) * 100);

  return (
    <View
      // `absoluteFill` + a high elevation puts this above every route. The flash
      // overlay deliberately sits higher still: a strobe over the warning is
      // legible, a warning over the strobe would hide it.
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents="auto"
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, washStyle]} pointerEvents="none" />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: r.hPadding,
            paddingTop: insets.top + (r.isShort ? space.lg : space.xxl),
            paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
          },
        ]}
      >
        {/* ── What happened ── */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name={icon} size={30} color={GLOW} />
          </View>

          <Text style={styles.eyebrow}>
            {state.drill ? 'Drill · critical sound' : 'Critical sound detected'}
          </Text>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {state.name}
          </Text>

          {signature ? (
            <View style={styles.signaturePill}>
              <Ionicons name="pulse" size={12} color={MUTED} />
              <Text style={styles.signatureText} numberOfLines={1}>
                {signature.rhythm}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── How long is left ── */}
        <View style={styles.centre}>
          <Text style={[styles.timer, { fontSize: timerSize }]} allowFontScaling={false}>
            {firing ? '0' : state.secondsLeft}
          </Text>
          <Text style={styles.timerCaption}>
            {firing
              ? 'Sending your SOS now…'
              : `second${state.secondsLeft === 1 ? '' : 's'} to confirm you are safe`}
          </Text>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.explain}>
            {state.drill
              ? 'This is a rehearsal from the demo controls. The full flow will run, but no message will be sent.'
              : 'If you do not respond, Suvana will message your Safety Circle with your location.'}
          </Text>

          {state.wasBackgrounded ? (
            <View style={styles.noticeRow}>
              <Ionicons name="phone-portrait-outline" size={13} color={MUTED} />
              <Text style={styles.noticeText}>
                Detected while Suvana was in the background.
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── The way out ── */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I am safe. Cancel this alert."
            accessibilityHint="Stops the countdown. No message will be sent."
            onPress={handleSafe}
            disabled={firing}
            style={({ pressed }) => [
              styles.safeButton,
              pressed && { opacity: 0.82 },
              firing && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="shield-checkmark" size={24} color={INK} />
            <Text style={styles.safeLabel}>I&apos;m safe — cancel</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send the SOS now, without waiting"
            onPress={handleSendNow}
            disabled={firing}
            style={({ pressed }) => [styles.sendButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={GLOW} />
            <Text style={styles.sendLabel}>Send SOS now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Below FlashOverlay (999) and above every route.
  root: { backgroundColor: INK, zIndex: 800, elevation: 800 },
  wash: { backgroundColor: DEEP },

  content: { flex: 1, justifyContent: 'space-between' },

  header: { alignItems: 'center' },
  badge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: GLOW,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  eyebrow: {
    ...typeScale.overline,
    color: GLOW,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginTop: space.lg,
    textAlign: 'center',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 6,
  },
  signaturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: FAINT,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  signatureText: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.4 },

  centre: { alignItems: 'center', alignSelf: 'stretch' },
  timer: {
    fontWeight: '200',
    color: WHITE,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerCaption: {
    ...typeScale.caption,
    color: MUTED,
    textAlign: 'center',
    marginTop: -4,
  },
  track: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    marginTop: space.xl,
  },
  fill: { height: '100%', backgroundColor: GLOW, borderRadius: radius.pill },
  explain: {
    ...typeScale.caption,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: space.lg,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.md,
  },
  noticeText: { fontSize: 11, color: MUTED },

  footer: { alignSelf: 'stretch', gap: space.md },
  safeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    // Deliberately oversized. This is pressed by someone who has just been
    // startled, possibly while walking, possibly one-handed.
    minHeight: 76,
    borderRadius: radius.lg,
    backgroundColor: SAFE,
  },
  safeLabel: { fontSize: 19, fontWeight: '800', color: INK, letterSpacing: 0.2 },

  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,77,106,0.45)',
    backgroundColor: 'rgba(255,77,106,0.12)',
  },
  sendLabel: { ...typeScale.bodyStrong, color: GLOW },
});
