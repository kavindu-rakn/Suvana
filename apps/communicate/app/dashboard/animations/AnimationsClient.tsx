"use client";

import { SignDictionaryWorkbench } from "@/components/dictionary/SignDictionaryWorkbench";

/**
 * Dashboard → Animations.
 *
 * The page is the sign dictionary workbench: load an animation onto the
 * avatar, check it binds, register it as a gloss, and manage what's already
 * stored. It replaced the older split of separate FBX/JSON uploader cards and
 * a read-only gloss list — those couldn't show you the animation before you
 * committed it, which is the whole point of registering signs.
 */
export function AnimationsClient() {
  return <SignDictionaryWorkbench />;
}
