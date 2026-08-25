/**
 * SoundGuard — Persistence Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Emergency contacts, application settings and the detection history log,
 * backed by AsyncStorage.
 *
 * Settings are read once at boot by SettingsProvider and then held in memory —
 * no screen reads AsyncStorage on every render, and no consumer polls. Writes
 * are fire-and-forget from the provider, which owns the in-memory truth.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEYS = {
  CONTACTS: '@soundguard/emergency_contacts',
  SETTINGS: '@soundguard/settings',
  DETECTION_LOG: '@soundguard/detection_log',
  REPLY_HISTORY: '@soundguard/reply_history',
} as const;

/** Maximum detection events retained (oldest evicted first). */
const MAX_DETECTION_LOG_SIZE = 300;

/** Maximum typed replies remembered for one-tap reuse. */
const MAX_REPLY_HISTORY = 12;

// ─── Sound taxonomy ──────────────────────────────────────────────────────────

/** Raw class labels emitted by the ONNX model, in output-index order. */
export const SOUND_LABELS = [
  'car_horn',
  'crying_baby',
  'dog',
  'door_wood_knock',
  'footsteps',
  'glass_breaking',
  'siren',
] as const;

export type SoundLabel = (typeof SOUND_LABELS)[number];
export type ThreatLevel = 'safe' | 'warning' | 'critical';

export const SOUND_DISPLAY_NAMES: Record<SoundLabel, string> = {
  car_horn: 'Car Horn',
  crying_baby: 'Crying Baby',
  dog: 'Dog Barking',
  door_wood_knock: 'Door Knock',
  footsteps: 'Footsteps',
  glass_breaking: 'Glass Breaking',
  siren: 'Emergency Siren',
};

/**
 * One-word labels for tight layouts. On a 360 dp screen a three-across row
 * gives each cell about 100 dp, which truncates "Glass Breaking" but fits
 * "Glass" comfortably.
 */
export const SOUND_SHORT_NAMES: Record<SoundLabel, string> = {
  car_horn: 'Horn',
  crying_baby: 'Baby',
  dog: 'Dog',
  door_wood_knock: 'Knock',
  footsteps: 'Steps',
  glass_breaking: 'Glass',
  siren: 'Siren',
};

export const SOUND_THREAT: Record<SoundLabel, ThreatLevel> = {
  car_horn: 'warning',
  crying_baby: 'warning',
  dog: 'safe',
  door_wood_knock: 'safe',
  footsteps: 'safe',
  glass_breaking: 'critical',
  siren: 'critical',
};

/** Ionicons glyph per class — shared by every surface that renders a sound. */
export const SOUND_ICONS: Record<SoundLabel, string> = {
  car_horn: 'car-outline',
  crying_baby: 'happy-outline',
  dog: 'paw-outline',
  door_wood_knock: 'hand-left-outline',
  footsteps: 'footsteps-outline',
  glass_breaking: 'alert-circle-outline',
  siren: 'medkit-outline',
};

export function isSoundLabel(v: string): v is SoundLabel {
  return (SOUND_LABELS as readonly string[]).includes(v);
}

// ─── Live Transcribe taxonomy ────────────────────────────────────────────────

/**
 * Languages offered for speech recognition.
 *
 * ── Why Sinhala and Tamil are first ──────────────────────────────────────────
 *
 * SoundGuard is built for Sri Lanka, and a Deaf user in Colombo is far more
 * likely to be spoken to in Sinhala or Tamil than in English. A captioning tool
 * that can only read English is a tool that works in a lab and fails at a
 * counter, in a clinic, or at home. Both national languages are therefore
 * first-class entries, listed in their own scripts as well as in English so the
 * picker is usable by someone who reads either.
 *
 * ── Availability is a device property, not an app property ───────────────────
 *
 * Each entry is a *request*, not a promise. Android's recogniser supports
 * Sinhala and Tamil where the Google language packs are present; iOS's
 * `SFSpeechRecognizer` supports Tamil but not Sinhala at all. Starting a session
 * in a language the device cannot serve fails with a terminal
 * `language-not-supported`, so `transcribeEngine` probes the device's real list
 * at start-up, marks every entry accordingly, and offers `fallback` — a locale
 * the same user is likely to accept — rather than dead-ending.
 */
export type TranscribeLocale = {
  /** BCP-47 tag handed to the platform recogniser. */
  value: string;
  /** The language's own name, in its own script. */
  native: string;
  /** English name, for a reader who does not know the script. */
  label: string;
  /** Where to go if the device cannot serve this locale. */
  fallback?: string;
};

