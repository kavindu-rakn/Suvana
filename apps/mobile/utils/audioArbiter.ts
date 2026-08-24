/**
 * SoundGuard — Microphone arbiter
 * ─────────────────────────────────────────────────────────────────────────────
 * The app now has two independent consumers of the same piece of hardware:
 *
 *   soundguard  → `react-native-live-audio-stream` opens an AudioRecord at
 *                 16 kHz on MediaRecorder.AudioSource.VOICE_RECOGNITION.
 *   transcribe  → `expo-speech-recognition` hands the microphone to the OS
 *                 SpeechRecognizer / SFSpeechRecognizer, which opens its *own*
 *                 recording session internally.
 *
 * On Android these two cannot coexist. AudioRecord is an exclusive resource for
 * a given source: whichever party asks second either fails to initialise, gets
 * silence, or — on several OEM HALs — takes the whole audio server down with it.
 * The failure is timing-dependent, which is precisely the kind of bug that
 * survives casual testing and then reproduces in a demo.
 *
 * So capture is never opened directly. Every consumer goes through this module,
 * which guarantees four properties:
 *
 *   1. MUTUAL EXCLUSION. At most one owner exists at any instant. Acquiring
 *      releases the incumbent first — there is no code path that leaves two
 *      capture sessions open, not even for one frame.
 *
 *   2. SERIALISED TRANSITIONS. Every acquire/release runs in a single-file
 *      queue. Two taps landing in the same frame, or a screen unmounting while
 *      the other mode is still starting, cannot interleave: the second
 *      transition observes the first as already complete.
 *
 *   3. ACTIVATION INSIDE THE LOCK. A consumer's native `start` runs as part of
 *      the transition, not after it. Without this there is a window between
 *      "you own the microphone" and "you have actually opened it" in which a
 *      competing acquire would release a session that had not been created yet,
 *      and the real open would then land unowned.
 *
 *   4. A HANDOVER SETTLE DELAY. Stopping AudioRecord returns before the audio
 *      HAL has finished tearing the input stream down. Handing the microphone
 *      straight to a different subsystem in that gap is the single most common
 *      source of `ERROR_AUDIO` / "recorder busy" on Android. A short, ordered
 *      pause — applied only when ownership actually changes hands — removes it.
 *
 * The module is framework-free by design (like `soundEngine`), so lifecycle
 * correctness does not depend on React rendering at the right moment. React
 * subscribes for display purposes only, through `subscribe`/`getState`.
 */

import { Platform } from 'react-native';

export type AudioOwnerId = 'soundguard' | 'transcribe';

export type AudioOwner = {
  id: AudioOwnerId;
  /**
   * Tear every native audio resource down. MUST be idempotent, MUST NOT throw,
   * and MUST NOT call back into the arbiter (that would deadlock the queue).
   */
  release: () => void | Promise<void>;
  /**
   * Open the hardware. Runs inside the transition, so by the time it is called
   * the previous owner is fully released. Throwing here aborts the acquisition
   * cleanly and leaves the microphone unowned.
   */
  activate?: () => void | Promise<void>;
};

export type ArbiterState = {
  /** Who currently holds the microphone, if anyone. */
  owner: AudioOwnerId | null;
  /** True while a hand-over is in flight. */
  transitioning: boolean;
};

/**
 * Time given to the audio HAL to release the input stream between two different
 * owners. iOS deactivates its AVAudioSession synchronously and needs no pause;
 * Android does. Only paid on a genuine change of owner.
 */
const HANDOVER_SETTLE_MS = Platform.OS === 'android' ? 320 : 0;

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const INITIAL: ArbiterState = { owner: null, transitioning: false };

class AudioArbiter {
  private state: ArbiterState = INITIAL;
  private current: AudioOwner | null = null;
  private listeners = new Set<() => void>();

  /**
   * When the previous owner finished releasing. The settle delay is enforced
   * from this timestamp rather than from "did we just release inside this same
   * transaction", so a user who leaves one mode and starts the other in two
   * separate, quick taps gets the same protection as a single hand-over.
   */
  private lastReleaseAt = 0;

