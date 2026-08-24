/**
 * SoundGuard — Listen (home)
 * ─────────────────────────────────────────────────────────────────────────────
 * The live monitoring surface.
 *
 * Render discipline keeps this screen in step with the engine:
 *   • Engine state arrives through `useSyncExternalStore`, and the engine only
 *     notifies on a genuine change.
 *   • The orb and level meter read the microphone level from a shared value on
 *     the UI thread, so the visualiser never causes a React render.
 *   • Every control is synchronous, so the UI responds in the same frame as the
 *     tap rather than waiting on the audio pipeline.
 *
 * Layout is driven entirely by `useResponsive`. Nothing here assumes a 390 dp
 * width: gutters, gaps, the orb diameter and the demo row all derive from the
 * live viewport, so a 320 dp phone and a 21:9 panel both lay out cleanly.
 *
 * The header carries the mode's two exits — back to the dashboard, and straight
 * across to Live Transcribe. Both release the microphone before the destination
 * can ask for it; see `app/(guard)/_layout.tsx` and `utils/audioArbiter.ts`.
 */

import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { DetectionCard } from '@/components/DetectionCard';
import { LevelMeter, ListeningOrb } from '@/components/ListeningVisualizer';
import { AppButton, Card, SectionLabel, type IconName } from '@/components/ui';
import { alpha, radius, space, threatColors, typography as typeScale } from '@/constants/theme';
import { orbDiameter, useResponsive } from '@/hooks/useResponsive';
import { useEngineActions, useEngineState } from '@/providers/EngineProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import {
  SOUND_DISPLAY_NAMES,
  SOUND_ICONS,
  SOUND_SHORT_NAMES,
  type SoundLabel,
} from '@/utils/storage';

const DEMO_SOUNDS: { label: SoundLabel; caption: string }[] = [
  { label: 'door_wood_knock', caption: 'Routine' },
  { label: 'car_horn', caption: 'Attention' },
  { label: 'siren', caption: 'Critical' },
];

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  brandText: { flexShrink: 1 },
  brandName: { ...typeScale.heading, color: c.text },
  brandSub: { ...typeScale.caption, color: c.textMuted, marginTop: 1 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { ...typeScale.overline, textTransform: 'uppercase' },

  stage: { alignItems: 'center', paddingTop: space.sm },
  headline: { ...typeScale.title, color: c.text, textAlign: 'center', marginTop: space.lg },
  subline: {
    ...typeScale.body,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  meterWrap: { marginTop: space.lg, marginBottom: space.xs },

  block: { marginTop: space.lg },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  bannerText: { flex: 1, ...typeScale.caption, color: c.textSecondary, lineHeight: 18 },
  bannerAction: { ...typeScale.captionStrong, color: c.primary, paddingHorizontal: 6, paddingVertical: 4 },

  errorCard: { borderColor: alpha(c.critical, 0.35), backgroundColor: c.criticalSoft },
  errorText: { flex: 1, ...typeScale.caption, color: c.critical, lineHeight: 19 },

  idleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  idleText: { flex: 1, ...typeScale.caption, color: c.textMuted, lineHeight: 19 },

  controls: { marginTop: space.lg, gap: space.sm },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },

  // ── Gate diagnostics ──
  gauge: { marginTop: space.lg, gap: space.sm },
  gaugeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeTitle: { ...typeScale.overline, color: c.textMuted, textTransform: 'uppercase' },
  gaugeVerdict: { ...typeScale.overline, textTransform: 'uppercase' },
  gaugeTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: radius.pill },
  gaugeTicks: { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeTick: { ...typeScale.caption, color: c.textMuted, fontVariant: ['tabular-nums'] },

  // ── Demo ──
  demoChip: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: space.md,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  demoChipLabel: { ...typeScale.captionStrong, color: c.text, textAlign: 'center' },
  demoChipCaption: { fontSize: 10, color: c.textMuted, textAlign: 'center' },
  demoNote: { ...typeScale.caption, color: c.textMuted, marginTop: space.md, lineHeight: 18 },
}));