export const TRANSCRIBE_LOCALES: TranscribeLocale[] = [
  { value: 'si-LK', native: 'සිංහල', label: 'Sinhala', fallback: 'en-IN' },
  { value: 'ta-LK', native: 'தமிழ்', label: 'Tamil (Sri Lanka)', fallback: 'ta-IN' },
  { value: 'ta-IN', native: 'தமிழ்', label: 'Tamil (India)', fallback: 'en-IN' },
  { value: 'en-IN', native: 'English', label: 'English (India)' },
  { value: 'en-US', native: 'English', label: 'English (US)' },
  { value: 'en-GB', native: 'English', label: 'English (UK)' },
  { value: 'en-AU', native: 'English', label: 'English (Australia)' },
];

export function isTranscribeLocale(value: string): boolean {
  return TRANSCRIBE_LOCALES.some((locale) => locale.value === value);
}

export function findTranscribeLocale(value: string): TranscribeLocale | undefined {
  return TRANSCRIBE_LOCALES.find((locale) => locale.value === value);
}

/** Human label for a locale tag, falling back to the raw tag. */
export function transcribeLocaleLabel(value: string): string {
  const locale = findTranscribeLocale(value);
  if (!locale) return value;
  return locale.native === locale.label ? locale.label : `${locale.native} · ${locale.label}`;
}

// ─── Two-way replies ─────────────────────────────────────────────────────────

/**
 * Ready-made replies for the typed side of the conversation.
 *
 * Transcription solves half of a two-way exchange: the Deaf user can now read
 * what was said. The other half — answering — was still a hand gesture or a
 * scramble for a notes app. These are the sentences that actually occur in the
 * first ten seconds of an unplanned conversation with a stranger, written in the
 * language the other person is most likely to be speaking, so the reply is one
 * tap rather than one paragraph of typing.
 *
 * Keyed by the language subtag, so every regional variant of a language shares
 * one set.
 */
const QUICK_REPLIES: Record<string, string[]> = {
  si: [
    'මට ඇහෙන්නේ නැහැ. කරුණාකර ලියන්න.',
    'කරුණාකර සෙමින් කතා කරන්න.',
    'ස්තූතියි!',
    'මට උදව්වක් අවශ්‍යයි.',
    'මොහොතක් ඉන්න.',
    'ඔව්',
    'නැහැ',
  ],
  ta: [
    'எனக்குக் கேட்காது. தயவுசெய்து எழுதுங்கள்.',
    'கொஞ்சம் மெதுவாகப் பேசுங்கள்.',
    'நன்றி!',
    'எனக்கு உதவி வேண்டும்.',
    'ஒரு நிமிடம்.',
    'ஆம்',
    'இல்லை',
  ],
  en: [
    'I am Deaf. Please type or speak clearly.',
    'Could you say that more slowly?',
    'Thank you!',
    'I need some help, please.',
    'One moment.',
    'Yes',
    'No',
  ],
};

export function quickRepliesFor(locale: string): string[] {
  const language = locale.split('-')[0] ?? 'en';
  return QUICK_REPLIES[language] ?? QUICK_REPLIES.en!;
}

/** Caption size ramp, as a multiplier of the base size. Shared by both sides
 *  of the conversation: the transcript and the typed reply. */
export const TRANSCRIBE_TEXT_SCALES = [
  { label: 'Large', factor: 0.78 },
  { label: 'Larger', factor: 1 },
  { label: 'Huge', factor: 1.28 },
  { label: 'Max', factor: 1.6 },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
};

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppSettings = {
  /** First-run flow completed. */
  onboardingComplete: boolean;

  // Appearance
  themeMode: ThemeMode;
  /** Disables all looping/decorative animation. Accessibility + battery. */
  reduceMotion: boolean;

  // Detection
  /** 1 (conservative) … 5 (aggressive). Drives gates, confidence floor, cadence. */
  sensitivity: number;
  /** Raise sensitivity one step between 21:00 and 06:00. */
  nightMode: boolean;
  /** Vibrate with that sound's semantic signature when it is recognised. */
  hapticFeedback: boolean;
  /** Full-screen visual flash on a critical detection. */
  visualFlash: boolean;
  /** Keep the microphone open when the app is backgrounded or the screen is off. */
  backgroundListening: boolean;
  /** Post an OS notification for sounds detected while the app is not on screen. */
  backgroundAlerts: boolean;
  /** Raw labels the engine must never surface. */
  mutedSounds: SoundLabel[];
  /** Write routine (safe) detections to history as well. */
  logSafeEvents: boolean;

  // Live Transcribe
  /** BCP-47 locale handed to the OS speech recogniser. English variants only. */
  transcribeLocale: string;
  /** Show the partial result while a sentence is still being spoken. */
  transcribeInterim: boolean;
  /** Ask the recogniser to punctuate and capitalise (Android 13+ / iOS 16+). */
  transcribePunctuation: boolean;
  /** Prefer the offline model. Works only where the language pack is installed. */
  transcribeOffline: boolean;
  /** Default caption size, 0 (large) … 3 (huge). */
  transcribeTextScale: number;
  /** Start Live Transcribe with the caption already rotated 180°. */
  transcribeFlipped: boolean;
  /** Show a typed reply rotated toward the person opposite by default. */
  replyFlipped: boolean;

  // Emergency
  /** Lock the screen with a safety check when a critical sound is detected. */
  autoSos: boolean;
  /**
   * Seconds the user has to confirm they are safe before the SOS is sent
   * automatically. This is the whole escalation protocol's one dial.
   */
  threatCountdownSeconds: number;
  /** Seconds of abort window on the SOS screen itself. */
  sosCountdown: number;
  /** Attach GPS coordinates to the outgoing SOS message. */
  shareLocation: boolean;
  /** Offer a direct dial to the first contact once the SOS is dispatched. */
  callFirstContact: boolean;
};

