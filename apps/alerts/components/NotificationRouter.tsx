/**
 * SoundGuard — Notification setup and tap routing
 * ─────────────────────────────────────────────────────────────────────────────
 * Two jobs, both of which have to happen exactly once for the whole app, which
 * is why this is a single mounted-forever sibling of the navigator rather than
 * something each screen does for itself.
 *
 *   1. Create the notification channels early. Android only reads a channel's
 *      importance and vibration pattern at *creation*, so the channels must
 *      exist before the first alert is posted — not be created by it.
 *
 *   2. Route a tap. A notification is a promise that opening it will show you
 *      the thing it was about; landing on whatever screen happened to be last
 *      open breaks that promise. Both entry points are handled: the listener
 *      for a warm app, and `getLastNotificationResponseAsync` for the cold
 *      start where the tap is what launched the process.
 *
 * The threat notification deliberately routes nowhere. If its countdown is
 * still running, `ThreatLockOverlay` is already covering the screen; if it has
 * fired, the SOS route is already pushed. Navigating on top of either would
 * fight the surface the user actually needs.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { ensureNotificationSetup, type NotificationPayload } from '@/utils/notifications';

function route(payload: NotificationPayload | null) {
  if (!payload) return;

  try {
    if (payload.kind === 'detection') {
      // The monitoring surface, where the detection card and its controls are.
      router.push('/listen');
      return;
    }

    if (payload.kind === 'sos') {
      router.push('/history');
    }
  } catch {
    // A cold-start response can resolve before the navigator is ready. Landing
    // on the default route is a far better outcome than an unhandled rejection
    // during launch.
  }
}

function payloadOf(response: Notifications.NotificationResponse | null): NotificationPayload | null {
  const data = response?.notification?.request?.content?.data;
  if (!data || typeof data !== 'object') return null;
  const kind = (data as { kind?: unknown }).kind;
  if (kind !== 'detection' && kind !== 'threat' && kind !== 'sos') return null;
  return data as NotificationPayload;
}

export function NotificationRouter() {
  /** Guards against handling the cold-start response twice under Fast Refresh. */
  const handledColdStart = useRef(false);

  useEffect(() => {
    void ensureNotificationSetup();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      route(payloadOf(response));
    });

    (async () => {
      if (handledColdStart.current) return;
      handledColdStart.current = true;
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        route(payloadOf(last));
      } catch {
        /* No launch response, or the module is unavailable. Nothing to route. */
      }
    })();

    return () => subscription.remove();
  }, []);

  return null;
}
