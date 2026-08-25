/**
 * SoundGuard — Typed reply
 * ─────────────────────────────────────────────────────────────────────────────
 * The other half of the conversation.
 *
 * Live Transcribe solved one direction: the Deaf user can read what was said.
 * The answer was still a shrug, a hand gesture, or a scramble to find a notes
 * app while a stranger waits. This is the reply surface, and it is built around
 * three observations about how that exchange actually goes.
 *
 *   1. THE FIRST SENTENCE IS ALWAYS THE SAME. "I am Deaf, please write it
 *      down." It is said to every new person, in whichever language they are
 *      speaking. It should be one tap, not one sentence of typing, so the quick
 *      phrases track the transcription language — pick Sinhala for the speaker
 *      and the ready-made replies are in Sinhala too.
 *
 *   2. CONVERSATIONS REPEAT. The last dozen things typed are kept and offered
 *      back, because the second time you explain something to a counter clerk
 *      should be faster than the first.
 *
 *   3. THE REPLY IS READ BY SOMEONE ELSE. So composing and showing are two
 *      different modes with two different layouts. Composing is small text and
 *      a keyboard, oriented to the person holding the phone. Showing is the
 *      largest type that will fit, rotated 180° so the phone can stay in the
 *      user's hand and be read across a table — the same trick the caption panel
 *      uses, for the same reason.
 *
 * The presentation mode deliberately has no keyboard, no chrome and no
 * scrolling. It is a sign, and a sign that needs operating is not a sign.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { fonts, radius, space, typography as typeScale } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';
import { getReplyHistory, quickRepliesFor, saveReply } from '@/utils/storage';

// Same fixed high-contrast palette as the Live Transcribe screen. See its header.
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const LINE = 'rgba(255,255,255,0.14)';
const SURFACE = 'rgba(255,255,255,0.07)';
const SURFACE_STRONG = 'rgba(255,255,255,0.13)';
const MUTED = 'rgba(255,255,255,0.55)';
const ACCENT = '#C4B5FD';

const MAX_REPLY_LENGTH = 280;

// ─── Presentation sizing ─────────────────────────────────────────────────────

const MIN_FONT = 20;
const MAX_FONT = 116;
/** Average glyph advance as a fraction of the font size. Pessimistic on purpose. */
const GLYPH_ADVANCE = 0.58;
const LINE_RATIO = 1.22;
/** Fraction of the panel the text is allowed to occupy before it stops growing. */
const FILL = 0.62;

/**
 * Largest size at which `text` still fits the box.
 *
 * Derived from area rather than from a measure-and-retry loop: each glyph
 * occupies roughly `advance × lineHeight` square units of font size, so the
 * whole string needs `chars × 0.58 × 1.22 × f²`. Solving for `f` gives a size in
 * one pass, on the JS thread, with no layout round-trip — which matters because
 * this recomputes on every keystroke.
 */