export type DetectionEvent = {
  id: string;
  soundName: string;
  rawLabel: string;
  confidence: number;
  threatLevel: ThreatLevel;
  timestamp: number;
  /** True when produced by the in-app demo trigger rather than the microphone. */
  simulated?: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingComplete: false,

  themeMode: 'system',
  reduceMotion: false,

  sensitivity: 3,
  nightMode: false,
  hapticFeedback: true,
  visualFlash: true,
  backgroundListening: true,
  backgroundAlerts: true,
  mutedSounds: [],
  logSafeEvents: false,

  // English (India) rather than (US): the majority of English actually spoken to
  // this app's users is Sri Lankan, which the Indian acoustic model handles
  // markedly better. Sinhala and Tamil are one tap away in the picker.
  transcribeLocale: 'en-IN',
  transcribeInterim: true,
  transcribePunctuation: true,
  transcribeOffline: false,
  transcribeTextScale: 1,
  transcribeFlipped: false,
  replyFlipped: true,

  autoSos: true,
  threatCountdownSeconds: 15,
  sosCountdown: 10,
  shareLocation: true,
  callFirstContact: false,
};

// ─── Settings ────────────────────────────────────────────────────────────────

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Coerce an arbitrary persisted blob into a valid AppSettings object.
 *
 * Deliberately total: every field is validated and clamped, so a corrupt or
 * partial record can never crash a screen or feed an out-of-range value into
 * the detection engine.
 *
 * NOTE ON THE v1 KEYS. An earlier revision carried `flashlight` forward into
 * `visualFlash` and `autoCall` into `autoSos`, treating them as renames. They
 * are not renames — they are different features (a camera LED versus a screen
 * strobe; auto-dialling emergency services versus opening a cancellable SOS
 * countdown). Both v1 keys defaulted to `false`, so the migration silently
 * shipped every existing install with the visual flash and the SOS escalation
 * switched off, which is why the strobe appeared to be dead code. The v1 keys
 * are now ignored and both features take their own defaults.
 *
 * NOTE ON `criticalHoldSeconds`. It meant "how long a critical sound must
 * persist before escalating", which the threat escalation protocol no longer
 * asks: a confirmed critical detection escalates at once, and the dial that
 * remains is how long the user has to say they are safe. That is a different
 * quantity with a different sensible range, so it is a new key rather than a
 * silent reinterpretation of the old one. Unknown persisted keys are ignored,
 * so the stale value simply falls away.
 */
