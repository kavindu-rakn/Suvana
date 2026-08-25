/**
 * SoundGuard — Root layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Expo Router owns the one and only NavigationContainer. This file therefore
 * obeys two hard rules:
 *
 *   1. THE NAVIGATOR IS RENDERED UNCONDITIONALLY. The previous version returned
 *      a plain <View> while settings hydrated, so the root layout produced no
 *      navigator on its first render and a <Stack> on a later one. Expo Router
 *      mounts its container around whatever the root layout returns; swapping a
 *      non-navigator for a navigator re-runs container and linking setup, which
 *      is what raised "you have configured linking in multiple places". Boot
 *      gating is now a cosmetic overlay painted *over* a live navigator, never
 *      a substitute for one.
 *
 *   2. NO NavigationContainer, and no navigation state, is created here. The
 *      only @react-navigation import is ThemeProvider, which is a plain context
 *      provider carrying colours — it holds no navigation state.
 *
 * Onboarding is a real route (`app/onboarding.tsx`) gated with the router's own
 * <Stack.Protected> primitive rather than an ad-hoc overlay. A guarded screen is
 * removed from the route tree entirely, so the router resolves straight to the
 * correct screen instead of mounting the wrong one and redirecting — there is no
 * redirect race and no flash of the wrong screen.
 *
 * ── Route shape ──────────────────────────────────────────────────────────────
 *
 *   /              Home dashboard — the two modes, and no audio of its own
 *   /transcribe    Live Transcribe — OS speech recognition
 *   (guard)        SoundGuard — the tabbed monitoring mode
 *      /listen /history /circle /settings
 *   /sos-alert     Emergency dispatch, reachable from anywhere
 *   /onboarding    First run
 *
 * Both modes are *pushed* from the dashboard rather than being tabs of one
 * navigator. That is a hardware decision as much as a navigation one: a pushed
 * screen is unmounted when it is popped, which gives each mode a single,
 * unambiguous moment at which to release the microphone. Tabs keep their
 * screens mounted, so a tabbed layout would have left both modes alive at once
 * with only a focus flag distinguishing them.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme,
} from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import {
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
  NotoSerif_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-serif';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AudioGovernor } from '@/components/AudioGovernor';
import { FlashOverlay } from '@/components/FlashOverlay';
import { NotificationRouter } from '@/components/NotificationRouter';
import { ThreatLockOverlay } from '@/components/ThreatLockOverlay';
import { EngineProvider } from '@/providers/EngineProvider';
import { SettingsProvider, useSettings } from '@/providers/SettingsProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { TranscribeProvider } from '@/providers/TranscribeProvider';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Already hidden, or the module is unavailable in this environment. */
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <EngineProvider>
              <TranscribeProvider>
                <AppShell />
              </TranscribeProvider>
            </EngineProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { settings, ready } = useSettings();
  const { colors, scheme } = useTheme();
  const pathname = usePathname();

  const [booted, setBooted] = useState(false);

  // Suvana brand typeface. React Native has no font fallback chain: until the
  // faces are registered, anything asking for "NotoSerif_*" renders in the
  // system font, so the splash is held until they load. `fontsError` still
  // releases it — a missing font must never be the reason the app won't open.
  const [fontsLoaded, fontsError] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_600SemiBold,
    NotoSerif_700Bold,
  });

  // The correct route is live once hydration has finished *and* the router has
  // actually resolved to the side of the guard the settings ask for. Waiting
  // for both means the first-run route swap happens entirely behind the cover.
  const onOnboardingRoute = pathname === '/onboarding';
  const routeSettled =
    ready &&
    (fontsLoaded || !!fontsError) &&
    (settings.onboardingComplete ? !onOnboardingRoute : onOnboardingRoute);

  useEffect(() => {
    if (booted || !routeSettled) return;
    setBooted(true);
  }, [booted, routeSettled]);

  // Safety net: never leave the user staring at a splash screen because a route
  // failed to resolve for some unforeseen reason.
  useEffect(() => {
    if (booted) return;
    const timer = setTimeout(() => setBooted(true), 2500);
    return () => clearTimeout(timer);
  }, [booted]);

  useEffect(() => {
    if (!booted) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: scheme === 'dark',
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.bgElevated,
        text: colors.text,
        border: colors.border,
        notification: colors.critical,
      },
    };
  }, [colors, scheme]);

  // Before hydration the app group stays mounted so the navigator always has a
  // route. A returning user therefore never swaps screens at all; a first-run
  // user swaps once, underneath the boot cover.
  const showOnboarding = ready && !settings.onboardingComplete;
  const showApp = !ready || settings.onboardingComplete;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={showOnboarding}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={showApp}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(guard)" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="transcribe" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="sos-alert"
            options={{
              // A native fullScreenModal opens its own container above the root
              // view, which would hide the flash overlay. A faded card keeps the
              // whole app in one hierarchy.
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
      </Stack>

      {/* Route-independent behaviour. Plain siblings of the navigator — none of
          them creates navigation state.

          Order matters for the two overlays: the threat lock covers every route,
          and the flash covers the lock. A strobe over the warning is legible; a
          warning over the strobe would hide it. */}
      <AudioGovernor />
      <NotificationRouter />
      <ThreatLockOverlay />
      <FlashOverlay />

      {/* Cosmetic boot cover. Painted over a live navigator so the first-run
          route swap is never visible, without ever withholding the navigator. */}
      {booted ? null : (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.bg,
            zIndex: 400,
            elevation: 400,
          }}
        />
      )}
    </NavigationThemeProvider>
  );
}
