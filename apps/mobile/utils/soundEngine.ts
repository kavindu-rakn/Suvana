/**
 * SoundGuard — Real-Time Sound Recognition Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * A framework-free singleton owning audio capture, feature extraction, ONNX
 * inference and detection state. React binds to it through EngineProvider via
 * `useSyncExternalStore`; nothing here imports React.
 *
 * Pipeline
 *   LiveAudioStream (16 kHz Int16 PCM, VOICE_RECOGNITION source)
 *     → Float32 → resample to 22.05 kHz → 3 s circular buffer
 *     → every hop: block-level gate → mel-spectrogram → ONNX
 *     → prediction gate → suppression / mute → publish → history
 *
 * ── Why it used to hallucinate in silence ────────────────────────────────────
 *
 * Three independent faults stacked up.
 *
 *   1. The model has no "background" class. Given any input it must return a
 *      distribution over seven sounds, so on silence it returns *something*.
 *      Everything below exists to make sure that something never reaches the
 *      user. The permanent fix is a background/negative class at training
 *      time; this is the correct client-side mitigation until then.
 *
 *   2. Feature extraction did not match training (see melSpectrogram.ts). The
 *      network was being fed out-of-distribution input on every single window,
 *      which produces arbitrary — and often confident — output.
 *
 *   3. The gate was an absolute RMS threshold. Microphone gain varies by an
 *      order of magnitude across Android devices, so one fixed number is
 *      simultaneously too high on a quiet handset and far too low on a loud
 *      one. On a device whose idle noise sits above the threshold, *every*
 *      sensitivity level passed every window — which is exactly why the
 *      sensitivity slider appeared to do nothing.
 *
 * The gate is now relative to a learned noise floor, and sensitivity moves five
 * parameters at once, all of them surfaced live in the UI so the effect is
 * directly observable:
 *
 *      trigger margin over the noise floor   (dB)
 *      absolute minimum block level          (guards a silent room)
 *      softmax confidence floor
 *      top-1 vs top-2 margin
 *      consecutive agreeing windows required
 *
 * ── What happens after a detection ───────────────────────────────────────────
 *
 * `announce()` is the single fan-out point, and it is reached by real audio and
 * by the demo triggers alike. Four consumers, in order of how likely they are to
 * be the one that actually reaches the user:
 *
 *   1. the sound's haptic signature      (works in a pocket)
 *   2. the screen strobe, if critical    (works face-up on a table)
 *   3. an OS notification, if backgrounded
 *   4. the threat escalation protocol, if critical
 *
 * Keeping them together — rather than scattered across the screens that happen
 * to be mounted — is what makes "detected while the app was closed" behave
 * identically to "detected while you were watching".
 *
 * ── Background execution ─────────────────────────────────────────────────────
 *
 * Since Android 11 a backgrounded app reads silence from the microphone rather
 * than failing, which for a safety tool is the worst kind of failure: the
 * pipeline looks healthy and hears nothing. `start()` therefore promotes the
 * process to a microphone-typed foreground service before opening capture — at
 * a moment when the app is by definition visible, which is also the only moment
 * Android 12+ permits starting one. See `backgroundService.ts`.
 */

import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';

import {
  CLIP_SAMPLES,
  SAMPLE_RATE,
  computeBlockRms,
  computeRMS,
  extractMelSpectrogramAsync,
} from './audio/melSpectrogram';
import {
  GATE_BLOCK_SECONDS,
  createGateState,
  evaluateGate,
  resetGateState,
  toDb,
} from './audio/gate';
import { audioArbiter } from './audioArbiter';
import { backgroundCapture } from './backgroundService';
import { cancelSignature, playSignature } from './hapticSignatures';
import {
  clearAllNotifications,
  ensureNotificationSetup,
  notifyDetection,
  requestNotificationPermission,
} from './notifications';
import { threatEscalation } from './threatEscalation';
import {
  DEFAULT_SETTINGS,
  SOUND_DISPLAY_NAMES,
  SOUND_LABELS,
  SOUND_THREAT,
  saveDetectionEvent,
  type AppSettings,
  type SoundLabel,
  type ThreatLevel,
} from './storage';

/** Flip to true to restore verbose pipeline diagnostics in Metro. */
const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log('[SoundGuard]', ...args);
};

// ─── Capture configuration ───────────────────────────────────────────────────

const CAPTURE_RATE = 16000;
/** MediaRecorder.AudioSource.VOICE_RECOGNITION — no AGC, no noise suppression. */
const AUDIO_SOURCE = 6;
const CAPTURE_BUFFER = 4096;

// ─── ONNX configuration ──────────────────────────────────────────────────────

const ONNX_INPUT_NAME = 'serving_default_input_layer:0';
const ONNX_OUTPUT_NAME = 'StatefulPartitionedCall:1_0';
const ONNX_INPUT_DIMS = [1, 128, 128, 1];

