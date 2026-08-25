/**
 * SoundGuard — Route-level microphone watchdog
 * ─────────────────────────────────────────────────────────────────────────────
 * The third and outermost layer of the hardware-isolation design.
 *
 *   Layer 1  `audioArbiter`    — mutual exclusion. Structurally impossible for
 *                                two capture sessions to be open at once.
 *   Layer 2  screen lifecycle  — each mode's screen releases the microphone on
 *                                blur and on unmount.
 *   Layer 3  this component    — a route-aware watchdog that releases capture
 *                                whenever the *visible* route is not the mode
 *                                that owns the hardware.
 *
 * Layers 1 and 2 are sufficient in every path we can enumerate. Layer 3 exists
 * because we cannot enumerate every path: a deep link, a hardware back button
 * caught mid-animation, a navigation state restored by the OS after a process
 * kill, or a future screen added by someone who does not know the rule. This
 * watchdog is derived purely from the current pathname, so it is correct for
 * *any* way the app reaches that route, including ones that do not exist yet.
 *
 * It stops the engines rather than calling `audioArbiter.releaseAll()`, because
 * an engine carries intent as well as hardware: Live Transcribe re-opens the OS
 * recogniser after every utterance, so releasing the microphone underneath it
 * without clearing that intent would simply invite it straight back.
 */

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'expo-router';

import { audioArbiter, type AudioOwnerId } from '@/utils/audioArbiter';
import { soundEngine } from '@/utils/soundEngine';
import { transcribeEngine } from '@/utils/transcribeEngine';

/** Routes that make up the SoundGuard mode. The group name carries no segment. */
const SOUNDGUARD_ROUTES = new Set(['/listen', '/history', '/circle', '/settings']);

/** Which mode, if any, is allowed to hold the microphone on this route. */
function modeForPath(pathname: string): AudioOwnerId | null {
  if (pathname === '/transcribe') return 'transcribe';
  if (SOUNDGUARD_ROUTES.has(pathname)) return 'soundguard';
  // Dashboard, onboarding and the SOS flow own no audio. The SOS screen in
  // particular must never leave capture running: it is reached *because* a
  // critical sound was detected, and it goes on to open the SMS composer.
  return null;
}

export function AudioGovernor() {
  const pathname = usePathname();

  // Ownership is watched as well as the route. Acquiring the microphone is
  // asynchronous, so a start that was already in flight when the user navigated
  // away lands *after* the route changed — watching only the pathname would
  // miss it. Watching both means the check runs whichever of the two moves.
  const { owner } = useSyncExternalStore(
    audioArbiter.subscribe,
    audioArbiter.getState,
    audioArbiter.getState,
  );

  useEffect(() => {
    if (!owner) return;
    if (owner === modeForPath(pathname)) return;

    if (owner === 'soundguard') soundEngine.stop();
    else transcribeEngine.stop();
  }, [owner, pathname]);

  return null;
}
