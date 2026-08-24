/**
 * SoundGuard — Live Transcribe engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Speech → text for Deaf and hard-of-hearing users, driven by the device's own
 * speech recogniser (Android `SpeechRecognizer`, iOS `SFSpeechRecognizer`) via
 * `expo-speech-recognition`.
 *
 * Framework-free on purpose, exactly like `soundEngine`: microphone lifecycle
 * correctness must not depend on a component rendering at the right moment.
 * React binds to it through `TranscribeProvider` with `useSyncExternalStore`.
 *
 * ── The three things that make a native recogniser hard ──────────────────────
 *
 *   1. IT STOPS ON ITS OWN. Every platform recogniser is built around a single
 *      utterance: it ends after a pause, after a timeout, or after it decides
 *      the sentence is finished. `continuous: true` papers over this on modern
 *      Android and iOS 18+, but not everywhere. A captioning surface must never
 *      go quietly deaf, so this engine treats "the recogniser ended" as an
 *      ordinary event and restarts it as long as the user still wants to
 *      listen — with a settle delay, and with a storm guard so a device that
 *      cannot recognise at all backs off instead of thrashing the audio HAL.
 *
 *   2. ITS ERRORS ARE MOSTLY NOT ERRORS. `no-speech` and `speech-timeout` mean
 *      "nobody talked", which during a conversation is the normal state between
 *      sentences. Surfacing those as failures would make the screen look broken
 *      while working perfectly. They are classified as benign and restarted;
 *      only genuinely terminal conditions (permission, unsupported locale, no
 *      recogniser installed) stop the session and show a message.
 *
 *   3. IT OWNS THE MICROPHONE. The OS recogniser opens its own capture session,
 *      which cannot coexist with SoundGuard's AudioRecord stream. Start and
 *      stop therefore go through `audioArbiter`, which serialises the hand-over
 *      and gives the audio HAL time to settle between owners.
 *
 * Transcript model: finalised utterances are appended as immutable lines; the
 * in-flight partial is held separately. The UI can then render "everything said
 * so far" and "what is being said right now" differently without the engine
 * knowing anything about presentation.
 */

import { AppState, Platform, type AppStateStatus } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

import { audioArbiter } from './audioArbiter';
import { findTranscribeLocale } from './storage';

/** Flip to true for verbose recogniser diagnostics in Metro. */
const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log('[Transcribe]', ...args);
};

// ─── Tuning ──────────────────────────────────────────────────────────────────

/** Pause before restarting after a normal end-of-utterance. */
const RESTART_DELAY_MS = Platform.OS === 'android' ? 260 : 120;
/** Pause before restarting after a benign error (silence, timeout). */
const BENIGN_RESTART_DELAY_MS = 420;
/** Pause before retrying a transient failure (network, recogniser busy). */
const TRANSIENT_RESTART_DELAY_MS = 1200;
/** Once the recogniser has failed to produce anything this many times… */
const IDLE_RESTART_LIMIT = 20;
/** …restarts slow to this cadence instead of hammering the audio HAL. */
const BACKOFF_RESTART_DELAY_MS = 2500;
/** Consecutive transient failures tolerated before the session gives up. */
const TRANSIENT_FAILURE_LIMIT = 5;

/** Longest transcript retained in memory. Older lines are evicted. */
const MAX_LINES = 400;

/** How long to wait for the native recogniser to report itself inactive. */
const TEARDOWN_TIMEOUT_MS = 1500;
const TEARDOWN_POLL_MS = 60;

// ─── Public types ────────────────────────────────────────────────────────────

export type TranscribeStatus = 'idle' | 'starting' | 'listening' | 'error';
export type TranscribePermission = 'unknown' | 'granted' | 'denied';

export type TranscriptLine = {
  id: string;
  text: string;
  at: number;
};

