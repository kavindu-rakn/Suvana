/**
 * SoundGuard — Theme runtime
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolves the active palette from the user's preference (`system` | `light` |
 * `dark`) and the OS colour scheme, and exposes a `makeStyles` helper so every
 * screen can build fully themed StyleSheets without recomputing them on render.
 *
 * `makeStyles` caches one compiled StyleSheet per palette object. Because there
 * are exactly two palette objects in the app and they are module constants,
 * each screen's styles are created at most twice for the entire process
 * lifetime — switching themes is a cache hit, not a rebuild.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import {
  StyleSheet,
  useColorScheme as useSystemColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { darkPalette, lightPalette, type Palette, type Scheme } from '@/constants/theme';
import { useSettings } from './SettingsProvider';

type ThemeContextValue = {
  colors: Palette;
  scheme: Scheme;
  /** True when decorative animation should be suppressed. */
  reduceMotion: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkPalette,
  scheme: 'dark',
  reduceMotion: false,
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const systemScheme = useSystemColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: Scheme =
      settings.themeMode === 'system'
        ? systemScheme === 'light'
          ? 'light'
          : 'dark'
        : settings.themeMode;

    return {
      scheme,
      colors: scheme === 'light' ? lightPalette : darkPalette,
      reduceMotion: settings.reduceMotion,
    };
  }, [settings.themeMode, settings.reduceMotion, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Convenience: just the palette. */
export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

// ─── Themed stylesheets ──────────────────────────────────────────────────────

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Build a theme-aware stylesheet hook.
 *
 *   const useStyles = makeStyles((c) => ({ card: { backgroundColor: c.surface } }));
 *   ...
 *   const styles = useStyles();
 *
 * The factory runs once per palette and the result is memoised for the lifetime
 * of the module, so re-renders and theme switches never pay for StyleSheet
 * creation.
 */
export function makeStyles<T extends NamedStyles>(factory: (colors: Palette) => T) {
  const cache = new Map<Palette, T>();

  return function useThemedStyles(): T {
    const colors = useColors();
    const cached = cache.get(colors);
    if (cached) return cached;
    const created = StyleSheet.create(factory(colors)) as T;
    cache.set(colors, created);
    return created;
  };
}
