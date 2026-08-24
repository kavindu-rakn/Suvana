/**
 * SoundGuard mode — tab layout
 * ─────────────────────────────────────────────────────────────────────────────
 * The four surfaces of environmental sound monitoring. The group name carries
 * no URL segment, so these are `/listen`, `/history`, `/circle` and `/settings`.
 *
 * ── Microphone release (hardware isolation, layer 2) ─────────────────────────
 *
 * This layout owns the *mode*, so this is where the mode's hardware is given
 * back. Two independent triggers, because they fail in different ways:
 *
 *   • blur   — fires when the user leaves for the dashboard, for Live
 *              Transcribe, or for the SOS screen, even if React keeps the
 *              screen mounted underneath the new one.
 *   • unmount— fires when the group is actually popped or replaced, including
 *              paths that never produce a blur (a `replace` straight into the
 *              other mode, or a navigation state restored by the OS).
 *
 * Both call the same idempotent `stop()`, so running both is free. Switching
 * *between* tabs does not trigger either one: focus here tracks the group's
 * screen in the parent stack, not the child tab, which is exactly right —
 * checking history mid-detection must not stop monitoring.
 *
 * ── Why backgrounding is handled here, not in EngineProvider ─────────────────
 *
 * The `backgroundListening` setting decides whether capture survives the app
 * going to the background, and therefore whether it should be resumed when the
 * app comes back. That resume is only ever correct *inside this mode*. Owning
 * it from the app-wide provider meant a user who backgrounded SoundGuard, came
 * back, and navigated to Live Transcribe could have monitoring silently
 * re-opened underneath them. Anchoring the listener to this layout makes the
 * bug unrepresentable: the subscription is torn down with the mode, so there is
 * nothing left to resume into.
 *
 * ── Preference versus capability ─────────────────────────────────────────────
 *
 * Wanting to listen in the background is not the same as being able to. On
 * Android the ability comes from the native microphone foreground service,
 * which only exists in a build made with `plugins/withSoundGuardBackground.js`;
 * without it, a backgrounded app reads pure silence from the microphone and
 * reports nothing while looking perfectly healthy. So the setting is combined
 * with the real capability, and where the capability is missing the pipeline is
 * paused and resumed rather than left running deaf. iOS needs no such service —
 * its background audio mode covers it — so the check is Android-only.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet, type AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/providers/SettingsProvider';
import { useColors } from '@/providers/ThemeProvider';
import { audioArbiter } from '@/utils/audioArbiter';
import { backgroundCapture } from '@/utils/backgroundService';
import { clearAllNotifications } from '@/utils/notifications';
import { soundEngine } from '@/utils/soundEngine';

export default function GuardLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  // Leaving the mode releases the microphone. `stop()` is synchronous for the
  // UI and hands the native teardown to the arbiter, so the hardware is free
  // before the other mode can possibly ask for it.
  useFocusEffect(
    useCallback(
      () => () => {
        soundEngine.stop();
      },
      [],
    ),
  );

  useEffect(
    () => () => {
      soundEngine.stop();
    },
    [],
  );

  // ── Background behaviour, driven by the `backgroundListening` setting ──
  //
  // With the setting on, nothing happens here at all: the microphone foreground
  // service started by `soundEngine.start()` is what actually keeps capture
  // alive, and tearing the pipeline down on `background` would be precisely the
  // bug this release fixes. With it off, monitoring is paused and — importantly
  // — *remembered*, so returning to the app restores the state the user left.
  const autoPaused = useRef(false);

  const canRunInBackground =
    settings.backgroundListening &&
    (Platform.OS !== 'android' || backgroundCapture.available);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        // Anything the OS showed while we were away has been superseded by the
        // live UI the user is now looking at.
        void clearAllNotifications();

        if (!autoPaused.current) return;
        autoPaused.current = false;
        // Resume only into a free microphone. Anything else means ownership
        // moved while we were away, and it is not ours to take back.
        if (audioArbiter.getOwner() !== null) return;
        void soundEngine.start();
        return;
      }

      // 'background' or 'inactive'
      if (soundEngine.getState().status !== 'listening') return;
      if (canRunInBackground) return;
      autoPaused.current = true;
      soundEngine.stop();
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [canRunInBackground]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        // Edge-to-edge is enabled on Android, so the bottom inset is added
        // explicitly rather than relying on the default chrome height.
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="listen"
        options={{
          title: 'Listen',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: 'Circle',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