  /**
   * Single-file transition queue. Every public method appends to it, so the
   * arbiter's internal state is only ever mutated by one task at a time even
   * though every caller sees an ordinary promise.
   */
  private queue: Promise<unknown> = Promise.resolve();

  // ── Store contract (useSyncExternalStore) ─────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): ArbiterState => this.state;

  /** Non-reactive read, for engines that must not depend on React. */
  getOwner = (): AudioOwnerId | null => this.state.owner;

  private patch(next: Partial<ArbiterState>) {
    let changed = false;
    for (const key of Object.keys(next) as (keyof ArbiterState)[]) {
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
        /* one bad subscriber must not stop the others */
      }
    });
  }

  /** Append a transition to the queue. Failures never poison the chain. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    // Swallow rejections on the *chain* only; the returned promise still
    // rejects for the caller that asked for the work.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Release the incumbent. Assumes it is being called from inside the queue. */
  private async releaseCurrent(): Promise<boolean> {
    const owner = this.current;
    if (!owner) return false;

    this.current = null;
    try {
      await owner.release();
    } catch {
      /* A release that throws must still count as released — the alternative
         is a permanently stuck arbiter and a microphone nobody can claim. */
    }
    this.lastReleaseAt = Date.now();
    this.patch({ owner: null });
    return true;
  }

  /** Hold off until the audio HAL has had its settle window since the last release. */
  private async settleAfterRelease(): Promise<void> {
    const elapsed = Date.now() - this.lastReleaseAt;
    if (elapsed >= HANDOVER_SETTLE_MS) return;
    await wait(HANDOVER_SETTLE_MS - elapsed);
  }

  /**
   * Take exclusive ownership of the microphone, releasing whoever holds it.
   *
   * Resolves `true` when the caller owns the hardware and its `activate` (if
   * any) completed. Resolves `false` if activation failed — in which case the
   * microphone is left unowned rather than half-open.
   */
  acquire(owner: AudioOwner): Promise<boolean> {
    return this.enqueue(async () => {
      this.patch({ transitioning: true });
      try {
        // Re-acquiring from the same owner is a restart: release first so the
        // native session is never opened twice.
        await this.releaseCurrent();
        await this.settleAfterRelease();

        this.current = owner;
        this.patch({ owner: owner.id });

        try {
          await owner.activate?.();
        } catch {
          // Activation failed. Unwind completely: the caller reports the error,
          // and the next mode finds a clean, unowned microphone.
          this.current = null;
          try {
            await owner.release();
          } catch {
            /* ignore */
          }
          // A failed open still touched the hardware, so the next owner gets
          // the same settle window it would have got after a clean release.
          this.lastReleaseAt = Date.now();
          this.patch({ owner: null });
          return false;
        }

        return true;
      } finally {
        this.patch({ transitioning: false });
      }
    });
  }

  /**
   * Release the microphone, but only if `id` still holds it. The guard matters:
   * a screen unmounting late must not tear down a session the *other* mode has
   * since legitimately started.
   */
  release(id: AudioOwnerId): Promise<void> {
    return this.enqueue(async () => {
      if (this.current?.id !== id) return;
      this.patch({ transitioning: true });
      try {
        await this.releaseCurrent();
      } finally {
        this.patch({ transitioning: false });
      }
    });
  }

  /** Unconditional teardown. Used by the route/app-state watchdog. */
  releaseAll(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.current) return;
      this.patch({ transitioning: true });
      try {
        await this.releaseCurrent();
      } finally {
        this.patch({ transitioning: false });
      }
    });
  }

  /** Resolves once every queued transition has finished. */
  settled(): Promise<void> {
    return this.enqueue(async () => undefined);
  }
}

/** Module singleton — survives Fast Refresh, so ownership is never duplicated. */
export const audioArbiter = new AudioArbiter();

/** Human-readable owner, for the dashboard's hardware status strip. */
export const OWNER_LABELS: Record<AudioOwnerId, string> = {
  soundguard: 'SoundGuard',
  transcribe: 'Live Transcribe',
};
