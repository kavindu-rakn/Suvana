/**
 * SoundGuard — Settings runtime
 * ─────────────────────────────────────────────────────────────────────────────
 * One in-memory source of truth for every preference, hydrated once at boot.
 *
 * The previous Settings screen kept its own local copy and re-read AsyncStorage
 * on focus, which is why toggles looked interactive but changed nothing: the
 * detection hook only sampled `sensitivity` at `startListening`, and no other
 * consumer ever read the store at all. Here, `update()` mutates the shared
 * object synchronously (so the switch animates instantly), then persists in the
 * background. Every consumer — theme, engine, SOS flow — reads the same object,
 * so a change is live everywhere in the same commit.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  DEFAULT_SETTINGS,
  getSettings,
  saveAllSettings,
  type AppSettings,
} from '@/utils/storage';

type SettingsContextValue = {
  settings: AppSettings;
  /** True once the persisted values have been read. */
  ready: boolean;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** Apply several keys at once (one write, one render). */
  merge: (patch: Partial<AppSettings>) => void;
  /** Restore factory defaults, preserving the onboarding flag. */
  resetToDefaults: () => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  ready: false,
  update: () => {},
  merge: () => {},
  resetToDefaults: () => {},
});

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  /** Mirrors `settings` so writes never depend on a stale closure. */
  const latest = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getSettings();
      if (cancelled) return;
      latest.current = stored;
      setSettings(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: AppSettings) => {
    latest.current = next;
    setSettings(next);
    // Persistence is intentionally not awaited: the UI is already correct, and
    // a slow disk must never make a toggle feel laggy.
    void saveAllSettings(next);
  }, []);

  const update = useCallback<SettingsContextValue['update']>(
    (key, value) => {
      if (latest.current[key] === value) return;
      commit({ ...latest.current, [key]: value });
    },
    [commit],
  );

  const merge = useCallback(
    (patch: Partial<AppSettings>) => {
      commit({ ...latest.current, ...patch });
    },
    [commit],
  );

  const resetToDefaults = useCallback(() => {
    commit({ ...DEFAULT_SETTINGS, onboardingComplete: latest.current.onboardingComplete });
  }, [commit]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, ready, update, merge, resetToDefaults }),
    [settings, ready, update, merge, resetToDefaults],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