export type TranscribeState = {
  status: TranscribeStatus;
  permission: TranscribePermission;
  /** False when the device has no usable speech recognition service. */
  available: boolean;
  /** Finalised utterances, oldest first. */
  lines: TranscriptLine[];
  /** The utterance currently being recognised, if any. */
  interim: string;
  /** True between `speechstart` and `speechend` — someone is actually talking. */
  speaking: boolean;
  /** Total words finalised this session. */
  words: number;
  /** BCP-47 locale in use. */
  locale: string;
  error: string | null;
  /** True when the error is terminal and the user must act. */
  fatal: boolean;

  // ── Language capability, read from the device rather than assumed ──
  /**
   * Every locale the device's recogniser will accept. Empty means "not known" —
   * Android 12 and below cannot answer the question at all — and must therefore
   * never be read as "nothing is supported".
   */
  supportedLocales: string[];
  /** Locales with an offline pack already downloaded. */
  installedLocales: string[];
  /** True once the capability probe has actually run. */
  localesProbed: boolean;
  /**
   * Where to go when the chosen language turned out to be unavailable. Set only
   * after a real `language-not-supported`, so the UI offers a way forward
   * instead of a dead end.
   */
  suggestedLocale: string | null;
};

export type TranscribeOptions = {
  locale: string;
  interimResults: boolean;
  addsPunctuation: boolean;
  preferOffline: boolean;
};

export const DEFAULT_TRANSCRIBE_OPTIONS: TranscribeOptions = {
  locale: 'en-IN',
  interimResults: true,
  addsPunctuation: true,
  preferOffline: false,
};

const NO_LINES: TranscriptLine[] = [];
const NO_LOCALES: string[] = [];

const INITIAL_STATE: TranscribeState = {
  status: 'idle',
  permission: 'unknown',
  available: true,
  lines: NO_LINES,
  interim: '',
  speaking: false,
  words: 0,
  locale: DEFAULT_TRANSCRIBE_OPTIONS.locale,
  error: null,
  fatal: false,
  supportedLocales: NO_LOCALES,
  installedLocales: NO_LOCALES,
  localesProbed: false,
  suggestedLocale: null,
};

// ─── Error classification ────────────────────────────────────────────────────

type Severity = 'benign' | 'transient' | 'fatal';

function classify(code: ExpoSpeechRecognitionErrorCode): Severity {
  switch (code) {
    // Nobody spoke. During a conversation this is the resting state.
    case 'no-speech':
    case 'speech-timeout':
      return 'benign';

    // The user cannot fix these by waiting, and retrying would loop forever.
    case 'not-allowed':
    case 'service-not-allowed':
    case 'language-not-supported':
    case 'bad-grammar':
      return 'fatal';

    // Recoverable: the recogniser was busy, the network blipped, or the audio
    // session was interrupted by a call.
    default:
      return 'transient';
  }
}

