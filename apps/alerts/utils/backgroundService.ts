/**
 * SoundGuard — Background capture service bridge
 * ─────────────────────────────────────────────────────────────────────────────
 * The JavaScript half of continuous background monitoring.
 *
 * ── Why a native foreground service is not optional ──────────────────────────
 *
 * Since Android 11 an app that is not visible cannot read the microphone. The
 * platform does not error — `AudioRecord` keeps delivering buffers, and every
 * sample in them is zero. That is the worst possible failure mode for a safety
 * tool: the pipeline looks healthy, the level meter sits at silence, and the
 * user believes they are being watched over while nothing is being heard.
 *
 * The one sanctioned exception is a foreground service whose declared type
 * includes `microphone`, started while the app is still visible. That is
 * precisely what this module starts, from the "start monitoring" tap — a moment
 * when the app is by definition on screen, which also satisfies Android 12+'s
 * ban on starting foreground services from the background.
 *
 * The service additionally holds a partial wake lock. A foreground service keeps
 * the *process* alive but does not keep the CPU awake, and with the screen off
 * Doze will otherwise stop scheduling our audio callbacks within minutes.
 *
 * ── Degradation ──────────────────────────────────────────────────────────────
 *
 * The native module is contributed by `plugins/withSoundGuardBackground.js` at
 * prebuild time, so it exists only in a build made after that plugin was added.
 * Every call here is therefore guarded and total: on iOS, on the web, in Expo
 * Go, or in an older development client, `available` is false and the app runs
 * exactly as it did before — foreground monitoring, no background capture. The
 * UI reads `available` and tells the user the truth rather than promising
 * something the binary cannot do.
 */

import { NativeModules, Platform } from 'react-native';

type NativeBridge = {
  startService: (title: string, body: string) => Promise<boolean>;
  stopService: () => Promise<boolean>;
  isRunning: () => Promise<boolean>;
};

function resolveBridge(): NativeBridge | null {
  if (Platform.OS !== 'android') return null;
  const candidate = (NativeModules as Record<string, unknown>).SoundGuardBackgroundService;
  if (!candidate || typeof candidate !== 'object') return null;

  const bridge = candidate as Partial<NativeBridge>;
  if (typeof bridge.startService !== 'function' || typeof bridge.stopService !== 'function') {
    return null;
  }
  return bridge as NativeBridge;
}

const bridge = resolveBridge();

/** True when this binary can actually keep capture alive in the background. */
export const backgroundCaptureAvailable = bridge !== null;

let running = false;

export const backgroundCapture = {
  available: backgroundCaptureAvailable,

  /** True if we believe the service is up. Cheap, synchronous, best-effort. */
  isRunning(): boolean {
    return running;
  },

  /**
   * Promote the process to a microphone foreground service.
   *
   * Must be called while the app is visible. Resolves `false` — never throws —
   * if the platform refuses, so the caller can carry on with foreground-only
   * monitoring instead of failing to start at all.
   */
  async start(title: string, body: string): Promise<boolean> {
    if (!bridge) return false;
    try {
      const ok = await bridge.startService(title, body);
      running = Boolean(ok);
      return running;
    } catch {
      running = false;
      return false;
    }
  },

  /** Drop the service and its wake lock. Idempotent; safe when never started. */
  async stop(): Promise<void> {
    running = false;
    if (!bridge) return;
    try {
      await bridge.stopService();
    } catch {
      /* Already gone, or the process is being torn down. Either way: done. */
    }
  },

  /** Ask the OS, rather than trusting our own flag. Used by diagnostics. */
  async query(): Promise<boolean> {
    if (!bridge || typeof bridge.isRunning !== 'function') return false;
    try {
      const value = await bridge.isRunning();
      running = Boolean(value);
      return running;
    } catch {
      return false;
    }
  },
};