function fitFontSize(text: string, width: number, height: number): number {
  const chars = Math.max(1, text.trim().length);
  if (width <= 0 || height <= 0) return MIN_FONT;

  const perGlyph = GLYPH_ADVANCE * LINE_RATIO;
  const ideal = Math.sqrt((width * height * FILL) / (chars * perGlyph));

  // A short reply should not become a poster wider than the screen, so cap by
  // the single-line width as well.
  const byWidth = width / (Math.min(chars, 18) * GLYPH_ADVANCE);
  return Math.round(Math.max(MIN_FONT, Math.min(MAX_FONT, ideal, byWidth)));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReplyComposer({
  visible,
  onClose,
  locale,
  flipped,
  onToggleFlip,
}: {
  visible: boolean;
  onClose: () => void;
  /** Drives which language the ready-made phrases are written in. */
  locale: string;
  /** Whether the shown reply faces the person opposite. */
  flipped: boolean;
  onToggleFlip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const { reduceMotion } = useTheme();

  const [text, setText] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [panel, setPanel] = useState({ width: 0, height: 0 });

  const inputRef = useRef<TextInput>(null);

  const quick = useMemo(() => quickRepliesFor(locale), [locale]);

  // ── History, loaded when the sheet opens rather than at app boot ──
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const stored = await getReplyHistory();
      if (!cancelled) setHistory(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // ── Composing is the entry state every time ──
  useEffect(() => {
    if (visible) return;
    setPresenting(false);
  }, [visible]);

  // ── Flip animation, matched to the caption panel's ──
  const flip = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    flip.value = reduceMotion
      ? flipped
        ? 1
        : 0
      : withTiming(flipped ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [flip, flipped, reduceMotion]);

  const signStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flip.value * 180}deg` }],
  }));

  const onPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPanel((prev) =>
      Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
        ? prev
        : { width, height },
    );
  }, []);

  const present = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPresenting(true);
    // Remembering is fire-and-forget: the sign is already on screen, and a slow
    // disk must never sit between the user and the person waiting for an answer.
    void saveReply(trimmed).then(setHistory);
  }, [text]);

  const applySuggestion = useCallback((value: string) => {
    setText(value);
    setPresenting(true);
    void saveReply(value).then(setHistory);
  }, []);

  const edit = useCallback(() => {
    setPresenting(false);
    // The keyboard is dismissed by the presentation mode, so it has to be asked
    // back explicitly; a frame of delay lets the layout settle first.
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const reset = useCallback(() => {
    setText('');
    setPresenting(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const trimmed = text.trim();
  const signFont = fitFontSize(
    trimmed,
    panel.width || r.contentWidth,
    panel.height || r.height * 0.5,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      // A reply is read across a table; there is no useful landscape variant and
      // rotating mid-conversation would resize the sign under the reader's eyes.
      supportedOrientations={['portrait']}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* ── Header. Never rotated: it belongs to whoever holds the phone. ── */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + space.sm, paddingHorizontal: r.hPadding },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close the reply"
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={WHITE} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Your reply
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {presenting ? 'Showing to the other person' : 'Type or pick a phrase'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: flipped }}
            accessibilityLabel={
              flipped ? 'Turn the reply back to face you' : 'Flip the reply for the person opposite'
            }
            onPress={onToggleFlip}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerButton,
              flipped && styles.headerButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="sync-outline" size={20} color={flipped ? BLACK : WHITE} />
          </Pressable>
        </View>

        {presenting ? (
          // ── Sign mode ──
          <>
            <View
              onLayout={onPanelLayout}
              style={[styles.signPanel, { marginHorizontal: r.hPadding }]}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Showing: ${trimmed}`}
            >
              <Animated.View style={signStyle}>
                <Text
                  style={[styles.sign, { fontSize: signFont, lineHeight: signFont * LINE_RATIO }]}
                  allowFontScaling={false}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                >
                  {trimmed}
                </Text>
              </Animated.View>
            </View>

            <View
              style={[
                styles.footer,
                {
                  paddingHorizontal: r.hPadding,
                  paddingBottom: Math.max(insets.bottom, space.md) + space.md,
                },
              ]}
            >
              <View style={[styles.row, { gap: r.gap }]}>
                <FooterButton icon="create-outline" label="Edit" onPress={edit} />
                <FooterButton icon="refresh-outline" label="New reply" onPress={reset} />
                <FooterButton icon="checkmark" label="Done" onPress={onClose} primary />
              </View>
            </View>
          </>
        ) : (
          // ── Compose mode ──
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={{
                paddingHorizontal: r.hPadding,
                paddingBottom: Math.max(insets.bottom, space.lg) + space.xxl,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                autoFocus
                multiline
                maxLength={MAX_REPLY_LENGTH}
                placeholder="Type what you want to say…"
                placeholderTextColor={MUTED}
                style={styles.input}
                accessibilityLabel="Reply text"
                // The reply is a sentence shown to a person, not a search query.
                autoCapitalize="sentences"
                autoCorrect
                textAlignVertical="top"
                selectionColor={ACCENT}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={present}
              />

              <View style={styles.counterRow}>
                <Text style={styles.counter}>
                  {text.length}/{MAX_REPLY_LENGTH}
                </Text>
                {text.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear the reply"
                    onPress={() => setText('')}
                    hitSlop={8}
                  >
                    <Text style={styles.clear}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show this reply to the other person"
                accessibilityState={{ disabled: trimmed.length === 0 }}
                disabled={trimmed.length === 0}
                onPress={present}
                style={({ pressed }) => [
                  styles.showButton,
                  pressed && styles.pressed,
                  trimmed.length === 0 && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="eye-outline" size={22} color={BLACK} />
                <Text style={styles.showLabel}>Show it, big</Text>
              </Pressable>

              <Text style={styles.sectionLabel}>Ready to send</Text>
              <View style={styles.chips}>
                {quick.map((phrase) => (
                  <SuggestionChip key={phrase} text={phrase} onPress={() => applySuggestion(phrase)} />
                ))}
              </View>

              {history.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>You said recently</Text>
                  <View style={styles.chips}>
                    {history.map((phrase) => (
                      <SuggestionChip
                        key={phrase}
                        text={phrase}
                        muted
                        onPress={() => applySuggestion(phrase)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

// ─── Local primitives ────────────────────────────────────────────────────────

function SuggestionChip({
  text,
  onPress,
  muted = false,
}: {
  text: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show: ${text}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        muted && styles.chipMuted,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.chipText} numberOfLines={2}>
        {text}
      </Text>
    </Pressable>
  );
}

function FooterButton({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerButton,
        primary && styles.footerButtonPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={19} color={primary ? BLACK : WHITE} />
      <Text style={[styles.footerLabel, primary && { color: BLACK }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  pressed: { opacity: 0.65 },

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
  headerButtonActive: { backgroundColor: WHITE },
  headerTitles: { flex: 1, alignItems: 'center' },
  headerTitle: {
    ...typeScale.captionStrong,
    color: WHITE,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerSub: { fontSize: 11, fontFamily: fonts.regular, color: MUTED, marginTop: 3 },

  // ── Compose ──
  input: {
    minHeight: 132,
    maxHeight: 260,
    marginTop: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE,
    color: WHITE,
    fontSize: 21,
    fontFamily: fonts.semibold,
    lineHeight: 29,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingHorizontal: 4,
  },
  counter: { fontSize: 11, color: MUTED, fontVariant: ['tabular-nums'] },
  clear: { fontSize: 12, fontFamily: fonts.bold, fontWeight: '700', color: ACCENT, paddingHorizontal: 4 },

  showButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    minHeight: 62,
    marginTop: space.lg,
    borderRadius: radius.lg,
    backgroundColor: WHITE,
  },
  showLabel: { fontSize: 17, fontFamily: fonts.bold, fontWeight: '800', color: BLACK, letterSpacing: 0.2 },

  sectionLabel: {
    ...typeScale.overline,
    color: MUTED,
    textTransform: 'uppercase',
    marginTop: space.xxl,
    marginBottom: space.sm,
  },
  chips: { gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: LINE,
    backgroundColor: SURFACE_STRONG,
  },
  chipMuted: { backgroundColor: SURFACE },
  chipText: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: '600', color: WHITE, lineHeight: 23 },

  // ── Sign ──
  signPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: space.lg,
  },
  sign: {
    color: WHITE,
    fontFamily: fonts.bold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  footer: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: LINE,
  },
  footerButton: {
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
  footerButtonPrimary: { backgroundColor: WHITE, borderColor: WHITE },
  footerLabel: { fontSize: 11, fontFamily: fonts.bold, fontWeight: '700', color: WHITE },
});