function normaliseSettings(raw: unknown): AppSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bool = (k: string, fallback: boolean) =>
    typeof s[k] === 'boolean' ? (s[k] as boolean) : fallback;
  const num = (k: string, fallback: number, min: number, max: number) => {
    const v = s[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, Math.round(v)));
  };

  const themeMode = THEME_MODES.includes(s.themeMode as ThemeMode)
    ? (s.themeMode as ThemeMode)
    : DEFAULT_SETTINGS.themeMode;

  const muted = Array.isArray(s.mutedSounds)
    ? (s.mutedSounds.filter((v): v is SoundLabel => typeof v === 'string' && isSoundLabel(v)))
    : [];

  return {
    onboardingComplete: bool('onboardingComplete', DEFAULT_SETTINGS.onboardingComplete),

    themeMode,
    reduceMotion: bool('reduceMotion', DEFAULT_SETTINGS.reduceMotion),

    sensitivity: num('sensitivity', DEFAULT_SETTINGS.sensitivity, 1, 5),
    nightMode: bool('nightMode', DEFAULT_SETTINGS.nightMode),
    hapticFeedback: bool('hapticFeedback', DEFAULT_SETTINGS.hapticFeedback),
    visualFlash: bool('visualFlash', DEFAULT_SETTINGS.visualFlash),
    backgroundListening: bool('backgroundListening', DEFAULT_SETTINGS.backgroundListening),
    backgroundAlerts: bool('backgroundAlerts', DEFAULT_SETTINGS.backgroundAlerts),
    mutedSounds: muted,
    logSafeEvents: bool('logSafeEvents', DEFAULT_SETTINGS.logSafeEvents),

    transcribeLocale:
      typeof s.transcribeLocale === 'string' && isTranscribeLocale(s.transcribeLocale)
        ? s.transcribeLocale
        : DEFAULT_SETTINGS.transcribeLocale,
    transcribeInterim: bool('transcribeInterim', DEFAULT_SETTINGS.transcribeInterim),
    transcribePunctuation: bool('transcribePunctuation', DEFAULT_SETTINGS.transcribePunctuation),
    transcribeOffline: bool('transcribeOffline', DEFAULT_SETTINGS.transcribeOffline),
    transcribeTextScale: num(
      'transcribeTextScale',
      DEFAULT_SETTINGS.transcribeTextScale,
      0,
      TRANSCRIBE_TEXT_SCALES.length - 1,
    ),
    transcribeFlipped: bool('transcribeFlipped', DEFAULT_SETTINGS.transcribeFlipped),
    replyFlipped: bool('replyFlipped', DEFAULT_SETTINGS.replyFlipped),

    autoSos: bool('autoSos', DEFAULT_SETTINGS.autoSos),
    // Floor of 5 s deliberately: anything shorter cannot be read, understood and
    // answered by someone who has just been startled, which is the entire point
    // of the window.
    threatCountdownSeconds: num(
      'threatCountdownSeconds',
      DEFAULT_SETTINGS.threatCountdownSeconds,
      5,
      120,
    ),
    sosCountdown: num('sosCountdown', DEFAULT_SETTINGS.sosCountdown, 3, 60),
    shareLocation: bool('shareLocation', DEFAULT_SETTINGS.shareLocation),
    callFirstContact: bool('callFirstContact', DEFAULT_SETTINGS.callFirstContact),
  };
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return normaliseSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveAllSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    /* Persistence failures must never break the running session. */
  }
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function getContacts(): Promise<EmergencyContact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONTACTS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveContact(contact: EmergencyContact): Promise<void> {
  const contacts = await getContacts();
  contacts.push(contact);
  await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
}

export async function deleteContact(id: string): Promise<void> {
  const contacts = await getContacts();
  await AsyncStorage.setItem(
    KEYS.CONTACTS,
    JSON.stringify(contacts.filter((c) => c.id !== id)),
  );
}

// ─── Detection history ───────────────────────────────────────────────────────

export async function getDetectionLog(): Promise<DetectionEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DETECTION_LOG);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDetectionEvent(event: DetectionEvent): Promise<void> {
  try {
    const log = await getDetectionLog();
    await AsyncStorage.setItem(
      KEYS.DETECTION_LOG,
      JSON.stringify([event, ...log].slice(0, MAX_DETECTION_LOG_SIZE)),
    );
  } catch {
    /* History is best-effort; never let it affect the live detection path. */
  }
}

export async function clearDetectionLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.DETECTION_LOG);
  } catch {
    /* no-op */
  }
}

// ─── Typed replies ───────────────────────────────────────────────────────────

/**
 * The last few things the user typed to show someone.
 *
 * Conversations repeat themselves — "I am Deaf, please write it down" is said to
 * every new person — and re-typing a sentence while someone waits is exactly the
 * friction this feature exists to remove. Kept newest-first and de-duplicated,
 * so the list stays short enough to scan at a glance.
 */
export async function getReplyHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REPLY_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}

export async function saveReply(text: string): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) return getReplyHistory();

  try {
    const existing = await getReplyHistory();
    const next = [trimmed, ...existing.filter((entry) => entry !== trimmed)].slice(
      0,
      MAX_REPLY_HISTORY,
    );
    await AsyncStorage.setItem(KEYS.REPLY_HISTORY, JSON.stringify(next));
    return next;
  } catch {
    return getReplyHistory();
  }
}

export async function clearReplyHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.REPLY_HISTORY);
  } catch {
    /* no-op */
  }
}
