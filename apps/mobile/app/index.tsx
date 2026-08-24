/**
 * SoundGuard — Home dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * The app's front door, and the only screen that belongs to neither mode.
 *
 * It exists for three reasons:
 *
 *   1. The product is now two products. Environmental sound awareness and live
 *      speech transcription serve the same user in completely different
 *      situations, and burying one inside the other's tab bar would have made
 *      whichever lost the argument feel like a footnote.
 *
 *   2. It is a neutral corner for the hardware. Both modes want the one
 *      microphone; the dashboard wants none of it. Every route into a mode and
 *      every route out of one passes through a screen that provably holds
 *      nothing open, which is what makes "switching modes" a clean hand-over
 *      rather than a negotiation between two live capture sessions.
 *
 *   3. It makes the hand-over legible. The microphone strip below the header
 *      names whichever mode currently holds the device — normally "idle" here,
 *      because arriving on this screen releases it.
 *
 * Layout notes: the content container uses `flexGrow: 1` and the mode cards
 * flex, so a 21:9 Android panel distributes its extra height into the cards
 * instead of leaving a band of dead space, while a short screen simply scrolls.
 */

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { type IconName } from '@/components/ui';
import { alpha, elevation, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useEngineState } from '@/providers/EngineProvider';
import { useTranscribeState } from '@/providers/TranscribeProvider';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import { audioArbiter, OWNER_LABELS } from '@/utils/audioArbiter';
import { backgroundCapture } from '@/utils/backgroundService';
import { getDetectionLog } from '@/utils/storage';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    gap: space.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: alpha(c.primary, 0.25),
  },
  brandText: { flexShrink: 1 },
  greeting: { ...typeScale.caption, color: c.textMuted },
  brandName: { ...typeScale.heading, color: c.text, marginTop: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },

  // ── Microphone strip ──
  micStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xl,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  micDot: { width: 7, height: 7, borderRadius: 4 },
  micLabel: { flex: 1, ...typeScale.caption, color: c.textSecondary },
  micValue: { ...typeScale.captionStrong, color: c.text },

  // ── Section heading ──
  sectionTitle: { ...typeScale.title, color: c.text, marginTop: space.xxl },
  sectionSub: { ...typeScale.body, color: c.textSecondary, marginTop: 4, lineHeight: 21 },

  // ── Mode cards ──
  modes: { marginTop: space.xl, flexGrow: 1 },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
    padding: space.xl,
    overflow: 'hidden',
    ...elevation(2, c.shadow),
  },
  cardPressed: { opacity: 0.82 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardMark: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: { flex: 1 },
  cardEyebrow: { ...typeScale.overline, textTransform: 'uppercase' },
  cardTitle: { ...typeScale.heading, color: c.text, marginTop: 2 },
  cardBody: { ...typeScale.caption, color: c.textSecondary, lineHeight: 20, marginTop: space.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: c.textSecondary },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: c.border,
  },
  ctaText: { ...typeScale.bodyStrong, flexShrink: 1 },
  ctaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Quick links ──
  quickRow: { flexDirection: 'row', marginTop: space.xl },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.lg,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  quickText: { fontSize: 11, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },

  // ── Footer ──
  footer: { alignItems: 'center', gap: 4, marginTop: space.xxl },
  footerTitle: { ...typeScale.captionStrong, color: c.textSecondary },
  footerText: { ...typeScale.caption, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
}));

type ModeCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  icon: IconName;
  tint: string;
  tintSoft: string;
  chips: { icon: IconName; label: string }[];
  cta: string;
  onPress: () => void;
  /** Cards flex to share leftover height on tall screens. */
  grow: boolean;
  minHeight: number;
};

