/**
 * SoundGuard — Semantic Haptic Signatures
 * ─────────────────────────────────────────────────────────────────────────────
 * A vibration alphabet. For a Deaf user the phone's motor is the primary output
 * channel, and "it buzzed" carries exactly one bit of information: something
 * happened. That is not enough to act on. A siren behind you and someone at the
 * front door require different responses, and the user should know which one it
 * is before looking at the screen — often *without* looking at the screen at
 * all, because the phone is in a pocket.
 *
 * So every sound class gets its own rhythm, and the rhythms are designed to be
 * told apart by feel:
 *
 *   siren          long, unbroken, relentless — the only signature that never
 *                  gives you a resting gap. Reads as "do not ignore me".
 *   glass breaking scattered stabs then a thud — mimics the event itself.
 *   car horn       two flat blasts, exactly like the sound.
 *   crying baby    short-long, short-long — the rise and fall of a wail.
 *   door knock     three even taps. The knock everybody already knows.
 *   footsteps      slow, single, evenly spaced. Deliberately unhurried.
 *   dog            two quick yips.
 *
 * ── Why the pattern array is the single source of truth ──────────────────────
 *
 * The same `pattern` drives three different subsystems:
 *
 *   1. In-app playback while the process is alive (`Vibration` on Android,
 *      a scheduled `expo-haptics` chain on iOS).
 *   2. The Android notification channel for that sound, so a detection that
 *      arrives while the app is backgrounded or the screen is locked produces
 *      the *identical* rhythm straight from the OS — no JS required.
 *   3. The haptic dictionary in Settings, where the user can learn them.
 *
 * If they were three hand-written copies they would drift, and a user who
 * learned a rhythm in the dictionary would be taught the wrong thing. One array
 * makes that impossible.
 *
 * ── Pattern encoding ─────────────────────────────────────────────────────────
 *
 * `[wait, vibrate, wait, vibrate, …]` in milliseconds — the Android
 * `Vibrator.vibrate(long[])` convention, which is also what React Native's
 * `Vibration.vibrate` and `expo-notifications`' `vibrationPattern` expect. The
 * array always starts with a wait (usually 0) and then alternates.
 *
 * ── iOS ──────────────────────────────────────────────────────────────────────
 *
 * Core Haptics has no "buzz for 600 ms" primitive exposed through expo-haptics,
 * and `Vibration.vibrate(pattern)` ignores durations on iOS entirely. A long
 * buzz is therefore synthesised as a burst of heavy impacts at ~65 ms spacing,
 * derived from the same array, which is perceptually very close. The schedule is
 * capped so a long pattern can never queue hundreds of timers.
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

import { SOUND_LABELS, type SoundLabel, type ThreatLevel } from './storage';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Non-sound signatures used by the escalation protocol and ordinary controls. */
export type SystemSignatureId =
  | 'threat_armed'
  | 'threat_tick'
  | 'threat_final'
  | 'threat_cancelled'
  | 'sos_dispatched'
  | 'confirm'
  | 'dismiss'
  | 'reset';

export type SignatureId = SoundLabel | SystemSignatureId;

