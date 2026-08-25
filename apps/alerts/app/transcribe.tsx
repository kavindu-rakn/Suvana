/**
 * SoundGuard — Live Transcribe
 * ─────────────────────────────────────────────────────────────────────────────
 * A two-way communication hub. Speech becomes text the Deaf user can read across
 * a table; a typed reply becomes text the *hearing person opposite* can read.
 * Both directions, one screen, one device, no hand-over.
 *
 * ── Two languages, not one ───────────────────────────────────────────────────
 *
 * This app is for Sri Lanka, and a captioning tool that only understands English
 * is a tool that works in a lab and fails at a counter. Sinhala and Tamil are
 * first-class choices in the language picker, listed in their own scripts, and
 * the picker is annotated with what *this particular phone* can actually do —
 * see `transcribeEngine.probeLocales`. Where a language pack is missing, the
 * panel offers to download it rather than dead-ending on an error.
 *
 * The choice of language reaches further than the recogniser: it also selects
 * which ready-made phrases the reply composer offers, so picking Sinhala for the
 * speaker gives you Sinhala to answer with.
 *
 * ── Why this screen ignores the app's theme ──────────────────────────────────
 *
 * Every other surface honours light/dark and the design system. This one is
 * fixed to pure black with pure white type, in both schemes, for the same
 * reason the SOS screen keeps a single identity: it is read under pressure, at
 * arm's length, often outdoors, and frequently by someone who has never seen
 * the app before. #000 on an OLED panel is a true black with no backlight
 * bleed, which gives the maximum contrast ratio the hardware can produce
 * (21:1) — measurably better than the themed `bg` of #0B0E13, and far better
 * than any light scheme. Legibility here outranks visual consistency.
 *
 * ── The flip ─────────────────────────────────────────────────────────────────
 *
 * A Deaf user holding a phone out to a hearing stranger has, until now, had to
 * hand the device over or ask them to walk around. Rotating the caption 180°
 * lets the phone stay in the user's hand, screen tilted outward, and be read
 * naturally from the other side of the table.
 *
 * The rotation is applied to the caption block only — never to the controls,
 * which must stay under the thumb of whoever is holding the device. The panel's
 * anchoring is inverted alongside it (`flex-end` → `flex-start`), so that in the
 * reader's own frame the text still grows upward from the bottom exactly as it
 * does for the user. Both parties get the same reading experience.
 *
 * ── Why the caption never scrolls ────────────────────────────────────────────
 *
 * A scrolling caption is unusable when the screen is rotated for someone else:
 * their "scroll down" is the holder's "scroll up", and neither person can reach
 * the gesture. So the panel shows a computed *tail* of the transcript — as much
 * as fits at the chosen size, trimmed at a word boundary from the front. The
 * full transcript is still in the engine, and nothing is lost; the panel simply
 * never needs a gesture to stay current. `numberOfLines` backstops the estimate
 * so the box cannot overflow even if the character-width heuristic is off.
 *
 * ── Microphone ownership ─────────────────────────────────────────────────────
 *
 * Blur and unmount both release the recogniser (see `audioArbiter`). Leaving
 * this screen by any route — back gesture, mode switch, deep link, the SOS
 * escalation — frees the hardware before the next owner can ask for it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { ReplyComposer } from '@/components/ReplyComposer';
import { type IconName } from '@/components/ui';
import { fonts, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/providers/SettingsProvider';
import { useTheme } from '@/providers/ThemeProvider';
import {
  useTranscribeActions,
  useTranscribeLevel,
  useTranscribeState,
} from '@/providers/TranscribeProvider';
import { transcribeEngine } from '@/utils/transcribeEngine';
import {
  TRANSCRIBE_LOCALES,
  TRANSCRIBE_TEXT_SCALES,
  transcribeLocaleLabel,
} from '@/utils/storage';

// ─── Fixed high-contrast palette ─────────────────────────────────────────────
// Deliberately scheme-independent. See the file header.

const BLACK = '#000000';
const WHITE = '#FFFFFF';
/** Interim text: clearly present, clearly not yet confirmed. */
const PENDING = '#9AA4B2';
const LINE = 'rgba(255,255,255,0.14)';
const SURFACE = 'rgba(255,255,255,0.07)';
const SURFACE_STRONG = 'rgba(255,255,255,0.13)';
const MUTED = 'rgba(255,255,255,0.55)';
const LIVE = '#4ADE80';
const ALERT = '#FF5A72';
const ACCENT = '#C4B5FD';

