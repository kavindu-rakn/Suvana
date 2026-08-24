/**
 * SoundGuard — System-level alerting
 * ─────────────────────────────────────────────────────────────────────────────
 * When SoundGuard is not the app on screen, the only reliable way to reach a
 * Deaf user is the operating system's own notification pipeline: it survives
 * the screen being off, it draws on the lock screen, and — crucially — it
 * vibrates using the *notification channel's* pattern, which the OS plays even
 * if our JavaScript never gets a chance to run.
 *
 * ── One channel per sound class ──────────────────────────────────────────────
 *
 * A channel's vibration pattern is fixed for that channel, so a single "alerts"
 * channel could only ever produce one rhythm. Every sound therefore gets its own
 * channel, seeded with that sound's haptic signature from `hapticSignatures.ts`.
 * Three things fall out of this:
 *
 *   • A background siren feels exactly like a foreground siren. Same array.
 *   • Android's per-channel settings screen becomes a genuine accessibility
 *     surface: the user can retune or silence one sound without touching the
 *     others, using controls they already know.
 *   • Importance is set per class, so a knock cannot wake the screen the way a
 *     siren does.
 *
 * Channel configuration is immutable after creation — Android ignores any later
 * change to importance or vibration for an existing id. Ids are therefore
 * version-suffixed, and bumping the suffix is how a tuning change ships.
 *
 * ── Failure policy ───────────────────────────────────────────────────────────
 *
 * Every export is total and never throws. A device with notifications disabled,
 * a revoked permission, or a channel the OS refused to create must degrade to
 * "no notification" — never to a crash inside the detection path, which is the
 * one code path that has to keep working.
 */

import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  expandPattern,
  signatureForSound,
  signatureFor,
} from './hapticSignatures';
import {
  SOUND_DISPLAY_NAMES,
  SOUND_LABELS,
  SOUND_THREAT,
  type SoundLabel,
  type ThreatLevel,
} from './storage';

/** Bump to reconfigure channels on devices that already created them. */
const CHANNEL_VERSION = 'v1';

const soundChannelId = (label: SoundLabel) => `sg-sound-${label}-${CHANNEL_VERSION}`;

/** The escalation channel. Deliberately the loudest thing the app can create. */
export const THREAT_CHANNEL_ID = `sg-threat-${CHANNEL_VERSION}`;
/** Quiet channel for status notices that must not interrupt anything. */
export const STATUS_CHANNEL_ID = `sg-status-${CHANNEL_VERSION}`;

/** Stable identifiers, so an update replaces rather than stacks. */
const THREAT_NOTIFICATION_ID = 'soundguard-threat';

const ACCENT = '#F0475C';

let configured = false;
let configuring: Promise<void> | null = null;

// ─── Setup ───────────────────────────────────────────────────────────────────

/**
 * Install the presentation handler and create every channel. Idempotent and
 * single-flight: repeated calls from different mount points collapse into one.
 */
export function ensureNotificationSetup(): Promise<void> {
  if (configured) return Promise.resolve();
  if (configuring) return configuring;

  configuring = (async () => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          // While the app is on screen the alert is already rendered — a banner
          // over our own full-screen warning would only obscure it. Backgrounded
          // and locked are exactly the cases this module exists for.
          const foreground = AppState.currentState === 'active';
          return {
            shouldShowBanner: !foreground,
            shouldShowList: true,
            shouldPlaySound: !foreground,
            shouldSetBadge: false,
          };
        },
      });

      if (Platform.OS === 'android') await createChannels();
      configured = true;
    } catch {
      // Leave `configured` false so a later attempt can retry, but never let a
      // notification failure propagate into the caller.
    } finally {
      configuring = null;
    }
  })();

  return configuring;
}

async function createChannels(): Promise<void> {
  const importanceFor = (threat: ThreatLevel) =>
    threat === 'critical'
      ? Notifications.AndroidImportance.MAX
      : threat === 'warning'
        ? Notifications.AndroidImportance.HIGH
        : Notifications.AndroidImportance.DEFAULT;

  await Promise.all(
    SOUND_LABELS.map(async (label) => {
      const threat = SOUND_THREAT[label];
      const signature = signatureForSound(label);
      try {
        await Notifications.setNotificationChannelAsync(soundChannelId(label), {
          name: SOUND_DISPLAY_NAMES[label],
          description: `Alerts when SoundGuard recognises ${SOUND_DISPLAY_NAMES[label].toLowerCase()}. Vibration: ${signature.rhythm.toLowerCase()}.`,
          importance: importanceFor(threat),
          vibrationPattern: expandPattern(signature),
          enableVibrate: true,
          enableLights: threat !== 'safe',
          lightColor: ACCENT,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: false,
          sound: threat === 'safe' ? null : 'default',
        });
      } catch {
        /* one bad channel must not stop the others */
      }
    }),
  );

  try {
    await Notifications.setNotificationChannelAsync(THREAT_CHANNEL_ID, {
      name: 'Critical threat escalation',
      description:
        'The safety check that opens when a critical sound is detected. This is the alert that can send an SOS, so it is deliberately the most intrusive one.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: expandPattern(signatureFor('threat_armed')),
      enableVibrate: true,
      enableLights: true,
      lightColor: ACCENT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      // Ignored unless the user has granted Do Not Disturb access; requesting it
      // is a system dialog we deliberately do not force on anybody.
      bypassDnd: true,
      showBadge: true,
      sound: 'default',
    });
  } catch {
    /* ignore */
  }

  try {
    await Notifications.setNotificationChannelAsync(STATUS_CHANNEL_ID, {
      name: 'Monitoring status',
      description: 'Quiet notices about SoundGuard itself. Never used for alerts.',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
      sound: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    /* ignore */
  }
}

// ─── Permission ──────────────────────────────────────────────────────────────

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Ask for POST_NOTIFICATIONS (Android 13+) / alert authorisation (iOS).
 *
 * Called when the user starts monitoring rather than at boot: at that moment the
 * request is self-explanatory, which is the difference between a granted and a
 * denied prompt.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  await ensureNotificationSetup();
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    // iOS never re-prompts once denied; asking again is harmless and returns the
    // stored answer immediately.
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false, allowCriticalAlerts: false },
    });
    return result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

