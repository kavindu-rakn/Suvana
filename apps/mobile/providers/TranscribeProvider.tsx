/**
 * SoundGuard — Live Transcribe binding
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects the framework-free `transcribeEngine` singleton to React, following
 * exactly the same three rules as `EngineProvider`:
 *
 *   1. State arrives through `useSyncExternalStore` over the engine's immutable
 *      snapshot, and the engine only notifies on a genuine change.
 *   2. Actions are a frozen, stable object, so dependency arrays stay honest.
 *   3. The input level never touches React state. It is pushed into a
 *      Reanimated shared value and animated on the UI thread, so the caption
 *      screen's level indicator costs zero renders while text is streaming in.
 *
 * Keeping both microphone consumers on an identical shape is deliberate: the
 * two modes then behave the same way under Fast Refresh, backgrounding and
 * navigation, and there is only one lifecycle pattern to reason about.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { transcribeEngine, type TranscribeState } from '@/utils/transcribeEngine';
import { useSettings } from './SettingsProvider';

export type TranscribeActions = {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  clear: () => void;
  /** The whole transcript as plain text, newest last. */
  fullText: () => string;
  /** Re-check whether the device has a usable recogniser. */
  probe: () => boolean;
  /** Is this language known to work on this device? Unknown counts as yes. */
  isLocaleSupported: (locale: string) => boolean;
  /** Does this language have an offline pack, so it works without a network? */
  isLocaleInstalled: (locale: string) => boolean;
  /** Ask Android to fetch a language pack. */
  downloadLanguage: (locale: string) => Promise<{ ok: boolean; message: string }>;
};

type TranscribeContextValue = {
  actions: TranscribeActions;
  /** 0…1 input level, animated on the UI thread. */
  level: SharedValue<number>;
};

const noop = () => {};

const FALLBACK: TranscribeContextValue = {
  actions: {
    start: noop,
    stop: noop,
    toggle: noop,
    clear: noop,
    fullText: () => '',
    probe: () => false,
    isLocaleSupported: () => true,
    isLocaleInstalled: () => false,
    downloadLanguage: async () => ({ ok: false, message: '' }),
  },
  // Replaced by the provider; never read before it mounts.
  level: { value: 0 } as SharedValue<number>,
};

const TranscribeContext = createContext<TranscribeContextValue>(FALLBACK);

export function TranscribeProvider({ children }: PropsWithChildren) {
  const { settings, ready } = useSettings();
  const level = useSharedValue(0);

  // ── Level meter: engine → shared value, bypassing React entirely ──
  useEffect(() => {
    transcribeEngine.onLevel = (value: number) => {
      level.value = withTiming(value, { duration: 130 });
    };
    return () => {
      transcribeEngine.onLevel = null;
    };
  }, [level]);

  // ── Capability probe, so the dashboard can be honest before anything opens ──
  //
  // The language probe is asynchronous and touches the platform recogniser, so
  // it runs once here rather than from the picker: by the time somebody opens
  // the language list, the answer is already in state and the list renders with
  // its availability marks on the first frame.
  useEffect(() => {
    transcribeEngine.probe();
    void transcribeEngine.probeLocales();
  }, []);

  // ── Push recogniser preferences down; a live session restarts in place ──
  useEffect(() => {
    if (!ready) return;
    transcribeEngine.setOptions({
      locale: settings.transcribeLocale,
      interimResults: settings.transcribeInterim,
      addsPunctuation: settings.transcribePunctuation,
      preferOffline: settings.transcribeOffline,
    });
  }, [
    ready,
    settings.transcribeLocale,
    settings.transcribeInterim,
    settings.transcribePunctuation,
    settings.transcribeOffline,
  ]);

  const value = useMemo<TranscribeContextValue>(
    () => ({
      level,
      actions: Object.freeze({
        start: () => {
          void transcribeEngine.start();
        },
        stop: () => transcribeEngine.stop(),
        toggle: () => transcribeEngine.toggle(),
        clear: () => transcribeEngine.clear(),
        fullText: () => transcribeEngine.fullText(),
        probe: () => transcribeEngine.probe(),
        isLocaleSupported: (locale: string) => transcribeEngine.isLocaleSupported(locale),
        isLocaleInstalled: (locale: string) => transcribeEngine.isLocaleInstalled(locale),
        downloadLanguage: (locale: string) => transcribeEngine.downloadLanguage(locale),
      }),
    }),
    [level],
  );

  return <TranscribeContext.Provider value={value}>{children}</TranscribeContext.Provider>;
}

/** Reactive recogniser state. Re-renders only when a published value changes. */
export function useTranscribeState(): TranscribeState {
  return useSyncExternalStore(
    transcribeEngine.subscribe,
    transcribeEngine.getState,
    transcribeEngine.getState,
  );
}

/** Stable action handles. Safe in any dependency array. */
export function useTranscribeActions(): TranscribeActions {
  return useContext(TranscribeContext).actions;
}

/** Live input level as a Reanimated shared value (UI thread). */
export function useTranscribeLevel(): SharedValue<number> {
  return useContext(TranscribeContext).level;
}