/** Keep-awake owner tag, so this screen's lock is independent of any other. */
const KEEP_AWAKE_TAG = 'soundguard-live-transcribe';

// ─── Caption sizing ──────────────────────────────────────────────────────────

/**
 * Average glyph advance as a fraction of the font size, for a bold sans at
 * these sizes. Deliberately pessimistic (real English text averages nearer
 * 0.50 em): overestimating the width means the tail is trimmed slightly early,
 * which costs a word of scrollback, while underestimating it would overflow the
 * panel and clip the newest words — the only ones that matter.
 */
const GLYPH_ADVANCE = 0.58;

/** Never shrink below this, whatever the screen. Accessibility floor. */
const MIN_FONT = 22;
const MAX_FONT = 104;

/** Trim to the end of `text`, cutting at a word boundary where one is close. */
function tailOf(text: string, budget: number): string {
  if (budget <= 0) return '';
  if (text.length <= budget) return text;
  const cut = text.slice(text.length - budget);
  const boundary = cut.indexOf(' ');
  // Only honour a boundary that is genuinely near the start; otherwise a single
  // very long token would swallow the whole budget.
  return boundary > 0 && boundary < Math.min(48, budget / 3) ? cut.slice(boundary + 1) : cut;
}

// ─── Voice level meter ───────────────────────────────────────────────────────

const METER_BARS = 5;

function VoiceMeter({ active }: { active: boolean }) {
  const level = useTranscribeLevel();
  const { reduceMotion } = useTheme();
  const wave = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(wave);
    if (!active || reduceMotion) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(wave);
  }, [active, reduceMotion, wave]);

  return (
    <View style={styles.meter} pointerEvents="none" accessibilityElementsHidden>
      {Array.from({ length: METER_BARS }).map((_, index) => (
        <MeterBar key={index} index={index} active={active} wave={wave} level={level} />
      ))}
    </View>
  );
}