function ModeCard({
  eyebrow,
  title,
  body,
  icon,
  tint,
  tintSoft,
  chips,
  cta,
  onPress,
  grow,
  minHeight,
}: ModeCardProps) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityHint={cta}
      onPress={onPress}
      android_ripple={{ color: alpha(tint, 0.12) }}
      style={({ pressed }) => [
        styles.card,
        { borderColor: alpha(tint, 0.28), minHeight },
        grow && { flex: 1 },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.cardMark, { backgroundColor: tintSoft }]}>
          <Ionicons name={icon} size={24} color={tint} />
        </View>
        <View style={styles.cardTitles}>
          <Text style={[styles.cardEyebrow, { color: tint }]} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>

      <Text style={styles.cardBody}>{body}</Text>

      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip.label} style={styles.chip}>
            <Ionicons name={chip.icon} size={11} color={tint} />
            <Text style={styles.chipText}>{chip.label}</Text>
          </View>
        ))}
      </View>

      {/* `marginTop: auto` pins the call to action to the bottom, so a card that
          stretched to fill a tall screen grows its whitespace, not its gap. */}
      <View style={[styles.cta, { marginTop: 'auto' }]}>
        <Text style={[styles.ctaText, { color: tint }]} numberOfLines={1}>
          {cta}
        </Text>
        <View style={[styles.ctaArrow, { backgroundColor: tintSoft }]}>
          <Ionicons name="arrow-forward" size={17} color={tint} />
        </View>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  const engine = useEngineState();
  const transcribe = useTranscribeState();

  const { owner } = useSyncExternalStore(
    audioArbiter.subscribe,
    audioArbiter.getState,
    audioArbiter.getState,
  );

  const [eventCount, setEventCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const log = await getDetectionLog();
        if (cancelled) return;
        setEventCount(log.length);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const hello = useMemo(greeting, []);

  // Side by side once there is room for two readable columns; stacked below it.
  const twoColumn = r.isWide && r.width >= 720;
  // Cards only stretch when they are stacked — a row already fills the width.
  const grow = !twoColumn;
  const cardMinHeight = r.isShort ? 210 : r.isVeryTall ? 250 : 232;

  const soundguardChips = [
    { icon: 'hardware-chip-outline' as IconName, label: 'On-device AI' },
    { icon: 'hand-left-outline' as IconName, label: 'Haptic signatures' },
    ...(backgroundCapture.available
      ? [{ icon: 'moon-outline' as IconName, label: 'Runs in background' }]
      : []),
    { icon: 'shield-half-outline' as IconName, label: 'Threat escalation' },
  ];
  if (eventCount !== null && eventCount > 0) {
    soundguardChips.push({
      icon: 'time-outline' as IconName,
      label: `${eventCount} logged`,
    });
  }

  const micLabel = owner ? `In use — ${OWNER_LABELS[owner]}` : 'Idle — released';
  const micTone = owner ? (owner === 'soundguard' ? c.primary : c.accent) : c.textMuted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: r.hPadding,
          paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="pulse" size={21} color={c.primary} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.greeting} numberOfLines={1}>
                {hello}
              </Text>
              <Text style={styles.brandName} numberOfLines={1}>
                SoundGuard
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            hitSlop={6}
            android_ripple={{ color: alpha(c.text, 0.08), borderless: true }}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="settings-outline" size={19} color={c.textSecondary} />
          </Pressable>
        </View>

        {/* ── Hardware status. Normally idle here: arriving releases the mic. ── */}
        <View style={styles.micStrip}>
          <View style={[styles.micDot, { backgroundColor: micTone }]} />
          <Text style={styles.micLabel} numberOfLines={1}>
            Microphone
          </Text>
          <Text style={[styles.micValue, { color: micTone }]} numberOfLines={1}>
            {micLabel}
          </Text>
        </View>

        {/* ── Modes ── */}
        <Text style={styles.sectionTitle}>Choose a mode</Text>
        <Text style={styles.sectionSub}>
          Only one mode uses the microphone at a time. Leaving a mode releases it immediately.
        </Text>

        <View style={[styles.modes, twoColumn ? { flexDirection: 'row' } : null, { gap: r.gap + 6 }]}>
          <ModeCard
            eyebrow="Mode 1"
            title="SoundGuard"
            body="Recognises important sounds around you — knocks, sirens, breaking glass — and turns them into something you can see and feel."
            icon="pulse"
            tint={c.primary}
            tintSoft={c.primarySoft}
            chips={soundguardChips}
            cta={
              engine.modelStatus === 'ready'
                ? 'Open sound detection'
                : engine.modelStatus === 'error'
                  ? 'Open — model unavailable'
                  : 'Open sound detection'
            }
            onPress={() => router.push('/listen')}
            grow={grow}
            minHeight={cardMinHeight}
          />

          <ModeCard
            eyebrow="Mode 2"
            title="Live Transcribe"
            body="Turns speech into large, high-contrast text in real time — in Sinhala, Tamil or English — and lets you type an answer to show back."
            icon="chatbubbles"
            tint={c.accent}
            tintSoft={c.accentSoft}
            chips={[
              { icon: 'language-outline', label: 'සිංහල · தமிழ் · English' },
              { icon: 'chatbox-ellipses-outline', label: 'Type a reply' },
              { icon: 'sync-outline', label: 'Flip for two-way' },
              ...(transcribe.available
                ? []
                : [{ icon: 'alert-circle-outline' as IconName, label: 'Unavailable here' }]),
            ]}
            cta="Open live captions"
            onPress={() => router.push('/transcribe')}
            grow={grow}
            minHeight={cardMinHeight}
          />
        </View>

        {/* ── Quick links ── */}
        <View style={[styles.quickRow, { gap: r.gap }]}>
          {(
            [
              { icon: 'time-outline', label: 'History', href: '/history' },
              { icon: 'people-outline', label: 'Safety Circle', href: '/circle' },
              { icon: 'options-outline', label: 'Settings', href: '/settings' },
            ] as { icon: IconName; label: string; href: '/history' | '/circle' | '/settings' }[]
          ).map((link) => (
            <Pressable
              key={link.href}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              onPress={() => router.push(link.href)}
              android_ripple={{ color: alpha(c.text, 0.07) }}
              style={({ pressed }) => [styles.quick, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={link.icon} size={19} color={c.textSecondary} />
              <Text style={styles.quickText} numberOfLines={1}>
                {link.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Everything stays on this device</Text>
          <Text style={styles.footerText}>
            Sound recognition runs on-device. Speech recognition uses your phone&apos;s own engine.
            {'\n'}Research build — R26-SE-019
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
