/**
 * SoundGuard — Settings
 * ─────────────────────────────────────────────────────────────────────────────
 * Every control on this screen is bound to real behaviour. Nothing here is
 * decorative, and nothing requires a restart:
 *
 *   Theme / Reduce motion → ThemeProvider, applied on the next commit
 *   Sensitivity           → engine RMS gate, confidence floor and analysis
 *                           cadence, applied on the next window (< 1.5 s)
 *   Night boost           → +1 sensitivity step between 21:00 and 06:00
 *   Background listening  → the microphone foreground service
 *   Haptic signatures     → per-sound vibration rhythms, in app and in the
 *                           notification channels
 *   Visual flash          → the global flash overlay
 *   Background alerts     → OS notifications while the app is not on screen
 *   Alert-me-to switches  → engine mute list, applied immediately
 *   Log routine sounds    → whether safe-class events reach history
 *   Threat escalation     → the inescapable safety check and its countdown
 *   SOS countdown         → abort window on the SOS screen
 *   Share location        → whether GPS is attached to the SOS message
 *   Call first contact    → dialer hand-off after dispatch
 *
 * Two rows report capability rather than preference: background listening is
 * disabled outright when the binary has no native listening service, and the
 * background-alerts description changes when the notification permission has
 * been refused. A settings screen that offers a switch for something the device
 * cannot do is worse than one that omits it.
 *
 * The screen never reads storage directly; SettingsProvider owns the value and
 * persists in the background, so a switch animates the instant it is touched.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  ActionRow,
  AppButton,
  Card,
  Divider,
  IconBadge,
  SectionLabel,
  SegmentedControl,
  SettingRow,
  ScreenHeader,
  type IconName,
} from '@/components/ui';
import { alpha, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useEngineActions } from '@/providers/EngineProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { makeStyles, useColors } from '@/providers/ThemeProvider';
import { backgroundCapture } from '@/utils/backgroundService';
import { SOUND_SIGNATURE_LIST, playSignature } from '@/utils/hapticSignatures';
import {
  getNotificationPermission,
  notifyDetection,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/utils/notifications';
import {
  SOUND_DISPLAY_NAMES,
  SOUND_ICONS,
  SOUND_LABELS,
  SOUND_THREAT,
  TRANSCRIBE_LOCALES,
  TRANSCRIBE_TEXT_SCALES,
  clearDetectionLog,
  type SoundLabel,
} from '@/utils/storage';

const SENSITIVITY_COPY: Record<number, { name: string; detail: string }> = {
  1: { name: 'Conservative', detail: 'Only loud, unambiguous sounds. Fewest false alarms.' },
  2: { name: 'Cautious', detail: 'Slightly more selective than balanced.' },
  3: { name: 'Balanced', detail: 'Recommended for most homes and workplaces.' },
  4: { name: 'Responsive', detail: 'Picks up quieter sounds and checks more often.' },
  5: { name: 'Aggressive', detail: 'Maximum reach. Expect more false positives.' },
};

/**
 * One entry in the vibration dictionary.
 *
 * Deliberately not an `ActionRow`: that ends in a chevron, which promises the
 * row leads somewhere. This one plays a vibration and stays put, so it ends in a
 * play affordance instead. On a screen whose whole purpose is teaching a user
 * what a control will do before they need it under pressure, a misleading
 * affordance is worse than an ugly one.
 */