export type HapticSignature = {
  id: SignatureId;
  /** Short name for the haptic dictionary, e.g. "Unbroken pulse". */
  rhythm: string;
  /** One line the user can read while feeling it. */
  hint: string;
  /** `[wait, on, wait, on, …]` in milliseconds. */
  pattern: number[];
  /** Whole-pattern repeats. Always finite — an endless motor is a dead battery. */
  cycles: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Expand `cycles` into one flat array, so playback never loops indefinitely. */
export function expandPattern(signature: HapticSignature): number[] {
  const cycles = Math.max(1, Math.min(6, signature.cycles));
  if (cycles === 1) return signature.pattern.slice();

  const out: number[] = signature.pattern.slice();
  for (let i = 1; i < cycles; i++) out.push(...signature.pattern);
  return out;
}

/** Total wall-clock length of a signature, in milliseconds. */
export function signatureDurationMs(signature: HapticSignature): number {
  return expandPattern(signature).reduce((sum, value) => sum + value, 0);
}

// ─── The alphabet ────────────────────────────────────────────────────────────

const SOUND_SIGNATURES: Record<SoundLabel, HapticSignature> = {
  siren: {
    id: 'siren',
    rhythm: 'Unbroken pulse',
    hint: 'Long, urgent buzzes with almost no gap. Never ignore this one.',
    // 600 on / 140 off — the shortest rest of any signature, so it feels
    // continuous and impatient rather than rhythmic. Two cycles, not more: this
    // fires again on every re-detection, and a five-second buzz that overlaps
    // the next one stops being a signal and becomes noise.
    pattern: [0, 600, 140, 600, 140, 600, 300],
    cycles: 2,
  },
  glass_breaking: {
    id: 'glass_breaking',
    rhythm: 'Shatter and thud',
    hint: 'Four sharp stabs, then one heavy hit — the shape of breaking glass.',
    pattern: [0, 55, 45, 55, 45, 55, 45, 55, 130, 480, 320],
    cycles: 3,
  },
  car_horn: {
    id: 'car_horn',
    rhythm: 'Two flat blasts',
    hint: 'Two equal, medium-length buzzes. Exactly like a horn sounds.',
    pattern: [0, 320, 190, 320, 600],
    cycles: 2,
  },
  crying_baby: {
    id: 'crying_baby',
    rhythm: 'Rising wail',
    hint: 'A short tap that grows into a long one, twice over.',
    pattern: [0, 110, 70, 300, 110, 110, 70, 300, 520],
    cycles: 2,
  },
  door_wood_knock: {
    id: 'door_wood_knock',
    rhythm: 'Three even taps',
    hint: 'Tap-tap-tap. The knock everybody already knows.',
    pattern: [0, 65, 130, 65, 130, 65, 640],
    cycles: 2,
  },
  footsteps: {
    id: 'footsteps',
    rhythm: 'Slow single taps',
    hint: 'Unhurried, evenly spaced taps. Someone is moving nearby.',
    pattern: [0, 45, 330, 45, 330, 45, 700],
    cycles: 2,
  },
  dog: {
    id: 'dog',
    rhythm: 'Double yip',
    hint: 'Two quick taps close together, then a pause.',
    pattern: [0, 80, 65, 80, 620],
    cycles: 2,
  },
};

const SYSTEM_SIGNATURES: Record<SystemSignatureId, HapticSignature> = {
  threat_armed: {
    id: 'threat_armed',
    rhythm: 'Alarm arming',
    hint: 'Three heavy hits and a long hold — the safety check has opened.',
    pattern: [0, 240, 110, 240, 110, 240, 160, 850, 400],
    cycles: 2,
  },
  threat_tick: {
    id: 'threat_tick',
    rhythm: 'Countdown tick',
    hint: 'One short tap per second while the safety check runs.',
    pattern: [0, 45],
    cycles: 1,
  },
  threat_final: {
    id: 'threat_final',
    rhythm: 'Final seconds',
    hint: 'A double tap for each of the last five seconds.',
    pattern: [0, 70, 90, 70],
    cycles: 1,
  },
  threat_cancelled: {
    id: 'threat_cancelled',
    rhythm: 'Stand down',
    hint: 'Two soft taps. The alert was cancelled and nothing was sent.',
    pattern: [0, 55, 120, 55],
    cycles: 1,
  },
  sos_dispatched: {
    id: 'sos_dispatched',
    rhythm: 'SOS away',
    hint: 'A long buzz followed by three short ones. Your circle was messaged.',
    pattern: [0, 700, 220, 90, 110, 90, 110, 90],
    cycles: 1,
  },
  confirm: {
    id: 'confirm',
    rhythm: 'Confirm',
    hint: 'One clean tap.',
    pattern: [0, 40],
    cycles: 1,
  },
  dismiss: {
    id: 'dismiss',
    rhythm: 'Dismiss',
    hint: 'One very light tap.',
    pattern: [0, 25],
    cycles: 1,
  },
  reset: {
    id: 'reset',
    rhythm: 'Reset',
    hint: 'Two light taps.',
    pattern: [0, 35, 90, 35],
    cycles: 1,
  },
};

export const HAPTIC_SIGNATURES: Record<SignatureId, HapticSignature> = {
  ...SOUND_SIGNATURES,
  ...SYSTEM_SIGNATURES,
};

/** Every sound signature, in taxonomy order. Drives the Settings dictionary. */
export const SOUND_SIGNATURE_LIST: HapticSignature[] = SOUND_LABELS.map(
  (label) => SOUND_SIGNATURES[label],
);

export function signatureFor(id: SignatureId): HapticSignature {
  return HAPTIC_SIGNATURES[id] ?? SYSTEM_SIGNATURES.confirm;
}

export function signatureForSound(label: SoundLabel): HapticSignature {
  return SOUND_SIGNATURES[label] ?? SYSTEM_SIGNATURES.confirm;
}

/**
 * Fallback rhythm for a threat tier, used when something must vibrate but the
 * exact class is unknown (a coalesced background alert, for instance).
 */
export function signatureForThreat(threat: ThreatLevel): HapticSignature {
  if (threat === 'critical') return SOUND_SIGNATURES.siren;
  if (threat === 'warning') return SOUND_SIGNATURES.car_horn;
  return SOUND_SIGNATURES.door_wood_knock;
}

// ─── Playback ────────────────────────────────────────────────────────────────

/**
 * iOS synthesis: a "long buzz" becomes repeated heavy impacts. 65 ms is close
 * enough to fuse perceptually while staying well inside what the Taptic Engine
 * will actually schedule back to back.
 */
const IOS_BUZZ_STEP_MS = 65;
/** Hard ceiling on scheduled impacts, so a six-cycle siren cannot flood the queue. */
const IOS_MAX_EVENTS = 96;

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
}

