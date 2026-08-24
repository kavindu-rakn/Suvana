/**
 * SoundGuard — Critical threat escalation protocol
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens between "a siren was recognised" and "your Safety Circle was
 * messaged".
 *
 * ── The flaw this replaces ───────────────────────────────────────────────────
 *
 * Until now a critical detection produced a card that faded after five seconds
 * of silence. For a hearing user that is a reasonable notice. For a Deaf user it
 * is a failure mode: the single most important event the app can produce was the
 * one most likely to be missed, because noticing it required looking at the
 * screen during a five-second window nothing told you about. Worse, the escape
 * hatch — automatic SOS — only fired after the sound had *continued* for several
 * seconds, so a single loud crash of breaking glass followed by silence
 * escalated to nothing at all.
 *
 * The protocol here inverts both. A confirmed critical detection takes over the
 * screen immediately and stays there. It cannot be scrolled past, backed out of,
 * or navigated away from. It runs a visible countdown, and the *only* thing that
 * stops it is the user affirmatively saying they are safe. Silence is no longer
 * interpreted as "everything is fine" — it is interpreted as "the person may not
 * be able to answer", which is the assumption a safety tool has to make.
 *
 * ── Why this is framework-free ───────────────────────────────────────────────
 *
 * Same reason as `soundEngine` and `transcribeEngine`: correctness must not
 * depend on a component being mounted and rendering at the right moment. The
 * countdown keeps running while the app is backgrounded, while the screen is
 * off, and across every navigation in the app. React subscribes for display.
 *
 * ── Wall-clock, not tick-counting ────────────────────────────────────────────
 *
 * Remaining time is derived from a stored deadline and `Date.now()`, never
 * accumulated from timer callbacks. Doze, a backgrounded JS thread and a slow
 * frame all delay timers by arbitrary amounts; a counter built from them drifts
 * long, which on this screen means an SOS that fires late — or, if the process
 * is suspended for a minute, one that should have fired and did not. Reading the
 * clock makes the deadline absolute: however badly the timer is served, the
 * first tick after the deadline fires immediately.
 */

import { AppState } from 'react-native';

import {
  cancelSignature,
  playSignature,
  signatureDurationMs,
  signatureFor,
} from './hapticSignatures';
import {
  clearThreatNotification,
  notifyThreat,
} from './notifications';
import { SOUND_DISPLAY_NAMES, type SoundLabel } from './storage';

// ─── Tuning ──────────────────────────────────────────────────────────────────

/** Countdown resolution. Fine enough to feel live, coarse enough to be free. */
const TICK_MS = 200;

/** After a cancel, that sound cannot re-arm for this long. */
const CANCEL_SUPPRESS_MS = 90_000;
/** After a dispatch, nothing re-arms for this long. */
const DISPATCH_SUPPRESS_MS = 120_000;

/** How often the background notification is refreshed while counting down. */
const BACKGROUND_NOTIFY_INTERVAL_MS = 2000;

/** The last N seconds get the urgent double-tap instead of the plain tick. */
const FINAL_SECONDS = 5;

/**
 * How long the arming signature owns the motor.
 *
 * Playing a signature cancels whatever is in flight — otherwise two rhythms
 * overlap into mush — so without this the first per-second tick, 200 ms after
 * arming, would truncate the "alarm arming" pattern to a single buzz. That
 * pattern is the one that tells a user in a pocket that something serious just
 * happened, and it is the last one that should be cut short. Derived from the
 * pattern itself so retuning it cannot desynchronise the two.
 */
const ARM_SIGNATURE_MS = signatureDurationMs(signatureFor('threat_armed'));

// ─── Public types ────────────────────────────────────────────────────────────

export type EscalationPhase = 'idle' | 'armed' | 'firing';

export type EscalationState = {
  phase: EscalationPhase;
  label: SoundLabel | null;
  name: string;
  confidence: number;
  /** True when this came from the demo triggers rather than the microphone. */
  drill: boolean;
  /** Whole seconds left, for display. */
  secondsLeft: number;
  /** Total window, in whole seconds. */
  totalSeconds: number;
  /** 0…1 elapsed fraction, for the ring. */
  progress: number;
  /** True if any part of the countdown elapsed while the app was not on screen. */
  wasBackgrounded: boolean;
};