export default function ListenScreen() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  const state = useEngineState();
  const actions = useEngineActions();
  const { settings, update } = useSettings();

  const listening = state.status === 'listening';
  const starting = state.status === 'starting';
  const detection = state.detection;

  const orbSize = orbDiameter(r);

  const tone = useMemo(() => {
    if (detection) return threatColors(c, detection.threat);
    if (listening) return { fg: c.primary, bg: c.primarySoft, label: 'Listening' };
    return { fg: c.textMuted, bg: c.surfaceAlt, label: 'Paused' };
  }, [c, detection, listening]);

  const orbIcon: IconName = detection
    ? ((SOUND_ICONS[detection.label] ?? 'volume-high-outline') as IconName)
    : listening
      ? 'mic'
      : 'mic-off-outline';

  const headline = detection
    ? detection.name
    : state.calibrating
      ? 'Calibrating'
      : listening
        ? 'Listening'
        : starting
          ? 'Starting…'
          : 'Monitoring paused';

  const subline = detection
    ? detection.threat === 'critical'
      ? 'A critical sound is active in your environment.'
      : detection.threat === 'warning'
        ? 'Something nearby may need your attention.'
        : 'A routine sound was recognised nearby.'
    : state.calibrating
      ? 'Measuring the background level of this room so quiet sounds still stand out.'
      : listening
        ? state.modelStatus === 'ready'
          ? 'Your surroundings are being analysed on this device.'
          : 'Preparing the on-device recognition model…'
        : 'Start monitoring to be alerted to important sounds around you.';

  const statusLabel = starting
    ? 'Starting'
    : state.calibrating
      ? 'Calibrating'
      : listening
        ? state.analyzing
          ? 'Analysing'
          : 'Live'
        : state.modelStatus === 'loading'
          ? 'Loading'
          : 'Paused';

  const handleMute = useCallback(() => {
    if (!detection) return;
    if (settings.mutedSounds.includes(detection.label)) {
      actions.dismiss();
      return;
    }
    update('mutedSounds', [...settings.mutedSounds, detection.label]);
  }, [actions, detection, settings.mutedSounds, update]);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {});
  }, []);

  const goHome = useCallback(() => {
    // Popping to the dashboard unmounts this mode, which is what releases the
    // microphone. `replace` is the fallback for a cold deep link straight here,
    // where there is nothing on the stack to pop back to.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const switchToTranscribe = useCallback(() => {
    router.replace('/transcribe');
  }, []);

  const dismissedNames = state.dismissed.map((l) => SOUND_DISPLAY_NAMES[l]).join(', ');

  // Headroom above the trigger, as a 0–1 bar. 1.0 means the gate just opened.
  const excessDb = state.levelDb - state.floorDb;
  const gaugeRatio = Math.max(
    0,
    Math.min(1, state.triggerDb > 0 ? excessDb / state.triggerDb : 0),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: r.hPadding,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard"
              accessibilityHint="Stops monitoring and releases the microphone"
              onPress={goHome}
              hitSlop={8}
              android_ripple={{ color: alpha(c.text, 0.1), borderless: true }}
              style={({ pressed }) => [styles.brandMark, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name="chevron-back" size={19} color={c.primary} />
            </Pressable>
            <View style={styles.brandText}>
              <Text style={styles.brandName} numberOfLines={1}>
                SoundGuard
              </Text>
              {r.isCompact ? null : (
                <Text style={styles.brandSub} numberOfLines={1}>
                  On-device sound awareness
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: tone.bg, borderColor: alpha(tone.fg, 0.3) },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
              <Text style={[styles.statusPillText, { color: tone.fg }]}>{statusLabel}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to Live Transcribe"
              accessibilityHint="Releases the microphone here and opens live captions"
              onPress={switchToTranscribe}
              hitSlop={8}
              android_ripple={{ color: alpha(c.accent, 0.14), borderless: true }}
              style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name="chatbubbles-outline" size={17} color={c.accent} />
            </Pressable>
          </View>
        </View>

        {/* ── Stage ── */}
        <View style={styles.stage}>
          <ListeningOrb
            size={orbSize}
            color={tone.fg}
            icon={orbIcon}
            active={listening || starting}
          />

          <Text style={styles.headline} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {headline}
          </Text>
          <Text style={styles.subline}>{subline}</Text>

          <View style={styles.meterWrap}>
            <LevelMeter color={tone.fg} active={listening} width={r.contentWidth} />
          </View>
        </View>

        {/* ── Permission / model errors ── */}
        {state.error ? (
          <Card style={[styles.block, styles.errorCard]}>
            <View style={styles.idleRow}>
              <Ionicons name="alert-circle-outline" size={20} color={c.critical} />
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
            {state.permission === 'denied' ? (
              <AppButton
                label="Open system settings"
                icon="open-outline"
                variant="ghost"
                onPress={openSystemSettings}
                style={{ marginTop: space.md }}
                block
              />
            ) : null}
          </Card>
        ) : null}

        {/* ── Active detection, or the idle explainer ── */}
        {detection ? (
          <View style={styles.block}>
            <DetectionCard
              detection={detection}
              onDismiss={actions.dismiss}
              onMute={handleMute}
              onReset={actions.reset}
            />
          </View>
        ) : (
          <Card style={styles.block}>
            <View style={styles.idleRow}>
              <Ionicons
                name={listening ? 'shield-checkmark-outline' : 'information-circle-outline'}
                size={20}
                color={c.textMuted}
              />
              <Text style={styles.idleText}>
                {listening
                  ? 'Nothing unusual right now. Detected sounds appear here instantly, with controls to dismiss or mute them.'
                  : `Sensitivity is level ${settings.sensitivity} of 5. Adjust it any time in Settings — changes apply while listening.`}
              </Text>
            </View>
          </Card>
        )}

        {/* ── Dismissal banner ── */}
        {state.dismissed.length > 0 ? (
          <View style={[styles.banner, styles.block]}>
            <Ionicons name="eye-off-outline" size={16} color={c.textMuted} />
            <Text style={styles.bannerText}>Temporarily ignoring {dismissedNames}</Text>
            <Pressable onPress={actions.undoDismiss} hitSlop={8} accessibilityRole="button">
              <Text style={styles.bannerAction}>Undo</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Live gate gauge: makes the sensitivity setting observable ── */}
        {listening ? (
          <View style={styles.gauge}>
            <View style={styles.gaugeHead}>
              <Text style={styles.gaugeTitle}>Detection threshold</Text>
              <Text
                style={[
                  styles.gaugeVerdict,
                  { color: state.calibrating ? c.textMuted : state.gateOpen ? tone.fg : c.textMuted },
                ]}
              >
                {state.calibrating ? 'Learning room' : state.gateOpen ? 'Above threshold' : 'Below threshold'}
              </Text>
            </View>

            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${Math.round(gaugeRatio * 100)}%`,
                    backgroundColor: state.gateOpen ? tone.fg : c.borderStrong,
                  },
                ]}
              />
            </View>

            <View style={styles.gaugeTicks}>
              <Text style={styles.gaugeTick}>
                Room {Number.isFinite(state.floorDb) ? state.floorDb : -120} dB
              </Text>
              <Text style={styles.gaugeTick}>
                Now {Number.isFinite(state.levelDb) ? state.levelDb : -120} dB
              </Text>
              <Text style={styles.gaugeTick}>Needs +{state.triggerDb} dB</Text>
            </View>
          </View>
        ) : null}

        {/* ── Primary controls ── */}
        <View style={styles.controls}>
          <AppButton
            label={listening ? 'Stop monitoring' : 'Start monitoring'}
            icon={listening ? 'stop-circle-outline' : 'mic-outline'}
            variant={listening ? 'secondary' : 'primary'}
            size="lg"
            block
            disabled={starting}
            onPress={actions.toggle}
          />

          <View style={[styles.row, { gap: r.gap }]}>
            <AppButton
              label={r.isCompact ? 'Reset' : 'Reset listening'}
              icon="refresh"
              variant="ghost"
              onPress={actions.reset}
              style={styles.flex}
            />
            <AppButton
              label={settings.hapticFeedback ? 'Haptics on' : 'Haptics off'}
              icon={settings.hapticFeedback ? 'notifications' : 'notifications-off-outline'}
              variant="ghost"
              onPress={() => update('hapticFeedback', !settings.hapticFeedback)}
              style={styles.flex}
            />
          </View>
        </View>

        {/* ── Demo triggers ── */}
        <SectionLabel icon="flask-outline">Demo</SectionLabel>
        <View style={[styles.row, { gap: r.gap }]}>
          {DEMO_SOUNDS.map((demo) => (
            <Pressable
              key={demo.label}
              onPress={() => actions.simulate(demo.label)}
              accessibilityRole="button"
              accessibilityLabel={`Simulate ${SOUND_DISPLAY_NAMES[demo.label]}`}
              android_ripple={{ color: alpha(c.text, 0.07) }}
              style={({ pressed }) => [styles.demoChip, styles.flex, pressed && { opacity: 0.65 }]}
            >
              <Ionicons
                name={(SOUND_ICONS[demo.label] ?? 'volume-high-outline') as IconName}
                size={18}
                color={c.textSecondary}
              />
              <Text style={styles.demoChipLabel} numberOfLines={1}>
                {r.isNarrow ? SOUND_SHORT_NAMES[demo.label] : SOUND_DISPLAY_NAMES[demo.label]}
              </Text>
              <Text style={styles.demoChipCaption} numberOfLines={1}>
                {demo.caption}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.demoNote}>
          Simulated events run through the same state pipeline as live audio, so alerts, haptics and
          the visual flash can be demonstrated without producing the sound.
        </Text>
      </ScrollView>
    </View>
  );
}