function MeterBar({
  index,
  active,
  wave,
  level,
}: {
  index: number;
  active: boolean;
  wave: SharedValue<number>;
  level: SharedValue<number>;
}) {
  const half = (METER_BARS - 1) / 2;
  const weight = 0.4 + (1 - Math.abs(index - half) / half) * 0.6;
  const phase = index / METER_BARS;

  const style = useAnimatedStyle(() => {
    if (!active) return { transform: [{ scaleY: 0.12 }], opacity: 0.3 };
    const ripple = 0.6 + 0.4 * Math.abs(Math.sin(Math.PI * (wave.value + phase)));
    const height = 0.12 + level.value * weight * ripple * 0.88;
    return {
      transform: [{ scaleY: Math.max(0.12, Math.min(1, height)) }],
      opacity: 0.5 + level.value * 0.5,
    };
  }, [active]);

  return <Animated.View style={[styles.meterBar, style]} />;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TranscribeScreen() {
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { reduceMotion } = useTheme();
  const { settings, update } = useSettings();

  const state = useTranscribeState();
  const actions = useTranscribeActions();

  const listening = state.status === 'listening';
  const starting = state.status === 'starting';

  // ── Presentation state, seeded from the persisted defaults ──
  const [flipped, setFlipped] = useState(settings.transcribeFlipped);
  const [scaleIndex, setScaleIndex] = useState(settings.transcribeTextScale);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [panel, setPanel] = useState({ width: 0, height: 0 });

  /**
   * Presentation is seeded from the saved defaults, but the on-screen controls
   * win the moment they are touched. Settings hydrate from disk one tick after
   * mount, so without these latches a user who flipped the caption during that
   * tick would see it flip straight back.
   */
  const touchedScale = useRef(false);
  const touchedFlip = useRef(false);

  useEffect(() => {
    if (touchedScale.current) return;
    setScaleIndex(settings.transcribeTextScale);
  }, [settings.transcribeTextScale]);

  useEffect(() => {
    if (touchedFlip.current) return;
    setFlipped(settings.transcribeFlipped);
  }, [settings.transcribeFlipped]);

  // ── Hardware release: blur and unmount, both idempotent ──
  useFocusEffect(
    useCallback(
      () => () => {
        transcribeEngine.stop();
      },
      [],
    ),
  );

  useEffect(
    () => () => {
      transcribeEngine.stop();
    },
    [],
  );

  // ── Keep the screen alive while captioning ──
  // A conversation has long pauses, and a screen that sleeps mid-sentence takes
  // the recogniser down with it. The lock is tagged and released on stop, so it
  // can never outlive the session.
  useEffect(() => {
    if (!listening) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [listening]);

  // ── Flip animation ──
  const flip = useSharedValue(settings.transcribeFlipped ? 1 : 0);
  useEffect(() => {
    flip.value = reduceMotion
      ? flipped
        ? 1
        : 0
      : // Short enough to read as instant, long enough that the reader's eye
        // can follow which way round the text just went.
        withTiming(flipped ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [flip, flipped, reduceMotion]);

  const captionStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flip.value * 180}deg` }],
  }));

  // ── Caption metrics ──
  const scale = TRANSCRIBE_TEXT_SCALES[scaleIndex] ?? TRANSCRIBE_TEXT_SCALES[1]!;
  const baseFont = Math.min(r.width, 560) * 0.108;
  const fontSize = Math.round(
    Math.max(MIN_FONT, Math.min(MAX_FONT, baseFont * scale.factor * (r.isShort ? 0.86 : 1))),
  );
  const lineHeight = Math.round(fontSize * 1.2);

  const width = panel.width || r.contentWidth;
  const height = panel.height || Math.max(160, r.height * 0.42);
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  const charsPerLine = Math.max(6, Math.floor(width / (fontSize * GLYPH_ADVANCE)));
  const budget = Math.max(24, Math.floor(charsPerLine * maxLines * 0.94));

  const finalsText = useMemo(() => state.lines.map((line) => line.text).join(' '), [state.lines]);

  const interim = state.interim;
  const finalsShown = tailOf(finalsText, Math.max(0, budget - interim.length - 1));
  const hasText = Boolean(finalsShown || interim);

  // ── Controls ──
  const cycleScale = useCallback(() => {
    touchedScale.current = true;
    setScaleIndex((prev) => (prev + 1) % TRANSCRIBE_TEXT_SCALES.length);
  }, []);

  const toggleFlip = useCallback(() => {
    touchedFlip.current = true;
    setFlipped((prev) => !prev);
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const switchToSoundGuard = useCallback(() => {
    setOptionsOpen(false);
    // `replace` swaps the mode in place. The engine's blur/unmount release and
    // the arbiter's serialised hand-over both apply, so the microphone is free
    // before SoundGuard's screen can ask for it.
    router.replace('/listen');
  }, []);

  const onPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setPanel((prev) =>
      Math.abs(prev.width - w) < 1 && Math.abs(prev.height - h) < 1 ? prev : { width: w, height: h },
    );
  }, []);

  /**
   * Open the reply surface.
   *
   * Captions keep running underneath. The recogniser owns the microphone, the
   * keyboard owns the screen, and neither needs the other — a conversation
   * where answering meant going deaf would not be a conversation.
   */
  const openReply = useCallback(() => {
    setOptionsOpen(false);
    setReplyOpen(true);
  }, []);

  const toggleReplyFlip = useCallback(() => {
    update('replyFlipped', !settings.replyFlipped);
  }, [settings.replyFlipped, update]);

  /**
   * Fetch a missing language pack.
   *
   * The single most valuable control on this screen for a Sri Lankan user: a
   * phone that has never been asked for Sinhala does not have it, and without
   * this the language is listed but permanently broken.
   */
  const downloadLanguage = useCallback(
    async (locale: string) => {
      if (downloading) return;
      setDownloading(locale);
      try {
        const result = await actions.downloadLanguage(locale);
        Alert.alert(
          result.ok ? 'Language pack' : 'Could not download',
          `${transcribeLocaleLabel(locale)}\n\n${result.message}`,
        );
      } finally {
        setDownloading(null);
      }
    },
    [actions, downloading],
  );

  const statusText = starting
    ? 'Starting…'
    : listening
      ? state.speaking
        ? 'Hearing speech'
        : 'Listening'
      : state.status === 'error'
        ? 'Stopped'
        : 'Paused';

  const statusTone = listening ? LIVE : state.status === 'error' ? ALERT : MUTED;

  const localeLabel = transcribeLocaleLabel(settings.transcribeLocale);
  const localeNative =
    TRANSCRIBE_LOCALES.find((locale) => locale.value === settings.transcribeLocale)?.native ??
    settings.transcribeLocale;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + space.sm, paddingHorizontal: r.hPadding },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={WHITE} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Live Transcribe
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
            <Text style={[styles.statusText, { color: statusTone }]} numberOfLines={1}>
              {statusText}
            </Text>
            <Text style={styles.statusMeta} numberOfLines={1}>
              {`· ${localeNative}`}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Transcription options"
          onPress={() => setOptionsOpen(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={20} color={WHITE} />
        </Pressable>
      </View>

      {/* ── Error / capability banner ──
          A fatal error with a known way forward always offers it inline. A
          language that this phone cannot serve is the common case, and burying
          the fix behind the options panel would strand the user mid-conversation. */}
      {state.error ? (
        <View style={[styles.banner, { marginHorizontal: r.hPadding }]}>
          <Ionicons name="alert-circle-outline" size={18} color={ALERT} />
          <Text style={styles.bannerText}>{state.error}</Text>
          {state.permission === 'denied' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open system settings"
              onPress={() => void Linking.openSettings().catch(() => {})}
              hitSlop={8}
            >
              <Text style={styles.bannerAction}>Settings</Text>
            </Pressable>
          ) : state.suggestedLocale ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${transcribeLocaleLabel(state.suggestedLocale)}`}
              onPress={() => update('transcribeLocale', state.suggestedLocale as string)}
              hitSlop={8}
            >
              <Text style={styles.bannerAction} numberOfLines={1}>
                Use{' '}
                {TRANSCRIBE_LOCALES.find((l) => l.value === state.suggestedLocale)?.native ??
                  state.suggestedLocale}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ── Caption panel ── */}
      <View
        onLayout={onPanelLayout}
        style={[
          styles.panel,
          {
            marginHorizontal: r.hPadding,
            // Inverting the anchor alongside the rotation is what makes the two
            // sides symmetric: text grows upward from the reader's bottom edge
            // whichever way round the phone is being read.
            justifyContent: flipped ? 'flex-start' : 'flex-end',
          },
        ]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={hasText ? `${finalsShown} ${interim}`.trim() : 'No speech yet'}
      >
        <Animated.View style={captionStyle}>
          {hasText ? (
            <Text
              style={[styles.caption, { fontSize, lineHeight }]}
              numberOfLines={maxLines}
              ellipsizeMode="tail"
              allowFontScaling={false}
            >
              {finalsShown}
              {interim ? (
                <Text style={styles.captionPending}>
                  {finalsShown ? ' ' : ''}
                  {interim}
                </Text>
              ) : null}
            </Text>
          ) : (
            <View style={styles.empty}>
              <Ionicons
                name={listening ? 'ear-outline' : 'mic-off-outline'}
                size={Math.round(fontSize * 0.9)}
                color={MUTED}
              />
              <Text style={[styles.emptyText, { fontSize: Math.round(fontSize * 0.42) }]}>
                {!state.available
                  ? 'No speech recognition service is installed on this device.'
                  : listening
                    ? `Listening in ${localeNative}. Speech appears here — tap Reply to answer in writing.`
                    : 'Tap Listen for live captions, or Reply to write something and show it.'}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Controls. Never rotated: they belong to whoever holds the phone. ── */}
      <View
        style={[
          styles.controls,
          {
            paddingHorizontal: r.hPadding,
            paddingBottom: Math.max(insets.bottom, space.md) + space.md,
          },
        ]}
      >
        <View style={styles.meterRow}>
          <VoiceMeter active={listening} />
          <Text style={styles.wordCount} numberOfLines={1}>
            {state.words === 0
              ? 'No words yet'
              : `${state.words} word${state.words === 1 ? '' : 's'}`}
          </Text>
        </View>

        {/* ── The two directions of the conversation, side by side ──
            Listening and replying are peers, not a feature and a sub-feature,
            so they get equal billing on the primary row. The reply button is
            tinted rather than white so the two are distinguishable at a glance
            and by touch position alone. */}
        <View style={[styles.primaryRow, { gap: r.gap }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop live captions' : 'Start live captions'}
            accessibilityState={{ busy: starting }}
            disabled={starting}
            onPress={actions.toggle}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.primaryListen,
              listening ? styles.primaryButtonActive : null,
              pressed && styles.pressed,
              starting && { opacity: 0.6 },
            ]}
          >
            <Ionicons name={listening ? 'stop' : 'mic'} size={24} color={BLACK} />
            <Text style={styles.primaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {starting ? 'Starting…' : listening ? 'Stop' : r.isNarrow ? 'Listen' : 'Start captions'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Type a reply to show the person you are talking to"
            onPress={openReply}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.primaryReply,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chatbox-ellipses" size={24} color={BLACK} />
            <Text style={styles.primaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Reply
            </Text>
          </Pressable>
        </View>

        <View style={[styles.secondaryRow, { gap: r.gap }]}>
          <SecondaryButton
            icon="sync-outline"
            label={flipped ? 'Flipped' : 'Flip'}
            active={flipped}
            onPress={toggleFlip}
            accessibilityLabel={
              flipped ? 'Turn the caption back to face you' : 'Flip the caption for the person opposite'
            }
          />
          <SecondaryButton
            icon="text-outline"
            label={scale.label}
            onPress={cycleScale}
            accessibilityLabel={`Caption size, currently ${scale.label}. Tap to change.`}
          />
          <SecondaryButton
            icon="trash-outline"
            label="Clear"
            onPress={actions.clear}
            disabled={state.lines.length === 0 && !state.interim}
            accessibilityLabel="Clear the transcript"
          />
        </View>
      </View>

      {/* ── Options sheet ── */}
      <Modal
        visible={optionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close options"
          onPress={() => setOptionsOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingHorizontal: Math.max(space.lg, r.hPadding),
              paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
            },
          ]}
        >
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Transcription</Text>
          <Text style={styles.sheetDesc}>
            These settings are saved and reused next time. Changing one restarts the recogniser
            immediately.
          </Text>

          <ScrollView
            style={{ maxHeight: r.height * 0.52 }}
            contentContainerStyle={{ paddingBottom: space.lg }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetLabel}>Language spoken to you</Text>
            <View style={styles.localeList}>
              {TRANSCRIBE_LOCALES.map((locale) => {
                const active = settings.transcribeLocale === locale.value;
                const supported = actions.isLocaleSupported(locale.value);
                const installed = actions.isLocaleInstalled(locale.value);
                const busy = downloading === locale.value;

                return (
                  <Pressable
                    key={locale.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${locale.label}${supported ? '' : ', not available on this device'}`}
                    onPress={() => update('transcribeLocale', locale.value)}
                    style={({ pressed }) => [
                      styles.localeRow,
                      active && styles.localeRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.localeText}>
                      <Text
                        style={[styles.localeNative, active && styles.localeNativeActive]}
                        numberOfLines={1}
                      >
                        {locale.native}
                      </Text>
                      <Text
                        style={[styles.localeMeta, active && { color: 'rgba(0,0,0,0.6)' }]}
                        numberOfLines={1}
                      >
                        {locale.label}
                        {installed ? ' · offline ready' : supported ? '' : ' · not on this device'}
                      </Text>
                    </View>

                    {/* Downloading is offered for anything without an offline
                        pack, not only for the unsupported ones: it is also what
                        makes on-device recognition possible for a language the
                        phone can currently only handle over the network. */}
                    {installed ? (
                      <Ionicons name="cloud-done-outline" size={18} color={active ? BLACK : LIVE} />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Download the ${locale.label} language pack`}
                        onPress={() => void downloadLanguage(locale.value)}
                        disabled={busy}
                        hitSlop={8}
                        style={({ pressed }) => [styles.localeAction, pressed && styles.pressed]}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color={active ? BLACK : WHITE} />
                        ) : (
                          <Ionicons
                            name="cloud-download-outline"
                            size={18}
                            color={active ? BLACK : supported ? MUTED : ALERT}
                          />
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sheetHint}>
              {state.localesProbed && state.supportedLocales.length === 0
                ? 'This phone cannot list its languages, so all of them are offered. If one fails, download its pack with the arrow.'
                : 'Downloading a pack lets that language work offline, and is usually what fixes a language the phone says it cannot recognise.'}
            </Text>

            <SheetToggle
              label="Reply faces the other person"
              description="Show your typed reply rotated 180°, so the phone can stay in your hand."
              value={settings.replyFlipped}
              onChange={(next) => update('replyFlipped', next)}
            />
            <SheetToggle
              label="Show words as they are spoken"
              description="Partial results appear in grey and firm up when the sentence ends."
              value={settings.transcribeInterim}
              onChange={(next) => update('transcribeInterim', next)}
            />
            <SheetToggle
              label="Add punctuation"
              description="Full stops and commas, where the device supports it."
              value={settings.transcribePunctuation}
              onChange={(next) => update('transcribePunctuation', next)}
            />
            <SheetToggle
              label="Prefer on-device recognition"
              description="Works offline and keeps audio on the phone. Needs the language pack installed, and is less accurate on some devices."
              value={settings.transcribeOffline}
              onChange={(next) => update('transcribeOffline', next)}
            />
            <SheetToggle
              label="Start flipped"
              description="Open this screen with the caption already facing the person opposite."
              value={settings.transcribeFlipped}
              onChange={(next) => update('transcribeFlipped', next)}
            />

            <Text style={[styles.sheetLabel, { marginTop: space.xl }]}>Default caption size</Text>
            <View style={styles.optionGrid}>
              {TRANSCRIBE_TEXT_SCALES.map((option, index) => {
                const active = settings.transcribeTextScale === index;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Default caption size ${option.label}`}
                    onPress={() => {
                      update('transcribeTextScale', index);
                      touchedScale.current = false;
                      setScaleIndex(index);
                    }}
                    style={({ pressed }) => [
                      styles.optionChip,
                      active && styles.optionChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[styles.optionChipText, active && styles.optionChipTextActive]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Type a reply"
              onPress={openReply}
              style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}
            >
              <Ionicons name="chatbox-ellipses" size={19} color={ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Type a reply</Text>
                <Text style={styles.switchDesc}>
                  Write something and show it, full screen, to the person opposite. Captions keep
                  running underneath.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to sound detection"
              onPress={switchToSoundGuard}
              style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}
            >
              <Ionicons name="pulse" size={19} color={ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Switch to sound detection</Text>
                <Text style={styles.switchDesc}>
                  Releases the microphone here and hands it to sound detection.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </Pressable>

            <Text style={styles.sheetFoot}>
              Recognition is performed by the {localeLabel} speech services built into this phone.
              Suvana never uploads audio of its own.
            </Text>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
            onPress={() => setOptionsOpen(false)}
            style={({ pressed }) => [styles.sheetDone, pressed && styles.pressed]}
          >
            <Text style={styles.sheetDoneText}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── The reply half of the conversation ──
          Rendered here rather than as a route so the caption session underneath
          is never unmounted: opening the keyboard must not stop listening. */}
      <ReplyComposer
        visible={replyOpen}
        onClose={() => setReplyOpen(false)}
        locale={settings.transcribeLocale}
        flipped={settings.replyFlipped}
        onToggleFlip={toggleReplyFlip}
      />
    </View>
  );
}

// ─── Local primitives ────────────────────────────────────────────────────────

function SecondaryButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  accessibilityLabel,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        active && styles.secondaryButtonActive,
        pressed && styles.pressed,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={19} color={active ? BLACK : WHITE} />
      <Text
        style={[styles.secondaryLabel, active && { color: BLACK }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SheetToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <View style={[styles.toggleBox, value && styles.toggleBoxOn]}>
        {value ? <Ionicons name="checkmark" size={16} color={BLACK} /> : null}
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  headerTitles: { flex: 1, alignItems: 'center' },
  headerTitle: {
    ...typeScale.captionStrong,
    color: WHITE,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: fonts.bold, fontWeight: '700', letterSpacing: 0.3 },
  statusMeta: { fontSize: 11, fontFamily: fonts.regular, color: MUTED },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,90,114,0.35)',
    backgroundColor: 'rgba(255,90,114,0.12)',
    marginBottom: space.sm,
  },
  bannerText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: WHITE, lineHeight: 17 },
  bannerAction: { fontSize: 12, fontFamily: fonts.bold, fontWeight: '700', color: ALERT, paddingHorizontal: 4 },

  panel: {
    flex: 1,
    overflow: 'hidden',
    paddingVertical: space.sm,
  },
  caption: {
    color: WHITE,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  captionPending: { color: PENDING, fontFamily: fonts.semibold, fontWeight: '600' },

  empty: { alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingVertical: space.xl },
  emptyText: {
    color: MUTED,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontWeight: '600',
    paddingHorizontal: space.lg,
  },

  controls: { paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: LINE },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
  },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20 },
  meterBar: { width: 3, height: 20, borderRadius: 2, backgroundColor: WHITE },
  wordCount: { fontSize: 11, color: MUTED, fontVariant: ['tabular-nums'] },

  primaryRow: { flexDirection: 'row' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 62,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    backgroundColor: WHITE,
  },
  // Listening gets the larger share: it is the mode the screen is usually in.
  primaryListen: { flex: 1.25 },
  primaryReply: { flex: 1, backgroundColor: ACCENT },
  primaryButtonActive: { backgroundColor: ALERT },
  primaryLabel: { fontSize: 16, fontFamily: fonts.bold, fontWeight: '800', color: BLACK, letterSpacing: 0.2 },

  secondaryRow: { flexDirection: 'row', marginTop: space.md },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 58,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  secondaryButtonActive: { backgroundColor: WHITE, borderColor: WHITE },
  secondaryLabel: { fontSize: 11, fontFamily: fonts.bold, fontWeight: '700', color: WHITE },

  pressed: { opacity: 0.65 },

  // ── Sheet ──
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    backgroundColor: '#0B0B0D',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    paddingTop: space.md,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: SURFACE_STRONG,
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  sheetTitle: { ...typeScale.title, color: WHITE },
  sheetDesc: { ...typeScale.caption, color: MUTED, marginTop: 6, lineHeight: 19 },
  sheetLabel: {
    ...typeScale.overline,
    color: MUTED,
    textTransform: 'uppercase',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  sheetHint: { ...typeScale.caption, color: MUTED, lineHeight: 18, marginTop: space.md },

  // ── Language list ──
  // A row rather than a chip: two scripts, an English gloss and a download
  // control do not fit in a pill, and a Sinhala speaker should not have to
  // decode an abbreviation to find their own language.
  localeList: { gap: 6 },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  localeRowActive: { backgroundColor: WHITE, borderColor: WHITE },
  localeText: { flex: 1 },
  localeNative: { fontSize: 17, fontFamily: fonts.bold, fontWeight: '700', color: WHITE },
  localeNativeActive: { color: BLACK },
  localeMeta: { fontSize: 11, fontFamily: fonts.regular, color: MUTED, marginTop: 2 },
  localeAction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  optionChipActive: { backgroundColor: WHITE, borderColor: WHITE },
  optionChipText: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: '600', color: WHITE },
  optionChipTextActive: { color: BLACK },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: LINE,
  },
  toggleLabel: { ...typeScale.bodyStrong, color: WHITE },
  toggleDesc: { ...typeScale.caption, color: MUTED, marginTop: 2, lineHeight: 18 },
  toggleBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: SURFACE_STRONG,
    backgroundColor: SURFACE,
  },
  toggleBoxOn: { backgroundColor: WHITE, borderColor: WHITE },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  switchLabel: { ...typeScale.bodyStrong, color: WHITE },
  switchDesc: { ...typeScale.caption, color: MUTED, marginTop: 2, lineHeight: 18 },

  sheetFoot: { ...typeScale.caption, color: MUTED, lineHeight: 18, marginTop: space.xl },

  sheetDone: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: WHITE,
    marginTop: space.md,
  },
  sheetDoneText: { ...typeScale.bodyStrong, color: BLACK },
});