function iosImpact(durationMs: number) {
  if (durationMs >= 260) return Haptics.ImpactFeedbackStyle.Heavy;
  if (durationMs >= 110) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Light;
}

function playIos(pattern: number[]) {
  let cursor = 0;
  let scheduled = 0;

  for (let i = 0; i < pattern.length; i++) {
    const value = pattern[i] ?? 0;
    const isVibrate = i % 2 === 1;

    if (!isVibrate) {
      cursor += value;
      continue;
    }

    const style = iosImpact(value);
    // A single tap for anything short; a fused burst for anything long.
    const steps = Math.max(1, Math.ceil(value / IOS_BUZZ_STEP_MS));
    for (let step = 0; step < steps; step++) {
      if (scheduled >= IOS_MAX_EVENTS) break;
      const at = cursor + step * IOS_BUZZ_STEP_MS;
      scheduled += 1;
      timers.push(
        setTimeout(() => {
          void Haptics.impactAsync(style).catch(() => {});
        }, at),
      );
    }
    cursor += value;
  }
}

/**
 * Play a signature.
 *
 * Fire-and-forget and non-blocking: Android hands the whole pattern to the
 * system vibrator in one call, iOS schedules timers. Neither touches the UI
 * thread. Playing a new signature cancels the one in flight, so a burst of
 * detections cannot leave two rhythms overlapping into mush.
 */
export function playSignature(id: SignatureId, enabled = true): void {
  if (!enabled) return;
  if (Platform.OS === 'web') return;

  const signature = signatureFor(id);
  const pattern = expandPattern(signature);

  try {
    cancelSignature();

    if (Platform.OS === 'android') {
      // `repeat: false` is essential — a repeating pattern only stops on an
      // explicit cancel, and a missed cancel is a phone that never stops buzzing.
      Vibration.vibrate(pattern, false);
      return;
    }

    playIos(pattern);
  } catch {
    /* Haptics are an output channel, never a precondition. Never let them throw. */
  }
}

/** Stop whatever is playing. Safe to call at any time, including when idle. */
export function cancelSignature(): void {
  if (Platform.OS === 'web') return;
  clearTimers();
  try {
    Vibration.cancel();
  } catch {
    /* ignore */
  }
}
