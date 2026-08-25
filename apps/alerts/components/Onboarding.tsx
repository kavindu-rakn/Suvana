/**
 * SoundGuard — First-run experience
 * ─────────────────────────────────────────────────────────────────────────────
 * A four-page introduction shown once, before the tab bar is ever reachable.
 *
 * Rendered by the `app/onboarding.tsx` route, which the root layout gates with
 * <Stack.Protected guard={!onboardingComplete}>. A guarded screen is absent from
 * the route tree entirely, so the router resolves straight here on first run
 * instead of mounting the tabs and redirecting — no redirect race, and no flash
 * of the wrong screen. Completing the flow just flips the setting; the router
 * removes this route on its own.
 *
 * The final page requests microphone permission in context, with the reason
 * already explained, which is both better UX and a materially better grant rate
 * than prompting cold on first tap.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { alpha, fonts, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { requestMicrophonePermission } from '@/utils/soundEngine';
import { AppButton, type IconName } from './ui';

type Page = {
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
};

const PAGES: Page[] = [
  {
    icon: 'ear-outline',
    eyebrow: 'Welcome',
    title: 'Sound awareness,\nwithout the noise',
    body: 'Suvana listens to your surroundings and turns the sounds that matter into something you can see and feel.',
  },
  {
    icon: 'hardware-chip-outline',
    eyebrow: 'On-device intelligence',
    title: 'Recognition that\nnever leaves your phone',
    body: 'A compact neural network classifies audio locally, in real time.',
    points: [
      'Seven trained sound classes, from door knocks to sirens',
      'No cloud upload, no account, no recording is ever stored',
      'Works fully offline, including in airplane mode',
    ],
  },
  {
    icon: 'hand-left-outline',
    eyebrow: 'A vibration alphabet',
    title: 'Tell sounds apart\nwithout looking',
    body: 'Every sound has its own rhythm, so you know what happened before you reach for the phone.',
    points: [
      'A siren is long and unbroken; a knock is three even taps',
      'The same rhythms work when the app is closed or the screen is off',
      'Learn them any time in Settings → Vibration dictionary',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    eyebrow: 'Safety net',
    title: 'Help, when a\nsound means danger',
    body: 'A critical sound such as breaking glass or a siren takes over the screen with a countdown. Confirm you are safe and it stops. Say nothing, and Suvana messages the contacts you choose, with your location.',
  },
];

const useStyles = makeStyles((c) => ({
  // A real route now, so it is an ordinary full-height screen rather than an
  // absolutely positioned overlay competing with the navigator for z-order.
  root: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    height: 52,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  brandText: { ...typeScale.captionStrong, color: c.textSecondary, letterSpacing: 0.4 },
  skip: { ...typeScale.captionStrong, color: c.textMuted, paddingVertical: 8, paddingHorizontal: 4 },

  pager: { flex: 1 },
  // Each page scrolls vertically inside the horizontal pager, so long copy on a
  // short screen scrolls instead of clipping.
  page: { paddingVertical: space.xl, flexGrow: 1, justifyContent: 'center' },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha(c.primary, 0.25),
    marginBottom: space.xxl,
  },
  eyebrow: { ...typeScale.overline, color: c.primary, textTransform: 'uppercase', marginBottom: space.sm },
  title: { fontWeight: '700', letterSpacing: -0.9, color: c.text },
  body: { ...typeScale.body, color: c.textSecondary, lineHeight: 23, marginTop: space.md },

  points: { marginTop: space.xl, gap: space.md },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  pointDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1, ...typeScale.caption, color: c.textSecondary, lineHeight: 20 },

  footer: { gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { height: 6, borderRadius: 3, backgroundColor: c.borderStrong },
  dotActive: { backgroundColor: c.primary },
  privacy: { ...typeScale.caption, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
}));

export function Onboarding() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { width } = r;
  const { update } = useSettings();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const isLast = index === PAGES.length - 1;
  // The headlines are two or three lines; on a 320 dp screen 32 pt wraps badly.
  const titleSize = r.isCompact ? 25 : r.isNarrow ? 28 : 32;

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
      setIndex(Math.min(PAGES.length - 1, Math.max(0, next)));
    },
    [width],
  );

  const finish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Ask in context, on the page that explains why. A denial is not fatal —
      // the home screen surfaces a recovery prompt.
      await requestMicrophonePermission();
    } catch {
      /* ignore */
    }
    update('onboardingComplete', true);
  }, [busy, update]);

  const advance = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }, [finish, index, isLast, width]);

  const skip = useCallback(() => {
    update('onboardingComplete', true);
  }, [update]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.topBar, { paddingHorizontal: r.hPadding }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Ionicons name="pulse" size={15} color={c.primary} />
          </View>
          <Text style={styles.brandText}>SOUNDGUARD</Text>
        </View>
        {!isLast ? (
          <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={10}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {PAGES.map((page) => (
          <ScrollView
            key={page.title}
            style={{ width }}
            contentContainerStyle={[styles.page, { paddingHorizontal: r.hPadding }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={page.icon} size={38} color={c.primary} />
            </View>

            <Text style={styles.eyebrow}>{page.eyebrow}</Text>
            <Text style={[styles.title, { fontSize: titleSize, fontFamily: fonts.regular, lineHeight: titleSize * 1.22 }]}>
              {page.title}
            </Text>
            <Text style={styles.body}>{page.body}</Text>

            {page.points ? (
              <View style={styles.points}>
                {page.points.map((point) => (
                  <View key={point} style={styles.point}>
                    <View style={styles.pointDot}>
                      <Ionicons name="checkmark" size={12} color={c.primary} />
                    </View>
                    <Text style={styles.pointText}>{point}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: r.hPadding,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
          },
        ]}
      >
        <View style={styles.dots}>
          {PAGES.map((page, i) => (
            <View
              key={page.title}
              style={[styles.dot, { width: i === index ? 22 : 6 }, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <AppButton
          label={isLast ? 'Enable microphone & start' : 'Continue'}
          icon={isLast ? 'mic-outline' : 'arrow-forward'}
          size="lg"
          block
          disabled={busy}
          onPress={advance}
        />

        {isLast ? (
          <Text style={styles.privacy}>
            Audio is analysed on this device only. Nothing is uploaded or saved.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