// ─── Gate tuning ─────────────────────────────────────────────────────────────

/** Level analysis block: 125 ms, so a short transient dominates its own block. */
const BLOCK_SAMPLES = Math.round(SAMPLE_RATE * GATE_BLOCK_SECONDS);
const MAX_BLOCKS = Math.floor(CLIP_SAMPLES / BLOCK_SAMPLES); // 24

/**
 * Sensitivity profile, index 0–4 for levels 1–5.
 *
 * triggerDb    how far the loudest block must sit above the learned noise floor
 * absMinLevel  absolute block RMS floor, so a silent room cannot trigger even
 *              when the learned floor approaches zero
 * confidence   softmax floor for the winning class
 * margin       required gap between the top two classes; a diffuse output is
 *              the signature of an input the model has no answer for
 * agree        consecutive windows that must name the same class
 * hopSeconds   analysis cadence — the dominant term in detection latency
 */
const SENSITIVITY_PROFILE = [
  { triggerDb: 15.0, absMinLevel: 0.02, confidence: 0.8, margin: 0.45, agree: 3, hopSeconds: 1.5 },
  { triggerDb: 12.0, absMinLevel: 0.014, confidence: 0.72, margin: 0.36, agree: 2, hopSeconds: 1.25 },
  { triggerDb: 9.0, absMinLevel: 0.01, confidence: 0.65, margin: 0.28, agree: 2, hopSeconds: 1.0 },
  { triggerDb: 6.5, absMinLevel: 0.007, confidence: 0.58, margin: 0.2, agree: 2, hopSeconds: 0.85 },
  { triggerDb: 4.5, absMinLevel: 0.0045, confidence: 0.5, margin: 0.12, agree: 1, hopSeconds: 0.7 },
] as const;

/** An unmistakable single window publishes without waiting for agreement. */
const INSTANT_CONFIDENCE = 0.92;
const INSTANT_MARGIN = 0.55;

const DETECTION_HOLD_MS = 5000;
const DISMISS_SUPPRESS_MS = 25000;
const HISTORY_DEDUPE_MS = 8000;
const ANALYSIS_TIMEOUT_MS = 15000;

// ─── Public types ────────────────────────────────────────────────────────────

export type EngineStatus = 'idle' | 'starting' | 'listening' | 'error';
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PermissionStatus = 'unknown' | 'granted' | 'denied';

export type Detection = {
  id: string;
  label: SoundLabel;
  name: string;
  confidence: number;
  threat: ThreatLevel;
  firstSeen: number;
  lastSeen: number;
  simulated: boolean;
};

export type EngineState = {
  status: EngineStatus;
  modelStatus: ModelStatus;
  permission: PermissionStatus;
  detection: Detection | null;
  analyzing: boolean;
  /** True while the engine is learning the room's noise floor. */
  calibrating: boolean;
  lastLatencyMs: number;
  windowsAnalyzed: number;
  dismissed: SoundLabel[];
  error: string | null;

  // ── Live gate diagnostics, so sensitivity is visibly doing something ──
  /** Loudest 125 ms block in the last window, dBFS. */
  levelDb: number;
  /** Learned ambient noise floor, dBFS. */
  floorDb: number;
  /** Required level − floor margin at the current sensitivity, dB. */
  triggerDb: number;
  /** Whether the last window cleared the gate. */
  gateOpen: boolean;
};

export type EngineEvent =
  | { type: 'detection'; detection: Detection }
  /** Ask the UI to strobe. Emitted by the engine so the policy lives in one place. */
  | { type: 'flash'; reason: 'critical' | 'test' }
  | { type: 'dismissed'; label: SoundLabel }
  | { type: 'reset' }
  | { type: 'stopped' };

const NO_LABELS: SoundLabel[] = [];

