/**
 * SoundGuard — Onboarding route
 * ─────────────────────────────────────────────────────────────────────────────
 * A real Expo Router screen, not an overlay. It is mounted only while
 * <Stack.Protected guard={!onboardingComplete}> is satisfied, so completing the
 * flow simply flips the setting and the router removes this route from the tree
 * on its own — no imperative navigation, no redirect race.
 */

import React from 'react';

import { Onboarding } from '@/components/Onboarding';

export default function OnboardingScreen() {
  return <Onboarding />;
}