export type EscalationEvent =
  /** The countdown expired. The listener owns navigating into the SOS flow. */
  | { type: 'fire'; label: SoundLabel | null; drill: boolean }
  | { type: 'armed'; label: SoundLabel; drill: boolean }
  | { type: 'cancelled' };

export type EscalationConfig = {
  /** Master switch — the `autoSos` setting. */
  enabled: boolean;
  /** Seconds the user has to say they are safe. */
  countdownSeconds: number;
  /** The `hapticFeedback` setting. */
  haptics: boolean;
  /** Whether background notifications may be posted. */
  notifications: boolean;
};

const INITIAL_STATE: EscalationState = {
  phase: 'idle',
  label: null,
  name: '',
  confidence: 0,
  drill: false,
  secondsLeft: 0,
  totalSeconds: 0,
  progress: 0,
  wasBackgrounded: false,
};

const DEFAULT_CONFIG: EscalationConfig = {
  enabled: true,
  countdownSeconds: 15,
  haptics: true,
  notifications: true,
};

// ─── Controller ──────────────────────────────────────────────────────────────

class ThreatEscalation {
  private state: EscalationState = INITIAL_STATE;
  private config: EscalationConfig = { ...DEFAULT_CONFIG };

  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: EscalationEvent) => void>();

  private timer: ReturnType<typeof setInterval> | null = null;
  private deadline = 0;
  private startedAt = 0;

  /** Last whole second we vibrated for, so a 200 ms tick fires one tap. */
  private lastTickSecond = -1;
  private lastNotifyAt = 0;

  private suppressUntil = new Map<SoundLabel, number>();
  private globalSuppressUntil = 0;

  // ── Store contract ────────────────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): EscalationState => this.state;

  onEvent = (listener: (event: EscalationEvent) => void): (() => void) => {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  };

  private emit(event: EscalationEvent) {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        /* one bad subscriber must not stop the others */
      }
    });
  }

  private patch(next: Partial<EscalationState>) {
    let changed = false;
    for (const key of Object.keys(next) as (keyof EscalationState)[]) {
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
   * Apply the user's preferences.
   *
   * A countdown already in flight deliberately keeps the window it was armed
   * with — the deadline is not recomputed. Shortening the timer underneath
   * somebody who is already watching a number count down would be indefensible
   * on a safety surface, and lengthening it would be a lie about how long they
   * have. The next arming picks the new value up.
   */
  configure(config: EscalationConfig) {
    this.config = config;
  }

  // ── Arming ────────────────────────────────────────────────────────────────

  /**
   * Offer a critical detection to the protocol.
   *
   * Called from the engine's publish path. Returns true if the safety check
   * opened. Every rejection reason is deliberate:
   *
   *   • disabled            the user turned automatic escalation off
   *   • already armed       a second siren must not restart the user's window
   *   • suppressed          they just told us they were safe; do not trap them
   *                         in a loop while the same sound is still going
   */
  consider(input: {
    label: SoundLabel;
    name: string;
    confidence: number;
    simulated: boolean;
  }): boolean {
    if (!this.config.enabled) return false;
    if (this.state.phase !== 'idle') return false;

    const now = Date.now();
    if (now < this.globalSuppressUntil) return false;

    const suppressed = this.suppressUntil.get(input.label);
    if (suppressed !== undefined) {
      if (suppressed > now) return false;
      this.suppressUntil.delete(input.label);
    }

    const totalSeconds = Math.max(5, Math.min(120, Math.round(this.config.countdownSeconds)));

    this.startedAt = now;
    this.deadline = now + totalSeconds * 1000;
    // Seeded with the starting second so the first tick, 200 ms from now, is
    // recognised as "same second" and does not fire a haptic on top of the
    // arming pattern.
    this.lastTickSecond = totalSeconds;
    this.lastNotifyAt = 0;

    this.patch({
      phase: 'armed',
      label: input.label,
      name: input.name || SOUND_DISPLAY_NAMES[input.label],
      confidence: input.confidence,
      drill: input.simulated,
      secondsLeft: totalSeconds,
      totalSeconds,
      progress: 0,
      wasBackgrounded: AppState.currentState !== 'active',
    });

    playSignature('threat_armed', this.config.haptics);
    this.pushNotification(totalSeconds, true);
    this.startTimer();
    this.emit({ type: 'armed', label: input.label, drill: input.simulated });
    return true;
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  /**
   * The user says they are safe. Fully synchronous so the lock disappears in the
   * same frame as the tap — under stress, a control that appears not to have
   * responded gets pressed again, and there is nothing else here to press.
   */
  cancel(): void {
    if (this.state.phase === 'idle') return;

    const label = this.state.label;
    this.stopTimer();
    cancelSignature();

    if (label) this.suppressUntil.set(label, Date.now() + CANCEL_SUPPRESS_MS);

    this.patch({ ...INITIAL_STATE });
    playSignature('threat_cancelled', this.config.haptics);
    void clearThreatNotification();
    this.emit({ type: 'cancelled' });
  }

  /**
   * The SOS flow has taken over. Clears the lock without arming a new one and
   * holds off every re-arm for a cool-off period, so the sound that triggered
   * this cannot immediately trigger it again behind the SOS screen.
   */
  handOff(): void {
    this.stopTimer();
    this.globalSuppressUntil = Date.now() + DISPATCH_SUPPRESS_MS;
    this.patch({ ...INITIAL_STATE });
    void clearThreatNotification();
  }

  /**
   * Drop everything — monitoring stopped, or the mode was left. Not a cancel:
   * no suppression is recorded and no "stand down" haptic plays, because the
   * user did not answer anything.
   */
  reset(): void {
    if (this.state.phase === 'idle') return;
    this.stopTimer();
    cancelSignature();
    this.patch({ ...INITIAL_STATE });
    void clearThreatNotification();
  }

  /** Forget every suppression window. Used by the engine's own reset control. */
  clearSuppressions(): void {
    this.suppressUntil.clear();
    this.globalSuppressUntil = 0;
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(this.tick, TICK_MS);
  }

  private stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private tick = () => {
    if (this.state.phase !== 'armed') {
      this.stopTimer();
      return;
    }

    const now = Date.now();
    const remainingMs = this.deadline - now;

    if (remainingMs <= 0) {
      this.fire();
      return;
    }

    const secondsLeft = Math.ceil(remainingMs / 1000);
    const total = Math.max(1, this.deadline - this.startedAt);
    const progress = Math.max(0, Math.min(1, (now - this.startedAt) / total));
    const background = AppState.currentState !== 'active';

    this.patch({
      secondsLeft,
      progress,
      wasBackgrounded: this.state.wasBackgrounded || background,
    });

    if (secondsLeft !== this.lastTickSecond) {
      this.lastTickSecond = secondsLeft;
      // The arming pattern gets the motor to itself. Ticks resume once it has
      // finished playing — an urgency ramp that starts by interrupting its own
      // alarm reads as a glitch, not as urgency.
      if (now - this.startedAt >= ARM_SIGNATURE_MS) {
        playSignature(
          secondsLeft <= FINAL_SECONDS ? 'threat_final' : 'threat_tick',
          this.config.haptics,
        );
      }
    }

    // The screen is not visible, so the notification *is* the countdown.
    if (background && now - this.lastNotifyAt >= BACKGROUND_NOTIFY_INTERVAL_MS) {
      this.pushNotification(secondsLeft, false);
    }
  };

  private fire() {
    this.stopTimer();
    const { label, drill } = this.state;

    this.patch({ phase: 'firing', secondsLeft: 0, progress: 1 });
    playSignature('threat_final', this.config.haptics);
    this.pushNotification(0, true);

    this.emit({ type: 'fire', label, drill });
  }

  private pushNotification(secondsLeft: number, force: boolean) {
    if (!this.config.notifications) return;
    // While the app is on screen the lock itself is the alert; a shade entry
    // would only stack up behind it. On arming we post regardless, so the
    // record exists the moment the user backgrounds the app.
    if (!force && AppState.currentState === 'active') return;

    this.lastNotifyAt = Date.now();
    void notifyThreat({
      name: this.state.name || 'Critical sound',
      secondsLeft,
      label: this.state.label ?? undefined,
    });
  }
}

/** Module singleton — survives Fast Refresh, so a live countdown is never lost. */
export const threatEscalation = new ThreatEscalation();