// ─── Posting ─────────────────────────────────────────────────────────────────

/** Data payload carried on every notification, read when one is tapped. */
export type NotificationPayload = {
  kind: 'detection' | 'threat' | 'sos';
  label?: SoundLabel;
};

/**
 * A recognised sound, delivered by the OS.
 *
 * The channel supplies the vibration signature, so this fires the correct
 * rhythm even when the JS thread is frozen by Doze — the `vibrate` field is set
 * as well, which is what older Android versions read.
 */
export async function notifyDetection(input: {
  label: SoundLabel;
  name: string;
  confidence: number;
  threat: ThreatLevel;
}): Promise<void> {
  await ensureNotificationSetup();

  const signature = signatureForSound(input.label);
  const percent = Math.round(input.confidence * 100);

  const body =
    input.threat === 'critical'
      ? `Critical sound, ${percent}% confidence. Open SoundGuard now.`
      : input.threat === 'warning'
        ? `Detected nearby, ${percent}% confidence.`
        : `Recognised nearby, ${percent}% confidence.`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `soundguard-detection-${input.label}`,
      content: {
        title: input.name,
        body,
        subtitle: signature.rhythm,
        data: { kind: 'detection', label: input.label } satisfies NotificationPayload,
        vibrate: expandPattern(signature),
        priority:
          input.threat === 'safe'
            ? Notifications.AndroidNotificationPriority.DEFAULT
            : Notifications.AndroidNotificationPriority.MAX,
        color: ACCENT,
        sound: input.threat !== 'safe',
        interruptionLevel: input.threat === 'critical' ? 'timeSensitive' : 'active',
        autoDismiss: true,
      },
      trigger: { channelId: soundChannelId(input.label) },
    });
  } catch {
    /* ignore */
  }
}

/**
 * The escalation warning. Posted the moment the safety check opens and refreshed
 * as the countdown runs, using a fixed identifier so the shade shows exactly one
 * live warning rather than a column of stale ones.
 */
export async function notifyThreat(input: {
  name: string;
  secondsLeft: number;
  label?: SoundLabel;
}): Promise<void> {
  await ensureNotificationSetup();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: THREAT_NOTIFICATION_ID,
      content: {
        title: `${input.name} — safety check`,
        body:
          input.secondsLeft > 0
            ? `An SOS will be sent in ${input.secondsLeft}s. Open SoundGuard to cancel.`
            : 'Sending your SOS now.',
        data: { kind: 'threat', label: input.label } satisfies NotificationPayload,
        vibrate: expandPattern(signatureFor('threat_armed')),
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: ACCENT,
        sound: true,
        // Not `critical`: that level needs Apple's Critical Alerts entitlement,
        // which this app does not hold and does not request. Asking for it
        // anyway would be a silent no-op on iOS and a lie in the source.
        // `timeSensitive` is the strongest level available to us, and it does
        // break through Focus modes.
        interruptionLevel: 'timeSensitive',
        sticky: true,
        autoDismiss: false,
      },
      trigger: { channelId: THREAT_CHANNEL_ID },
    });
  } catch {
    /* ignore */
  }
}

/** Remove the escalation warning — on cancel, on dispatch, and on teardown. */
export async function clearThreatNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(THREAT_NOTIFICATION_ID);
  } catch {
    /* ignore */
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(THREAT_NOTIFICATION_ID);
  } catch {
    /* ignore */
  }
}

/** Confirmation that the SOS flow ran, so there is a record in the shade. */
export async function notifySosDispatched(detail: string): Promise<void> {
  await ensureNotificationSetup();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SOS prepared',
        body: detail,
        data: { kind: 'sos' } satisfies NotificationPayload,
        vibrate: expandPattern(signatureFor('sos_dispatched')),
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: ACCENT,
        interruptionLevel: 'timeSensitive',
      },
      trigger: { channelId: THREAT_CHANNEL_ID },
    });
  } catch {
    /* ignore */
  }
}

/** Clear everything SoundGuard has posted. Used when monitoring stops. */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    /* ignore */
  }
}