function messageFor(code: ExpoSpeechRecognitionErrorCode): string {
  switch (code) {
    case 'not-allowed':
      return 'Microphone or speech recognition permission was denied. Enable both in system settings to use Live Transcribe.';
    case 'service-not-allowed':
      return 'No speech recognition service is available on this device. Install or enable Google Speech Services, then try again.';
    case 'language-not-supported':
      return 'This phone cannot recognise that language yet. Download the language pack from the options panel, or switch to another language.';
    case 'network':
      return 'Speech recognition needs a network connection for this language. Reconnect, or turn on on-device recognition in the options panel.';
    case 'audio-capture':
      return 'The microphone could not be opened. Close other apps that may be recording and try again.';
    case 'bad-grammar':
      return 'The recogniser rejected the request configuration.';
    default:
      return 'Speech recognition stopped unexpectedly. Tap start to resume.';
  }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

class TranscribeEngine {
  private state: TranscribeState = INITIAL_STATE;
  private listeners = new Set<() => void>();

  /** Live input level, 0…1. Wired to a Reanimated shared value — no renders. */
  onLevel: ((level: number) => void) | null = null;

  private options: TranscribeOptions = { ...DEFAULT_TRANSCRIBE_OPTIONS };

  /** The user wants to be listening. Survives the recogniser's own restarts. */
  private shouldRun = false;
  /** Native listeners are attached and a recognition session may be open. */
  private active = false;

  private subscriptions: { remove: () => void }[] = [];
  private appStateSub: { remove: () => void } | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  /** Bumped on every teardown so late native events can be ignored. */
  private token = 0;

  /** Restarts since the last time anything was actually recognised. */
  private idleRestarts = 0;
  /** Consecutive transient failures. */
  private transientFailures = 0;

  // ── Store contract ────────────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): TranscribeState => this.state;

  private patch(next: Partial<TranscribeState>) {
    let changed = false;
    for (const key of Object.keys(next) as (keyof TranscribeState)[]) {
      if (this.state[key] !== next[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        /* ignore */
      }
    });
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  /**
   * Apply user preferences. A change of locale or recognition mode can only
   * take effect on a fresh session, so a live one is restarted in place.
   */
  setOptions(next: TranscribeOptions) {
    const previous = this.options;
    this.options = next;
    this.patch({
      locale: next.locale,
      // A new language invalidates the previous language's suggestion, and any
      // message telling the user the old one was unavailable.
      suggestedLocale: previous.locale === next.locale ? this.state.suggestedLocale : null,
      ...(previous.locale !== next.locale && this.state.fatal
        ? { error: null, fatal: false }
        : null),
    });

    const needsRestart =
      this.shouldRun &&
      (previous.locale !== next.locale ||
        previous.interimResults !== next.interimResults ||
        previous.addsPunctuation !== next.addsPunctuation ||
        previous.preferOffline !== next.preferOffline);

    if (needsRestart) void this.start();
  }

  getOptions(): TranscribeOptions {
    return this.options;
  }

  /**
   * Cheap capability probe for the dashboard. Never throws: a device without a
   * recogniser must still render a working home screen.
   */
  probe(): boolean {
    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      this.patch({ available });
      return available;
    } catch {
      this.patch({ available: false });
      return false;
    }
  }

  /**
   * Ask the device which languages it can actually recognise.
   *
   * Offering Sinhala and Tamil is worth nothing if the picker cannot say
   * whether *this* phone has them, so the language list is annotated from the
   * platform's own answer rather than from an assumption baked into the app.
   *
   * Two honest limitations, both handled by the caller reading `localesProbed`
   * and an empty list as "unknown" rather than "none":
   *   • Android 12 and below cannot answer, and returns an empty array.
   *   • iOS reports its own list, which never includes Sinhala.
   */
  async probeLocales(): Promise<void> {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({});
      this.patch({
        supportedLocales: Array.isArray(result.locales) ? result.locales : NO_LOCALES,
        installedLocales: Array.isArray(result.installedLocales)
          ? result.installedLocales
          : NO_LOCALES,
        localesProbed: true,
      });
    } catch {
      // "package_not_found", an OEM recogniser that refuses to answer, or an
      // OS too old to be asked. Unknown, not unsupported.
      this.patch({ localesProbed: true });
    }
  }

  /**
   * Whether a locale is known to work here.
   *
   * Returns true when the answer is unknown, deliberately: a user should be
   * allowed to try Sinhala on a device that cannot enumerate its languages, and
   * find out from a real attempt rather than from our guess.
   */
  isLocaleSupported(locale: string): boolean {
    const supported = this.state.supportedLocales;
    if (supported.length === 0) return true;
    const language = locale.split('-')[0];
    return supported.some(
      (entry) => entry === locale || entry.replace('_', '-').split('-')[0] === language,
    );
  }

  /** True when the locale has an offline pack, so recognition works with no data. */
  isLocaleInstalled(locale: string): boolean {
    return this.state.installedLocales.some((entry) => entry.replace('_', '-') === locale);
  }

  /**
   * Ask Android to fetch the offline pack for a language.
   *
   * This is the fix for "Sinhala is listed but does not work" — on Android 13
   * it opens the system download dialog, and on 14+ it downloads directly. iOS
   * has no equivalent, and says so rather than pretending to work.
   */
  async downloadLanguage(locale: string): Promise<{ ok: boolean; message: string }> {
    if (Platform.OS !== 'android') {
      return {
        ok: false,
        message: 'Language packs are managed by iOS itself, under Settings → General → Keyboard → Dictation.',
      };
    }
    try {
      const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
        locale,
      });
      await this.probeLocales();
      return {
        ok: result.status !== 'download_canceled',
        message:
          result.status === 'download_success'
            ? 'Language pack downloaded. On-device recognition is now available for this language.'
            : result.status === 'opened_dialog'
              ? 'The system download dialog was opened. Finish there, then come back.'
              : 'The download was cancelled.',
      };
    } catch {
      return {
        ok: false,
        message:
          'This device could not download the language pack. It may need Android 13 or newer, or Google Speech Services.',
      };
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.state.status === 'starting') return;

    this.shouldRun = true;
    this.patch({ status: 'starting', error: null, fatal: false, suggestedLocale: null });

    // Availability first: starting an absent recogniser produces a native
    // error event several seconds later, which reads as a hang.
    if (!this.probe()) {
      this.shouldRun = false;
      this.patch({
        status: 'error',
        error: messageFor('service-not-allowed'),
        fatal: true,
      });
      return;
    }

    // Permissions are requested *outside* the arbiter lock. The dialog can sit
    // on screen for as long as the user likes, and holding the microphone lock
    // across it would block the other mode from releasing.
    let granted = false;
    try {
      const response = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      granted = response.granted;
    } catch {
      granted = false;
    }

    if (!granted) {
      this.shouldRun = false;
      this.patch({
        status: 'error',
        permission: 'denied',
        error: messageFor('not-allowed'),
        fatal: true,
      });
      return;
    }
    this.patch({ permission: 'granted' });

    // The user may have cancelled while the dialog was up.
    if (!this.shouldRun) {
      this.patch({ status: 'idle' });
      return;
    }

    this.idleRestarts = 0;
    this.transientFailures = 0;

    const ok = await audioArbiter.acquire({
      id: 'transcribe',
      release: () => this.teardown(),
      activate: () => this.activate(),
    });

    if (!ok) {
      this.shouldRun = false;
      this.patch({
        status: 'error',
        error: messageFor('audio-capture'),
        fatal: false,
      });
    }
  }

  /**
   * Stop listening. The visible state changes synchronously so the button
   * responds in the same frame as the tap; the native teardown is handed to the
   * arbiter, which serialises it against any mode switch already in flight.
   */
  stop(): void {
    this.shouldRun = false;
    this.clearRestart();
    this.onLevel?.(0);
    this.patch({ status: 'idle', interim: '', speaking: false });
    void audioArbiter.release('transcribe');
  }

  toggle(): void {
    if (this.shouldRun) this.stop();
    else void this.start();
  }

  /** Wipe the transcript without touching the microphone. */
  clear(): void {
    this.patch({ lines: NO_LINES, interim: '', words: 0 });
  }

  /** The whole transcript as plain text, newest last. */
  fullText(): string {
    const lines = this.state.lines.map((line) => line.text);
    if (this.state.interim) lines.push(this.state.interim);
    return lines.join('\n');
  }

  // ── Native session ────────────────────────────────────────────────────────

  /** The recogniser configuration. Identical for a cold start and a restart. */
  private buildOptions(): ExpoSpeechRecognitionOptions {
    return {
      lang: this.options.locale,
      interimResults: this.options.interimResults,
      continuous: true,
      addsPunctuation: this.options.addsPunctuation,
      requiresOnDeviceRecognition: this.options.preferOffline,
      maxAlternatives: 1,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      androidIntentOptions: {
        // Let the recogniser sit through the natural pauses in a conversation
        // instead of closing the session after the default ~1 s of silence.
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 4000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
        EXTRA_MASK_OFFENSIVE_WORDS: false,
      },
    };
  }

  /** Runs inside the arbiter lock: attach listeners, then open the recogniser. */
  private activate(): void {
    this.attach();

    // Throwing here is caught by the arbiter, which unwinds the acquisition and
    // leaves the microphone unowned rather than half-open.
    ExpoSpeechRecognitionModule.start(this.buildOptions());
    this.active = true;
    this.patch({ status: 'listening', error: null, fatal: false });
    log('session opened', this.options.locale);
  }

  /**
   * Release every native resource. Idempotent, never throws — the arbiter
   * awaits this before handing the microphone to the other mode, so it also
   * waits for the recogniser to report itself genuinely inactive.
   */
  private async teardown(): Promise<void> {
    this.token += 1;
    this.clearRestart();

    const wasActive = this.active;
    this.active = false;

    this.detach();

    if (wasActive) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* already stopped */
      }
      await this.waitForInactive();
    }

    this.onLevel?.(0);
    this.patch({
      status: this.state.status === 'error' ? 'error' : 'idle',
      interim: '',
      speaking: false,
    });
    log('session closed');
  }

  /**
   * `abort()` returns before the platform recogniser has finished releasing the
   * microphone. Polling the native state closes that gap, so the next owner
   * never opens capture on top of a session that is still winding down.
   */
  private async waitForInactive(): Promise<void> {
    const deadline = Date.now() + TEARDOWN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const state = await ExpoSpeechRecognitionModule.getStateAsync();
        if (state === 'inactive') return;
      } catch {
        return; // Module cannot answer; the settle delay in the arbiter covers us.
      }
      await new Promise<void>((resolve) => setTimeout(resolve, TEARDOWN_POLL_MS));
    }
  }

  // ── Native events ─────────────────────────────────────────────────────────

  private attach(): void {
    this.detach();

    // Every handler is fenced behind the session token, so an event that the
    // platform delivers after teardown can never mutate a closed session.
    const token = this.token;
    const fenced =
      <T>(handler: (event: T) => void) =>
      (event: T) => {
        if (token !== this.token) return;
        handler(event);
      };

    const track = (subscription: { remove: () => void }) => {
      this.subscriptions.push(subscription);
    };

    track(ExpoSpeechRecognitionModule.addListener('result', fenced(this.handleResult)));
    track(ExpoSpeechRecognitionModule.addListener('error', fenced(this.handleError)));
    track(ExpoSpeechRecognitionModule.addListener('end', fenced(this.handleEnd)));
    track(ExpoSpeechRecognitionModule.addListener('nomatch', fenced(this.handleNoMatch)));
    track(ExpoSpeechRecognitionModule.addListener('volumechange', fenced(this.handleVolume)));
    track(
      ExpoSpeechRecognitionModule.addListener(
        'speechstart',
        fenced(() => this.patch({ speaking: true })),
      ),
    );
    track(
      ExpoSpeechRecognitionModule.addListener(
        'speechend',
        fenced(() => this.patch({ speaking: false })),
      ),
    );

    // The OS recogniser cannot run in the background, and leaving it half-alive
    // there is what strands the microphone. Backgrounding always releases.
    this.appStateSub = AppState.addEventListener('change', this.handleAppState);
  }

  private detach(): void {
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    }
    this.subscriptions = [];

    try {
      this.appStateSub?.remove();
    } catch {
      /* ignore */
    }
    this.appStateSub = null;
  }

  private handleAppState = (next: AppStateStatus) => {
    if (next === 'active') return;
    if (!this.shouldRun) return;
    log('backgrounded — releasing the microphone');
    this.stop();
  };

  private handleResult = (event: ExpoSpeechRecognitionResultEvent) => {
    const transcript = event.results?.[0]?.transcript?.trim() ?? '';
    if (!transcript) {
      if (!event.isFinal) this.patch({ interim: '' });
      return;
    }

    // Anything recognised proves the pipeline works — reset the storm guards.
    this.idleRestarts = 0;
    this.transientFailures = 0;

    if (!event.isFinal) {
      this.patch({ interim: transcript });
      return;
    }

    const now = Date.now();
    const line: TranscriptLine = {
      id: `${now}-${this.state.lines.length}`,
      text: transcript,
      at: now,
    };
    const lines = [...this.state.lines, line];
    this.patch({
      lines: lines.length > MAX_LINES ? lines.slice(lines.length - MAX_LINES) : lines,
      interim: '',
      words: this.state.words + transcript.split(/\s+/).filter(Boolean).length,
    });
  };

  private handleNoMatch = () => {
    this.patch({ interim: '' });
  };

  private handleVolume = (event: { value: number }) => {
    // Native range is roughly -2 … 10; anything below 0 is inaudible.
    const level = Math.max(0, Math.min(1, event.value / 9));
    this.onLevel?.(level);
  };

  private handleError = (event: ExpoSpeechRecognitionErrorEvent) => {
    const code = event.error;

    // Our own abort() during a deliberate stop or mode switch.
    if (code === 'aborted' && !this.shouldRun) return;

    const severity = classify(code);
    log('error', code, severity, event.message);

    if (severity === 'fatal') {
      this.shouldRun = false;
      this.patch({
        status: 'error',
        error: messageFor(code),
        fatal: true,
        interim: '',
        permission: code === 'not-allowed' ? 'denied' : this.state.permission,
        // A missing language is the one fatal error with an obvious next step,
        // so the UI is handed one instead of a dead end.
        suggestedLocale:
          code === 'language-not-supported'
            ? (findTranscribeLocale(this.options.locale)?.fallback ?? 'en-IN')
            : this.state.suggestedLocale,
      });
      if (code === 'language-not-supported') void this.probeLocales();
      void audioArbiter.release('transcribe');
      return;
    }

    if (severity === 'transient') {
      this.transientFailures += 1;
      if (this.transientFailures >= TRANSIENT_FAILURE_LIMIT) {
        this.shouldRun = false;
        this.patch({ status: 'error', error: messageFor(code), fatal: false, interim: '' });
        void audioArbiter.release('transcribe');
        return;
      }
      // Keep the message visible while the retry happens underneath.
      this.patch({ error: messageFor(code), fatal: false });
      this.armRestart(TRANSIENT_RESTART_DELAY_MS);
      return;
    }

    // Benign: silence. Clear any stale message and go round again.
    if (this.state.error) this.patch({ error: null });
    this.armRestart(BENIGN_RESTART_DELAY_MS);
  };

  /**
   * Safety net for platforms that report an error without then reporting the
   * session as ended.
   *
   * `end` is the normal restart trigger and is the one that carries the right
   * delay, so this only ever needs to cover the case where `end` never comes.
   * Because `scheduleRestart` cancels any timer already pending, an `end` that
   * does arrive simply replaces this one — the recogniser is still restarted
   * exactly once, never twice.
   */
  private armRestart(delay: number) {
    if (!this.shouldRun) return;
    if (audioArbiter.getOwner() !== 'transcribe') return;
    this.scheduleRestart(delay);
  }

  private handleEnd = () => {
    this.patch({ speaking: false, interim: '' });
    this.onLevel?.(0);

    if (!this.shouldRun) return;
    if (audioArbiter.getOwner() !== 'transcribe') return;

    this.idleRestarts += 1;
    const delay =
      this.idleRestarts > IDLE_RESTART_LIMIT
        ? BACKOFF_RESTART_DELAY_MS
        : this.transientFailures > 0
          ? TRANSIENT_RESTART_DELAY_MS
          : this.state.words > 0 || this.state.lines.length > 0
            ? RESTART_DELAY_MS
            : BENIGN_RESTART_DELAY_MS;

    this.scheduleRestart(delay);
  };

  // ── Restart scheduling ────────────────────────────────────────────────────

  private clearRestart() {
    if (!this.restartTimer) return;
    clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }

  /**
   * Re-open the recogniser without going back through the arbiter: this mode
   * already owns the microphone, and a re-acquire would needlessly release and
   * re-take the hardware between every sentence.
   */
  private scheduleRestart(delay: number) {
    this.clearRestart();
    const token = this.token;

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (token !== this.token) return;
      if (!this.shouldRun) return;
      if (audioArbiter.getOwner() !== 'transcribe') return;

      try {
        ExpoSpeechRecognitionModule.start(this.buildOptions());
        this.active = true;
        if (this.state.status !== 'listening') this.patch({ status: 'listening' });
      } catch {
        // The recogniser refused to reopen. Fall back to a full, arbitrated
        // restart, which releases and re-takes the microphone cleanly.
        this.transientFailures += 1;
        if (this.transientFailures >= TRANSIENT_FAILURE_LIMIT) {
          this.shouldRun = false;
          this.patch({ status: 'error', error: messageFor('audio-capture'), fatal: false });
          void audioArbiter.release('transcribe');
          return;
        }
        void this.start();
      }
    }, delay);
  }
}

/** Module singleton — survives Fast Refresh, so sessions are never duplicated. */
export const transcribeEngine = new TranscribeEngine();