function SignatureRow({
  icon,
  tint,
  name,
  rhythm,
  hint,
  onPress,
}: {
  icon: IconName;
  tint: string;
  name: string;
  rhythm: string;
  hint: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const c = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${rhythm}`}
      accessibilityHint={`Play this vibration. ${hint}`}
      onPress={onPress}
      android_ripple={{ color: alpha(c.text, 0.07) }}
      style={({ pressed }) => [styles.signatureRow, pressed && { backgroundColor: c.surfaceHover }]}
    >
      <IconBadge icon={icon} color={tint} background={alpha(tint, 0.14)} />
      <View style={{ flex: 1 }}>
        <Text style={styles.signatureName}>{name}</Text>
        <Text style={styles.signatureRhythm}>{rhythm}</Text>
        <Text style={styles.signatureHint}>{hint}</Text>
      </View>
      <View style={[styles.signaturePlay, { borderColor: alpha(tint, 0.35) }]}>
        <Ionicons name="play" size={15} color={tint} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },

  sensitivityCard: { padding: space.lg },
  sensitivityHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sensitivityInfo: { flex: 1 },
  sensitivityName: { ...typeScale.subtitle, color: c.text },
  sensitivityDetail: { ...typeScale.caption, color: c.textMuted, marginTop: 2, lineHeight: 18 },

  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
    marginTop: space.xxl,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: c.primary, borderRadius: radius.pill },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -12 },
  stepHit: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.surfaceAlt,
    borderWidth: 2,
    borderColor: c.surface,
  },
  dotFilled: { backgroundColor: c.primary },
  dotCurrent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    borderColor: alpha(c.primary, 0.28),
    borderWidth: 4,
  },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  stepLabel: { width: 40, textAlign: 'center', fontSize: 11, color: c.textMuted },
  stepLabelActive: { color: c.primary, fontWeight: '700' },

  choiceBlock: { padding: space.lg, gap: space.md },
  choiceLabel: { ...typeScale.captionStrong, color: c.textSecondary },
  choiceHint: { ...typeScale.caption, color: c.textMuted, lineHeight: 18 },

  soundRow: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  soundInfo: { flex: 1 },
  soundName: { ...typeScale.subtitle, color: c.text },
  soundMeta: { ...typeScale.caption, color: c.textMuted, marginTop: 2 },
  soundToggle: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  soundToggleText: { ...typeScale.captionStrong },

  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  signatureName: { ...typeScale.subtitle, color: c.text },
  signatureRhythm: { ...typeScale.captionStrong, color: c.textSecondary, marginTop: 1 },
  signatureHint: { ...typeScale.caption, color: c.textMuted, marginTop: 3, lineHeight: 18 },
  signaturePlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    // Optically centred: a play triangle's visual mass sits left of its box.
    paddingLeft: 2,
  },

  dictionaryNote: {
    ...typeScale.caption,
    color: c.textMuted,
    lineHeight: 18,
    marginTop: space.md,
    paddingHorizontal: space.xs,
  },

  localeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  localeChip: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  localeChipNative: { ...typeScale.bodyStrong, color: c.text },
  localeChipMeta: { fontSize: 11, color: c.textMuted, marginTop: 1 },

  footer: { alignItems: 'center', gap: 4, paddingTop: space.xxxl },
  footerTitle: { ...typeScale.captionStrong, color: c.textSecondary },
  footerText: { ...typeScale.caption, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
}));

export default function SettingsScreen() {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { settings, update, resetToDefaults } = useSettings();
  const { testFlash, simulate } = useEngineActions();

  const copy = SENSITIVITY_COPY[settings.sensitivity] ?? SENSITIVITY_COPY[3]!;

  // ── Honest reporting of what this build can actually do ──
  // Background capture needs a native foreground service that only exists in a
  // build made with the background config plugin, and notifications need a
  // permission the user can revoke at any time. Both are read rather than
  // assumed, so the screen never promises something the binary cannot deliver.
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('undetermined');

  useEffect(() => {
    let cancelled = false;
    void getNotificationPermission().then((value) => {
      if (!cancelled) setNotificationPermission(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const testNotification = useCallback(() => {
    void (async () => {
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted);
      if (granted !== 'granted') {
        Alert.alert(
          'Notifications are off',
          'Suvana cannot alert you while it is closed until notifications are allowed for this app in system settings.',
        );
        return;
      }
      await notifyDetection({
        label: 'door_wood_knock',
        name: 'Door Knock (test)',
        confidence: 0.97,
        threat: 'safe',
      });
      Alert.alert(
        'Test alert posted',
        'Lock your phone or swipe down to see it. A real alert uses the same vibration rhythm as the sound it reports.',
      );
    })();
  }, []);

  const toggleSound = useCallback(
    (label: SoundLabel, alertMe: boolean) => {
      const next = alertMe
        ? settings.mutedSounds.filter((l) => l !== label)
        : settings.mutedSounds.includes(label)
          ? settings.mutedSounds
          : [...settings.mutedSounds, label];
      update('mutedSounds', next);
    },
    [settings.mutedSounds, update],
  );

  const confirmClearHistory = useCallback(() => {
    Alert.alert(
      'Clear detection history',
      'Every recorded detection will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearDetectionLog();
          },
        },
      ],
    );
  }, []);

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Reset all settings',
      'Detection, alert and emergency preferences return to their defaults. Your contacts and history are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetToDefaults },
      ],
    );
  }, [resetToDefaults]);

  const replayIntro = useCallback(() => {
    update('onboardingComplete', false);
  }, [update]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: r.hPadding,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Settings" subtitle="Tune how Suvana listens and alerts" />

        {/* ── Appearance ── */}
        <SectionLabel icon="color-palette-outline">Appearance</SectionLabel>
        <Card padded={false}>
          <View style={styles.choiceBlock}>
            <Text style={styles.choiceLabel}>Theme</Text>
            <SegmentedControl
              value={settings.themeMode}
              onChange={(value) => update('themeMode', value)}
              options={[
                { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
                { value: 'light', label: 'Light', icon: 'sunny-outline' },
                { value: 'dark', label: 'Dark', icon: 'moon-outline' },
              ]}
            />
          </View>
          <Divider />
          <SettingRow
            icon="accessibility-outline"
            tint={c.primary}
            label="Reduce motion"
            description="Stop looping animations across the app. Saves battery."
            value={settings.reduceMotion}
            onValueChange={(v) => update('reduceMotion', v)}
          />
        </Card>

        {/* ── Detection ── */}
        <SectionLabel icon="options-outline">Detection</SectionLabel>
        <Card padded={false}>
          <View style={styles.sensitivityCard}>
            <View style={styles.sensitivityHead}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.primarySoft,
                }}
              >
                <Ionicons name="analytics-outline" size={20} color={c.primary} />
              </View>
              <View style={styles.sensitivityInfo}>
                <Text style={styles.sensitivityName}>
                  Sensitivity · {copy.name}
                </Text>
                <Text style={styles.sensitivityDetail}>{copy.detail}</Text>
              </View>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${((settings.sensitivity - 1) / 4) * 100}%` }]} />
            </View>

            <View style={styles.steps}>
              {[1, 2, 3, 4, 5].map((step) => {
                const current = step === settings.sensitivity;
                return (
                  <Pressable
                    key={step}
                    style={styles.stepHit}
                    hitSlop={6}
                    accessibilityRole="adjustable"
                    accessibilityLabel={`Sensitivity level ${step}`}
                    accessibilityState={{ selected: current }}
                    onPress={() => update('sensitivity', step)}
                  >
                    <View
                      style={[
                        styles.dot,
                        step <= settings.sensitivity && styles.dotFilled,
                        current && styles.dotCurrent,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.stepLabels}>
              {['Low', '', 'Balanced', '', 'High'].map((label, i) => (
                <Text
                  key={`sens-label-${i}`}
                  style={[styles.stepLabel, i + 1 === settings.sensitivity && styles.stepLabelActive]}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>

          <Divider />
          <SettingRow
            icon="moon-outline"
            tint="#A78BFA"
            label="Night boost"
            description="Raise sensitivity one step between 21:00 and 06:00."
            value={settings.nightMode}
            onValueChange={(v) => update('nightMode', v)}
          />
          <Divider />
          <SettingRow
            icon="ear-outline"
            tint={c.safe}
            label="Keep listening in the background"
            description={
              backgroundCapture.available
                ? 'Continue monitoring with the app closed or the screen locked. A permanent notice appears while this is running — Android requires it, and it is what allows the microphone to stay open.'
                : 'Not available in this build. Background monitoring needs the native listening service, which is added by the next build of the app.'
            }
            value={settings.backgroundListening && backgroundCapture.available}
            disabled={!backgroundCapture.available}
            onValueChange={(v) => update('backgroundListening', v)}
          />
          <Divider />
          <SettingRow
            icon="document-text-outline"
            tint={c.textSecondary}
            label="Log routine sounds"
            description="Record footsteps, knocks and barks in history as well as alerts."
            value={settings.logSafeEvents}
            onValueChange={(v) => update('logSafeEvents', v)}
          />
        </Card>

        {/* ── Alerts ── */}
        <SectionLabel icon="notifications-outline">Alerts</SectionLabel>
        <Card padded={false}>
          <SettingRow
            icon="pulse-outline"
            tint={c.primary}
            label="Haptic signatures"
            description="Vibrate when a sound is recognised. Every sound has its own rhythm, so you can tell them apart without looking."
            value={settings.hapticFeedback}
            onValueChange={(v) => update('hapticFeedback', v)}
          />
          <Divider />
          <SettingRow
            icon="flash-outline"
            tint={c.warning}
            label="Visual flash"
            description="Flash the screen on critical detections so an alert is visible at a glance."
            value={settings.visualFlash}
            onValueChange={(v) => update('visualFlash', v)}
          />
          <Divider />
          <SettingRow
            icon="notifications-circle-outline"
            tint={c.accent}
            label="Alerts when the app is closed"
            description={
              notificationPermission === 'denied'
                ? 'Blocked in system settings. Tap Test below to see how to re-enable it.'
                : 'Post a phone notification for sounds detected while Suvana is in the background, using that sound’s vibration rhythm.'
            }
            value={settings.backgroundAlerts}
            onValueChange={(v) => update('backgroundAlerts', v)}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="eye-outline"
            tint={c.warning}
            label="Test visual flash"
            description="Fire the strobe now, whatever the switch above is set to."
            onPress={testFlash}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="notifications-outline"
            tint={c.accent}
            label="Test a background alert"
            description="Post a notification now, so you can check what one looks and feels like on the lock screen."
            onPress={testNotification}
          />
        </Card>

        {/* ── The haptic dictionary ──
            A vibration alphabet is only useful if it can be learned, and it
            cannot be learned by waiting for a real siren. Every signature is
            playable on demand, next to a description of its rhythm. This is the
            single most important accessibility surface in the app for a user
            who keeps the phone in a pocket. */}
        <SectionLabel icon="hand-left-outline">Vibration dictionary</SectionLabel>
        <Card padded={false}>
          {SOUND_SIGNATURE_LIST.map((signature, index) => {
            const label = signature.id as SoundLabel;
            const threat = SOUND_THREAT[label];
            const tint =
              threat === 'critical' ? c.critical : threat === 'warning' ? c.warning : c.safe;
            return (
              <View key={signature.id}>
                {index > 0 ? <Divider inset={space.lg} /> : null}
                <SignatureRow
                  icon={(SOUND_ICONS[label] ?? 'volume-high-outline') as IconName}
                  tint={tint}
                  name={SOUND_DISPLAY_NAMES[label]}
                  rhythm={signature.rhythm}
                  hint={signature.hint}
                  onPress={() => playSignature(label, true)}
                />
              </View>
            );
          })}
        </Card>
        <Text style={styles.dictionaryNote}>
          Tap any row to feel it. These are the same patterns the phone uses for notifications when
          Suvana is closed, so what you learn here works everywhere.
        </Text>

        {/* ── Sound classes ── */}
        <SectionLabel icon="volume-high-outline">Sounds to alert me to</SectionLabel>
        <Card padded={false}>
          {SOUND_LABELS.map((label, i) => {
            const muted = settings.mutedSounds.includes(label);
            const threat = SOUND_THREAT[label];
            const tint =
              threat === 'critical' ? c.critical : threat === 'warning' ? c.warning : c.safe;
            return (
              <View key={label}>
                {i > 0 ? <Divider inset={space.lg} /> : null}
                <View style={styles.soundRow}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: alpha(tint, 0.14),
                    }}
                  >
                    <Ionicons
                      name={(SOUND_ICONS[label] ?? 'volume-high-outline') as IconName}
                      size={19}
                      color={tint}
                    />
                  </View>
                  <View style={styles.soundInfo}>
                    <Text style={styles.soundName}>{SOUND_DISPLAY_NAMES[label]}</Text>
                    <Text style={styles.soundMeta}>
                      {threat === 'critical'
                        ? 'Critical — can escalate to SOS'
                        : threat === 'warning'
                          ? 'Attention'
                          : 'Routine'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => toggleSound(label, muted)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: !muted }}
                    accessibilityLabel={`Alert me to ${SOUND_DISPLAY_NAMES[label]}`}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.soundToggle,
                      {
                        backgroundColor: muted ? c.surfaceAlt : alpha(c.primary, 0.12),
                        borderColor: muted ? c.border : alpha(c.primary, 0.35),
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.soundToggleText, { color: muted ? c.textMuted : c.primary }]}
                    >
                      {muted ? 'Muted' : 'On'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── Live Transcribe ──
            The second mode's preferences live here as well as behind the gear
            on the Transcribe screen itself. Both write the same shared settings
            object, so the two surfaces can never disagree — this one exists for
            discoverability, the other for reach without leaving a conversation. */}
        <SectionLabel icon="chatbubbles-outline">Live Transcribe</SectionLabel>
        <Card padded={false}>
          <View style={styles.choiceBlock}>
            <Text style={styles.choiceLabel}>Language spoken to you</Text>
            <View style={styles.localeGrid}>
              {TRANSCRIBE_LOCALES.map((locale) => {
                const active = settings.transcribeLocale === locale.value;
                return (
                  <Pressable
                    key={locale.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${locale.native}, ${locale.label}`}
                    onPress={() => update('transcribeLocale', locale.value)}
                    style={({ pressed }) => [
                      styles.localeChip,
                      active && { backgroundColor: c.primary, borderColor: c.primary },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[styles.localeChipNative, active && { color: c.onPrimary }]}
                      numberOfLines={1}
                    >
                      {locale.native}
                    </Text>
                    <Text
                      style={[styles.localeChipMeta, active && { color: c.onPrimary, opacity: 0.8 }]}
                      numberOfLines={1}
                    >
                      {locale.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.choiceHint}>
              Sinhala and Tamil are supported wherever the phone has the language pack. Live
              Transcribe checks this device and can download a missing pack from its own options
              panel.
            </Text>
          </View>
          <Divider />
          <View style={styles.choiceBlock}>
            <Text style={styles.choiceLabel}>Default caption size</Text>
            <SegmentedControl
              value={settings.transcribeTextScale}
              onChange={(value) => update('transcribeTextScale', value)}
              options={TRANSCRIBE_TEXT_SCALES.map((option, index) => ({
                value: index,
                label: option.label,
              }))}
            />
            <Text style={styles.choiceHint}>
              Captions can still be resized on screen at any time without changing this.
            </Text>
          </View>
          <Divider />
          <SettingRow
            icon="text-outline"
            tint={c.accent}
            label="Show words as they are spoken"
            description="Partial results appear in grey and firm up when the sentence ends."
            value={settings.transcribeInterim}
            onValueChange={(v) => update('transcribeInterim', v)}
          />
          <Divider />
          <SettingRow
            icon="ellipsis-horizontal-outline"
            tint={c.accent}
            label="Add punctuation"
            description="Full stops and commas, where the device's recogniser supports it."
            value={settings.transcribePunctuation}
            onValueChange={(v) => update('transcribePunctuation', v)}
          />
          <Divider />
          <SettingRow
            icon="cloud-offline-outline"
            tint={c.safe}
            label="Prefer on-device recognition"
            description="Works offline and keeps audio on the phone. Needs the language pack installed; accuracy varies by device."
            value={settings.transcribeOffline}
            onValueChange={(v) => update('transcribeOffline', v)}
          />
          <Divider />
          <SettingRow
            icon="sync-outline"
            tint={c.accent}
            label="Start flipped"
            description="Open Live Transcribe with the caption already rotated for the person opposite you."
            value={settings.transcribeFlipped}
            onValueChange={(v) => update('transcribeFlipped', v)}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="chatbubbles-outline"
            tint={c.accent}
            label="Open Live Transcribe"
            description="Releases the microphone from sound detection and hands it to speech recognition."
            onPress={() => router.replace('/transcribe')}
          />
        </Card>

        {/* ── Emergency ── */}
        <SectionLabel icon="shield-half-outline">Emergency</SectionLabel>
        <Card padded={false}>
          <SettingRow
            icon="alert-circle-outline"
            tint={c.critical}
            label="Threat escalation protocol"
            description="A critical sound locks the screen with a countdown until you confirm you are safe. If you do not, an SOS is sent for you."
            value={settings.autoSos}
            onValueChange={(v) => update('autoSos', v)}
          />
          <Divider />
          <View style={[styles.choiceBlock, !settings.autoSos && { opacity: 0.45 }]}>
            <Text style={styles.choiceLabel}>Time to confirm you are safe</Text>
            <SegmentedControl
              value={settings.threatCountdownSeconds}
              onChange={(value) => update('threatCountdownSeconds', value)}
              options={[
                { value: 10, label: '10 sec' },
                { value: 15, label: '15 sec' },
                { value: 30, label: '30 sec' },
              ]}
            />
            <Text style={styles.choiceHint}>
              How long the warning stays on screen before the SOS is sent automatically. Longer is
              safer against false alarms; shorter gets help faster if you cannot reach the phone.
            </Text>
          </View>
          <Divider />
          <View style={styles.choiceBlock}>
            <Text style={styles.choiceLabel}>Countdown before dispatch</Text>
            <SegmentedControl
              value={settings.sosCountdown}
              onChange={(value) => update('sosCountdown', value)}
              options={[
                { value: 5, label: '5 sec' },
                { value: 10, label: '10 sec' },
                { value: 20, label: '20 sec' },
              ]}
            />
            <Text style={styles.choiceHint}>Your window to abort before contacts are messaged.</Text>
          </View>
          <Divider />
          <SettingRow
            icon="location-outline"
            tint={c.primary}
            label="Share location"
            description="Attach a map link to the SOS message."
            value={settings.shareLocation}
            onValueChange={(v) => update('shareLocation', v)}
          />
          <Divider />
          <SettingRow
            icon="call-outline"
            tint={c.warning}
            label="Offer to call first contact"
            description="After dispatch, show a one-tap dial to the first person in your Safety Circle."
            value={settings.callFirstContact}
            onValueChange={(v) => update('callFirstContact', v)}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="play-outline"
            tint={c.critical}
            label="Rehearse the SOS screen"
            description="Open the countdown so you know what it looks like. Nothing is sent unless it completes."
            onPress={() => router.push('/sos-alert')}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="warning-outline"
            tint={c.critical}
            label="Rehearse the threat lock"
            description="Simulate a siren. The full escalation runs, including the countdown — but it ends in a drill, and no message is ever sent."
            onPress={() => simulate('siren')}
          />
        </Card>

        {/* ── Data ── */}
        <SectionLabel icon="lock-closed-outline">Data & privacy</SectionLabel>
        <Card padded={false}>
          <ActionRow
            icon="play-circle-outline"
            tint={c.primary}
            label="Replay the introduction"
            description="Show the first-run walkthrough again."
            onPress={replayIntro}
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="trash-outline"
            tint={c.critical}
            label="Clear detection history"
            description="Delete every recorded event from this device."
            onPress={confirmClearHistory}
            destructive
          />
          <Divider inset={space.lg} />
          <ActionRow
            icon="refresh-outline"
            tint={c.critical}
            label="Reset all settings"
            description="Restore defaults. Contacts and history are kept."
            onPress={confirmReset}
            destructive
          />
        </Card>

        <View style={{ marginTop: space.lg }}>
          <AppButton
            label="Everything stays on this device"
            icon="shield-checkmark-outline"
            variant="ghost"
            block
            onPress={() =>
              Alert.alert(
                'On-device processing',
                'Audio is captured, converted to a spectrogram and classified entirely on this phone. Nothing is uploaded, and no recording is written to storage. Only the resulting labels, timestamps and confidence values are saved to your local history.',
              )
            }
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Suvana 4.0 · Always on</Text>
          <Text style={styles.footerText}>
            Expo SDK 54 · ONNX Runtime Mobile · OS speech recognition{'\n'}
            Research build — R26-SE-019
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