const INITIAL_STATE: EngineState = {
  status: 'idle',
  modelStatus: 'idle',
  permission: 'unknown',
  detection: null,
  analyzing: false,
  calibrating: false,
  lastLatencyMs: 0,
  windowsAnalyzed: 0,
  dismissed: NO_LABELS,
  error: null,
  levelDb: -120,
  floorDb: -120,
  triggerDb: SENSITIVITY_PROFILE[2].triggerDb,
  gateOpen: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Prompt for RECORD_AUDIO. Exported so onboarding can ask before first use. */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Microphone access',
      message:
        'SoundGuard listens to your surroundings on-device to recognise important sounds. Audio never leaves your phone.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/** True when the app is not the thing on screen. */
function backgrounded(): boolean {
  return AppState.currentState !== 'active';
}

// ─── Engine ──────────────────────────────────────────────────────────────────

class SoundEngine {
  private state: EngineState = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: EngineEvent) => void>();

  /** Level meter sink. Wired to a Reanimated shared value — bypasses React. */
  onLevel: ((level: number) => void) | null = null;

  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  // ── Audio ──
  private ring = new Float32Array(CLIP_SAMPLES);
  private writeIdx = 0;
  private filled = 0;
  private samplesSinceAnalysis = 0;
  private resampleScratch = new Float32Array(16384);
  private analysisBuf = new Float32Array(CLIP_SAMPLES);
  private blockRms = new Float32Array(MAX_BLOCKS);
  private blockScratch = new Float32Array(MAX_BLOCKS);
  private audioSub: { remove: () => void } | null = null;

  // ── Model ──
  private session: InferenceSession | null = null;
  private modelPromise: Promise<InferenceSession | null> | null = null;

  // ── Scheduling ──
  /**
   * The user's intent, as distinct from `running` (the hardware's state).
   * `start()` has two awaits in it — the permission dialog and the arbiter
   * hand-over — and the user can leave the mode during either. Without this
   * flag a stop issued mid-start would be overtaken by the start it cancelled.
   */
  private wanted = false;
  private running = false;
  /**
   * Single-flight mutex. Only `analyze()` clears it — start/stop deliberately
   * leave it alone so a stop mid-analysis cannot let a second extraction begin
   * against the shared DSP scratch. The in-flight run sees the session change
   * and bails.
   */
  private analyzing = false;
  private analysisStartedAt = 0;
  private sessionId = 0;

  // ── Gate state ──
  private gateState = createGateState();

  // ── Prediction agreement ──
  private pendingLabel: SoundLabel | null = null;
  private pendingCount = 0;

  // ── Detection bookkeeping ──
  private suppressUntil = new Map<SoundLabel, number>();
  private lastLoggedAt = new Map<SoundLabel, number>();
  private dismissedKey = '';

  // ───────────────────────────────────────────────────────────────────────────
  // Store contract
  // ───────────────────────────────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): EngineState => this.state;

  onEvent = (listener: (e: EngineEvent) => void): (() => void) => {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  };

  private emit(event: EngineEvent) {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch {
        /* one bad subscriber must not stop the others */
      }
    });
  }

  /** Immutable, change-gated publish. */
  private patch(next: Partial<EngineState>) {
    let changed = false;
    for (const key of Object.keys(next) as (keyof EngineState)[]) {
      if (this.state[key] !== next[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        /* ignore */
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Settings
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Replace the live settings. Every value is consulted at the start of the
   * next window, so a change takes effect within one hop — no restart.
   */
  setSettings(settings: AppSettings) {
    const previous = this.settings;
    this.settings = settings;

    // Reflect the new trigger margin immediately, even between windows, so the
    // Settings screen and the diagnostics row can never disagree.
    this.patch({ triggerDb: this.profile().triggerDb });

    if (previous.sensitivity !== settings.sensitivity) {
      // A different agreement requirement invalidates a partially built streak.
      this.pendingLabel = null;
      this.pendingCount = 0;
    }

    const current = this.state.detection;
    if (current && settings.mutedSounds.includes(current.label)) {
      this.patch({ detection: null });
    }

    // The escalation protocol is configured from the same object, so it can
    // never be reading a different generation of the user's preferences than
    // the engine that feeds it.
    threatEscalation.configure({
      enabled: settings.autoSos,
      countdownSeconds: settings.threatCountdownSeconds,
      haptics: settings.hapticFeedback,
      notifications: settings.backgroundAlerts,
    });

    // Turning background listening off mid-session gives the service back
    // immediately rather than at the next start/stop cycle.
    if (previous.backgroundListening && !settings.backgroundListening) {
      void backgroundCapture.stop();
    } else if (!previous.backgroundListening && settings.backgroundListening && this.running) {
      void this.promoteToBackgroundService();
    }
  }

  /** Sensitivity after the optional night-time boost. */
  private effectiveSensitivity(): number {
    let level = this.settings.sensitivity;
    if (this.settings.nightMode) {
      const hour = new Date().getHours();
      if (hour >= 21 || hour < 6) level += 1;
    }
    return Math.min(5, Math.max(1, level));
  }

  private profile() {
    const idx = this.effectiveSensitivity() - 1;
    return SENSITIVITY_PROFILE[idx] ?? SENSITIVITY_PROFILE[2];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Model
  // ───────────────────────────────────────────────────────────────────────────

  loadModel(): Promise<InferenceSession | null> {
    if (this.session) return Promise.resolve(this.session);
    if (this.modelPromise) return this.modelPromise;

    this.patch({ modelStatus: 'loading' });

    this.modelPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const modelModule = require('../assets/model/sound_model.onnx');
        const asset = Asset.fromModule(modelModule);

        if (!asset.localUri) await asset.downloadAsync();
        if (!asset.localUri) throw new Error('expo-asset returned a null localUri');

        const destUri = `${FileSystem.documentDirectory}sound_model.onnx`;
        const [cached, bundled] = await Promise.all([
          FileSystem.getInfoAsync(destUri),
          FileSystem.getInfoAsync(asset.localUri),
        ]);

        // Freshness by byte size: an O(1) stat beats hashing a 9 MB model on
        // every cold start. Distinct sentinels so "missing" never compares
        // equal to "present but unmeasurable".
        const cachedSize = cached.exists ? ((cached as { size?: number }).size ?? -1) : -1;
        const bundledSize = bundled.exists ? ((bundled as { size?: number }).size ?? -2) : -2;

        if (!cached.exists || cachedSize !== bundledSize) {
          await FileSystem.copyAsync({ from: asset.localUri, to: destUri });
          log('model copied', bundledSize, 'bytes');
        }

        const session = await InferenceSession.create(destUri.replace(/^file:\/\//, ''), {
          executionProviders: ['cpu'],
        });

        this.session = session;
        this.patch({ modelStatus: 'ready', error: null });
        log('ONNX session ready');
        return session;
      } catch (err) {
        log('model load failed', err);
        this.modelPromise = null;
        this.patch({
          modelStatus: 'error',
          error: 'The recognition model could not be loaded. Reopen the app to retry.',
        });
        return null;
      }
    })();

    return this.modelPromise;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Begin monitoring.
   *
   * Capture is never opened directly. The microphone is a single exclusive
   * device shared with Live Transcribe, so ownership is taken through
   * `audioArbiter`, which releases the other mode, lets the audio HAL settle,
   * and only then runs `beginCapture` — inside the lock, so no competing mode
   * can slip in between "we own it" and "we opened it".
   *
   * Permission is requested *before* acquiring, so a dialog the user leaves on
   * screen never blocks the other mode from releasing the hardware.
   *
   * ── Background readiness ─────────────────────────────────────────────────
   *
   * This is also the one moment at which the app is guaranteed to be visible
   * and the user is unambiguously asking to be monitored, which makes it the
   * only correct place to do two things:
   *
   *   • ask for notification permission — the request explains itself here, and
   *     nowhere else;
   *   • start the microphone foreground service — Android 12+ forbids starting
   *     one from the background, so it has to be now or never.
   */
  async start(): Promise<void> {
    if (this.running || this.state.status === 'starting') return;

    this.wanted = true;
    this.patch({ status: 'starting', error: null });

    const granted = await requestMicrophonePermission();
    if (!granted) {
      this.wanted = false;
      this.patch({
        status: 'idle',
        permission: 'denied',
        error: 'Microphone access is required to listen. Enable it in system settings.',
      });
      return;
    }
    this.patch({ permission: 'granted' });

    // The user may have left the mode while the permission dialog was up.
    if (!this.wanted) {
      this.patch({ status: 'idle' });
      return;
    }

    void this.loadModel();

    // Both are deliberately awaited-but-tolerant: a refused notification
    // permission or an unavailable service degrades the feature set, it does
    // not stop monitoring. Neither can reject.
    if (this.settings.backgroundAlerts) {
      await requestNotificationPermission();
    } else {
      void ensureNotificationSetup();
    }
    if (!this.wanted) {
      this.patch({ status: 'idle' });
      return;
    }

    if (this.settings.backgroundListening) await this.promoteToBackgroundService();

    const acquired = await audioArbiter.acquire({
      id: 'soundguard',
      release: () => this.teardown(),
      activate: () => this.beginCapture(),
    });

    if (!acquired) {
      this.wanted = false;
      void backgroundCapture.stop();
      log('capture failed');
      this.patch({
        status: 'error',
        calibrating: false,
        error: 'Could not open the microphone. Close other recording apps and try again.',
      });
      return;
    }

    // Stopped while the hand-over was in flight. The arbiter queue already has
    // the matching release behind us, but saying so explicitly keeps the state
    // machine readable — and both paths are idempotent.
    if (!this.wanted) this.stop();
  }

  /**
   * Ask the OS to treat this process as foreground for microphone purposes.
   *
   * Resolves whatever happens. On iOS, on the web, and in a build made before
   * the background plugin was added there is no service to start, and the app
   * simply keeps its previous foreground-only behaviour — which is why nothing
   * downstream branches on the result.
   */
  private async promoteToBackgroundService(): Promise<void> {
    if (!backgroundCapture.available) return;
    await backgroundCapture.start(
      'SoundGuard is listening',
      'Recognising important sounds around you. Audio never leaves this phone.',
    );
  }

  /**
   * Open the native stream. Runs inside the arbiter's lock; throwing unwinds
   * the acquisition, so a failed open can never leave a half-owned microphone.
   */
  private beginCapture(): void {
    this.sessionId += 1;
    this.running = true;
    this.resetBuffers();
    this.resetGate();
    this.suppressUntil.clear();
    this.lastLoggedAt.clear();
    this.dismissedKey = '';

    this.patch({
      status: 'listening',
      detection: null,
      windowsAnalyzed: 0,
      dismissed: NO_LABELS,
      analyzing: false,
      calibrating: true,
      error: null,
      triggerDb: this.profile().triggerDb,
      gateOpen: false,
    });

    LiveAudioStream.init({
      sampleRate: CAPTURE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: AUDIO_SOURCE,
      bufferSize: CAPTURE_BUFFER,
      // Required by the package's typings (inherited from
      // react-native-audio-record) but never read by the Android module.
      wavFile: '',
    });

    // `AudioRecord.on` clears previous listeners internally, so repeated
    // start/stop cycles cannot accumulate duplicate handlers.
    this.audioSub = LiveAudioStream.on('data', this.handleChunk) as unknown as {
      remove: () => void;
    } | null;
    LiveAudioStream.start();
    log('capture started');
  }

  /**
   * Stop monitoring.
   *
   * The teardown runs synchronously so the button flips in the same frame as
   * the tap, and the arbiter is then told the microphone is free. Handing the
   * release to the arbiter instead of doing it there keeps ownership bookkeeping
   * in exactly one place, and keeps mode switches ordered.
   */
  stop(): void {
    this.wanted = false;
    this.teardown();
    void audioArbiter.release('soundguard');

    // Nothing is listening any more, so nothing may claim to be: silence any
    // half-played signature, drop the shade entries and disarm a countdown that
    // is no longer backed by a live pipeline. The foreground service is given
    // back in `teardown`, which covers the hand-over to Live Transcribe as well
    // as this deliberate stop.
    cancelSignature();
    threatEscalation.reset();
    void clearAllNotifications();
  }

  /**
   * Release every native audio resource. Idempotent, never throws, and never
   * calls back into the arbiter — it is the arbiter's own release callback.
   */
  private teardown(): void {
    // Unconditionally, and before the early return: a microphone-typed
    // foreground service that is not capturing is a permanent notification
    // promising something untrue, and this runs on *every* way of losing the
    // microphone — including the arbiter handing it to Live Transcribe, which
    // never goes through `stop()`.
    void backgroundCapture.stop();

    if (!this.running) {
      this.patch({
        status: this.state.status === 'error' ? 'error' : 'idle',
        detection: null,
        analyzing: false,
        calibrating: false,
      });
      return;
    }

    // Invalidating the session id makes any analysis already in flight discard
    // its result instead of publishing a detection after the stop.
    this.sessionId += 1;
    this.running = false;

    try {
      this.audioSub?.remove();
    } catch {
      /* ignore */
    }
    this.audioSub = null;

    try {
      LiveAudioStream.stop();
    } catch {
      /* ignore */
    }

    this.resetBuffers();
    this.resetGate();
    this.suppressUntil.clear();
    this.dismissedKey = '';
    this.onLevel?.(0);

    this.patch({
      status: 'idle',
      detection: null,
      analyzing: false,
      calibrating: false,
      dismissed: NO_LABELS,
      gateOpen: false,
      levelDb: -120,
    });
    this.emit({ type: 'stopped' });
    log('capture stopped');
  }

  async toggle(): Promise<void> {
    // `wanted` is checked as well as `running`, so a second tap while the
    // permission dialog or the microphone hand-over is still in flight cancels
    // the pending start instead of being swallowed.
    if (this.running || this.wanted) this.stop();
    else await this.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Interactive controls
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Dismiss the active detection. Fully synchronous, so the card disappears in
   * the same frame as the tap. The class is suppressed for a cool-off period
   * and the buffer is flushed — otherwise the sound still sitting in the 3 s
   * window would be re-reported on the very next hop.
   */
  dismiss(): void {
    const current = this.state.detection;
    if (!current) return;

    this.suppressUntil.set(current.label, Date.now() + DISMISS_SUPPRESS_MS);
    this.resetBuffers();
    this.pendingLabel = null;
    this.pendingCount = 0;

    this.patch({ detection: null });
    this.syncDismissed();

    playSignature('dismiss', this.settings.hapticFeedback);
    this.emit({ type: 'dismissed', label: current.label });
  }

  undoDismiss(): void {
    if (this.suppressUntil.size === 0) return;
    this.suppressUntil.clear();
    this.dismissedKey = '';
    this.patch({ dismissed: NO_LABELS });
  }

  /**
   * Flush the buffer, clear the detection, drop suppressions and re-learn the
   * room. Capture keeps running, so there is no gap.
   */
  reset(): void {
    this.resetBuffers();
    this.resetGate();
    this.suppressUntil.clear();
    this.lastLoggedAt.clear();
    this.dismissedKey = '';
    this.onLevel?.(0);

    this.patch({
      detection: null,
      dismissed: NO_LABELS,
      windowsAnalyzed: 0,
      error: null,
      calibrating: this.running,
      gateOpen: false,
    });

    // "Reset listening" means exactly that, so the escalation protocol's
    // re-arm cool-offs are cleared too — otherwise a user who cancelled a
    // false alarm would find the real one that follows silently swallowed.
    threatEscalation.clearSuppressions();

    playSignature('reset', this.settings.hapticFeedback);
    this.emit({ type: 'reset' });
  }

  /**
   * Publish a detection as if it had come from the microphone.
   *
   * Routed through the *same* `announce` fan-out as a real detection, so the
   * demo exercises the real haptic signature, the real strobe policy, the real
   * notification path and the real escalation protocol. A demo that runs
   * through a parallel implementation proves nothing about the app.
   *
   * The escalation protocol still sees `simulated: true` and carries it through
   * to the SOS screen as a drill, which is what stops a demo tap from opening a
   * message to somebody's family.
   */
  simulate(label: SoundLabel): void {
    const now = Date.now();
    const detection: Detection = {
      id: `sim-${label}-${now}`,
      label,
      name: SOUND_DISPLAY_NAMES[label],
      confidence: 0.93,
      threat: SOUND_THREAT[label],
      firstSeen: now,
      lastSeen: now,
      simulated: true,
    };

    this.patch({ detection });
    this.announce(detection);
  }

  /** Fire the screen strobe on demand, ignoring the setting. Used by Settings. */
  testFlash(): void {
    this.emit({ type: 'flash', reason: 'test' });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Audio capture
  // ───────────────────────────────────────────────────────────────────────────

  private resetBuffers() {
    this.ring.fill(0);
    this.writeIdx = 0;
    this.filled = 0;
    this.samplesSinceAnalysis = 0;
  }

  private resetGate() {
    resetGateState(this.gateState);
    this.pendingLabel = null;
    this.pendingCount = 0;
  }

  private syncDismissed() {
    const now = Date.now();
    const list: SoundLabel[] = [];
    for (const label of SOUND_LABELS) {
      const until = this.suppressUntil.get(label);
      if (until === undefined) continue;
      if (until > now) list.push(label);
      else this.suppressUntil.delete(label);
    }

    const key = list.join(',');
    if (key === this.dismissedKey) return;
    this.dismissedKey = key;
    this.patch({ dismissed: list });
  }

  /**
   * Per-chunk handler: decode, resample, append, hand off. Deliberately short —
   * the expensive work is scheduled, never inlined here.
   */
  private handleChunk = (base64Chunk: string): void => {
    if (!this.running) return;

    try {
      const bytes = Buffer.from(base64Chunk, 'base64');
      const sampleCount = bytes.length >> 1;
      if (sampleCount === 0) return;

      const needed = Math.ceil((sampleCount * SAMPLE_RATE) / CAPTURE_RATE) + 2;
      if (this.resampleScratch.length < needed) {
        this.resampleScratch = new Float32Array(needed * 2);
      }

      // Decode signed little-endian Int16 by hand. An Int16Array view over the
      // Buffer would throw whenever the pooled byteOffset happens to be odd.
      const src = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const lo = bytes[i * 2] as number;
        const hi = bytes[i * 2 + 1] as number;
        let v = (hi << 8) | lo;
        if (v >= 0x8000) v -= 0x10000;
        src[i] = v / 32768;
      }

      const level = computeRMS(src);
      this.onLevel?.(Math.min(1, Math.sqrt(level * 7)));

      const outLen = this.resample(src, sampleCount);
      this.appendToRing(this.resampleScratch, outLen);
    } catch (err) {
      log('chunk error', err);
    }
  };

  private resample(src: Float32Array, srcLen: number): number {
    const ratio = SAMPLE_RATE / CAPTURE_RATE;
    const outLen = Math.floor(srcLen * ratio);
    const out = this.resampleScratch;
    const last = srcLen - 1;

    for (let i = 0; i < outLen; i++) {
      const pos = i / ratio;
      const lo = Math.floor(pos);
      const hi = lo < last ? lo + 1 : last;
      const frac = pos - lo;
      out[i] = (src[lo] as number) * (1 - frac) + (src[hi] as number) * frac;
    }
    return outLen;
  }

  private appendToRing(data: Float32Array, length: number) {
    const ring = this.ring;
    const cap = CLIP_SAMPLES;
    let idx = this.writeIdx;

    for (let i = 0; i < length; i++) {
      ring[idx] = data[i] as number;
      idx += 1;
      if (idx === cap) idx = 0;
    }

    this.writeIdx = idx;
    this.filled = Math.min(cap, this.filled + length);
    this.samplesSinceAnalysis += length;

    // Watchdog: if a native call never settles, release the mutex rather than
    // silently going deaf for the rest of the session.
    if (this.analyzing && Date.now() - this.analysisStartedAt > ANALYSIS_TIMEOUT_MS) {
      log('analysis watchdog fired — releasing the mutex');
      this.analyzing = false;
    }

    const hopSamples = Math.floor(this.profile().hopSeconds * SAMPLE_RATE);
    if (!this.analyzing && this.filled >= cap && this.samplesSinceAnalysis >= hopSamples) {
      this.samplesSinceAnalysis = 0;
      void this.analyze();
    }
  }

  /** Unwrap the circular buffer into `analysisBuf`, oldest sample first. */
  private linearise() {
    const cap = CLIP_SAMPLES;
    const start = this.writeIdx;
    const tail = cap - start;
    this.analysisBuf.set(this.ring.subarray(start, cap), 0);
    if (tail < cap) this.analysisBuf.set(this.ring.subarray(0, start), tail);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Gate
  // ───────────────────────────────────────────────────────────────────────────

  /** Evaluate the adaptive gate for the current window. See audio/gate.ts. */
  private evaluateGate(): { open: boolean; levelDb: number; floorDb: number } {
    const blocks = computeBlockRms(this.analysisBuf, BLOCK_SAMPLES, this.blockRms);
    const wasCalibrating = this.gateState.calibrationLeft > 0;

    const result = evaluateGate(
      this.blockRms,
      blocks,
      this.blockScratch,
      this.profile(),
      this.gateState,
    );

    if (wasCalibrating && !result.calibrating) this.patch({ calibrating: false });

    return { open: result.open, levelDb: result.levelDb, floorDb: result.floorDb };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Analysis
  // ───────────────────────────────────────────────────────────────────────────

  private async analyze(): Promise<void> {
    if (this.analyzing || !this.running) return;

    const session = this.session;
    if (!session) return; // model still opening; the next hop retries

    const mySession = this.sessionId;
    const startedAt = Date.now();
    this.analyzing = true;
    this.analysisStartedAt = startedAt;

    try {
      this.linearise();

      const profile = this.profile();
      const gate = this.evaluateGate();

      this.patch({
        levelDb: Math.round(gate.levelDb),
        floorDb: Math.round(gate.floorDb),
        triggerDb: profile.triggerDb,
        gateOpen: gate.open,
      });

      if (!gate.open) {
        this.decayPending();
        this.expireDetection();
        return;
      }

      this.patch({ analyzing: true });

      const features = await extractMelSpectrogramAsync(this.analysisBuf);
      if (mySession !== this.sessionId || !this.running) return;

      const result = await this.infer(session, features);
      if (mySession !== this.sessionId || !this.running) return;

      this.patch({
        windowsAnalyzed: this.state.windowsAnalyzed + 1,
        lastLatencyMs: Date.now() - startedAt,
      });

      if (!result) {
        this.decayPending();
        this.expireDetection();
        return;
      }

      const { label, confidence, margin } = result;

      // Prediction gate. A diffuse distribution means the network has no answer
      // for this input — which is precisely what silence and unmodelled noise
      // produce, given there is no background class to fall back to.
      if (confidence < profile.confidence || margin < profile.margin) {
        log(
          `rejected ${label} conf=${confidence.toFixed(2)} margin=${margin.toFixed(2)} ` +
            `(need ${profile.confidence}/${profile.margin})`,
        );
        this.decayPending();
        this.expireDetection();
        return;
      }

      // Temporal agreement. Overlapping windows mean a genuine sound is present
      // in several consecutive hops; a one-off spike is not.
      if (label === this.pendingLabel) {
        this.pendingCount = Math.min(this.pendingCount + 1, 10);
      } else {
        this.pendingLabel = label;
        this.pendingCount = 1;
      }

      const unmistakable = confidence >= INSTANT_CONFIDENCE && margin >= INSTANT_MARGIN;
      if (!unmistakable && this.pendingCount < profile.agree) {
        log(`holding ${label} (${this.pendingCount}/${profile.agree})`);
        this.expireDetection();
        return;
      }

      this.publish(label, confidence);
    } catch (err) {
      log('analysis error', err);
      this.expireDetection();
    } finally {
      this.analyzing = false;
      if (this.state.analyzing) this.patch({ analyzing: false });
    }
  }

  private decayPending() {
    if (this.pendingCount > 0) this.pendingCount -= 1;
    if (this.pendingCount === 0) this.pendingLabel = null;
  }

  private async infer(
    session: InferenceSession,
    features: Float32Array,
  ): Promise<{ label: SoundLabel; confidence: number; margin: number } | null> {
    try {
      const input = new Tensor('float32', features, ONNX_INPUT_DIMS);
      const results = await session.run({ [ONNX_INPUT_NAME]: input });

      let output = results[ONNX_OUTPUT_NAME];
      if (!output) {
        const firstKey = Object.keys(results)[0];
        if (!firstKey) return null;
        output = results[firstKey];
      }
      if (!output) return null;

      const probs = output.data as Float32Array;
      if (!probs || probs.length === 0) return null;

      let bestIdx = 0;
      let best = -Infinity;
      let second = -Infinity;
      for (let i = 0; i < probs.length; i++) {
        const p = probs[i] as number;
        if (p > best) {
          second = best;
          best = p;
          bestIdx = i;
        } else if (p > second) {
          second = p;
        }
      }

      const label = SOUND_LABELS[bestIdx];
      if (!label) return null;

      if (DEBUG) {
        log('probs', SOUND_LABELS.map((l, i) => `${l}=${(probs[i] ?? 0).toFixed(3)}`).join(' '));
      }

      return {
        label,
        confidence: best,
        margin: best - (Number.isFinite(second) ? second : 0),
      };
    } catch (err) {
      log('inference error', err);
      return null;
    }
  }

  private publish(label: SoundLabel, confidence: number) {
    const now = Date.now();

    if (this.settings.mutedSounds.includes(label)) {
      this.expireDetection();
      return;
    }

    const suppressedUntil = this.suppressUntil.get(label);
    if (suppressedUntil && suppressedUntil > now) {
      this.expireDetection();
      return;
    }
    if (suppressedUntil) {
      this.suppressUntil.delete(label);
      this.syncDismissed();
    }

    const threat = SOUND_THREAT[label];
    const previous = this.state.detection;
    const isSameClass = previous?.label === label && !previous.simulated;

    const detection: Detection = {
      // Stable id across confirming windows: the card updates in place rather
      // than remounting its animations.
      id: isSameClass ? previous.id : `${label}-${now}`,
      label,
      name: SOUND_DISPLAY_NAMES[label],
      confidence,
      threat,
      firstSeen: isSameClass ? previous.firstSeen : now,
      lastSeen: now,
      simulated: false,
    };

    this.patch({ detection });

    // Everything below is "this is a *new* thing happening", not "the same
    // thing is still happening". Re-firing the alert on every confirming window
    // would turn a continuous siren into an unreadable buzz and a column of
    // duplicate notifications.
    if (!isSameClass) this.announce(detection);

    this.persist(detection);
  }

  /**
   * The alert fan-out: haptics, strobe, OS notification, escalation.
   *
   * Shared by real and simulated detections so the demo triggers exercise
   * exactly the code path a microphone detection takes — a demo that runs
   * through a second implementation is a demo that proves nothing.
   */
  private announce(detection: Detection) {
    const { threat, label } = detection;

    // 1. Haptic signature. The primary output channel for a Deaf user, and the
    //    only one that works with the phone in a pocket.
    playSignature(label, this.settings.hapticFeedback);

    // 2. Screen strobe, for a phone lying face up on a table.
    if (threat === 'critical' && this.settings.visualFlash) {
      this.emit({ type: 'flash', reason: 'critical' });
    }

    // 3. System notification, but only when the app is not the thing on screen.
    //    In the foreground the detection card is already the alert; posting as
    //    well would stack the shade with things the user has already seen.
    if (this.settings.backgroundAlerts && backgrounded()) {
      void notifyDetection({
        label,
        name: detection.name,
        confidence: detection.confidence,
        threat,
      });
    }

    // 4. Escalation. The protocol decides for itself whether to arm — it owns
    //    the enabled switch, the re-arm suppression and the countdown.
    if (threat === 'critical') {
      threatEscalation.consider({
        label,
        name: detection.name,
        confidence: detection.confidence,
        simulated: detection.simulated,
      });
    }

    this.emit({ type: 'detection', detection });
  }

  private expireDetection() {
    const current = this.state.detection;
    if (!current) return;
    if (Date.now() - current.lastSeen >= DETECTION_HOLD_MS) {
      this.patch({ detection: null });
    }
  }

  private persist(detection: Detection) {
    if (detection.threat === 'safe' && !this.settings.logSafeEvents) return;

    const last = this.lastLoggedAt.get(detection.label) ?? 0;
    if (detection.lastSeen - last < HISTORY_DEDUPE_MS) return;
    this.lastLoggedAt.set(detection.label, detection.lastSeen);

    void saveDetectionEvent({
      id: `${detection.lastSeen}-${Math.random().toString(36).slice(2, 8)}`,
      soundName: detection.name,
      rawLabel: detection.label,
      confidence: detection.confidence,
      threatLevel: detection.threat,
      timestamp: detection.lastSeen,
      simulated: detection.simulated,
    });
  }
}

/**
 * Module singleton — survives Fast Refresh, so audio subscriptions and the ONNX
 * session are never duplicated during development.
 */
export const soundEngine = new SoundEngine();
