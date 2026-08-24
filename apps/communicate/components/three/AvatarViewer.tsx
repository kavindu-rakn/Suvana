"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { SignAvatar } from "./SignAvatar";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { AVATARS, DEFAULT_AVATAR, type AvatarId, type QuickMagicModel } from "./useQuickMagicModel";
import type { GlossMatch } from "@/lib/nlp/matchers/types";

const viewerBackground =
  "radial-gradient(ellipse 65% 60% at 50% 38%, #18141f 0%, #0c0a10 60%, #08070a 100%)";

/**
 * Frames the avatar's upper body — signing happens between the waist and the
 * head, so that's what fills the viewport.
 *
 * The distance is solved from the model's bounding box against the *current*
 * aspect ratio rather than hardcoded, so the avatar never gets cropped when
 * the panel is narrow, and it re-solves on resize.
 */
function FramingRig({ model }: { model: QuickMagicModel | null }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;

  useEffect(() => {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model.scene);
    if (box.isEmpty()) return;

    const extent = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Upper body: from mid-torso up.
    const focusY = box.min.y + extent.y * 0.78;
    const framedHeight = extent.y * 0.46;

    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = Math.max(
      framedHeight / 2 / Math.tan(vFov / 2),
      extent.x / 2 / Math.tan(hFov / 2)
    );

    camera.position.set(center.x, focusY, center.z + distance * 1.15 + extent.z / 2);
    if (controls) {
      controls.target.set(center.x, focusY, center.z);
      controls.update();
    }
  }, [model, camera, controls, size.width, size.height]);

  return null;
}

export function AvatarViewer({
  avatarId = DEFAULT_AVATAR,
  glossQueue,
  emotion,
  queuePaused,
  queueRestartKey,
  onQueueComplete,
}: {
  avatarId?: AvatarId;
  glossQueue?: GlossMatch[];
  /** Drives playback speed and pause length — see lib/emotion/styles.ts. */
  emotion?: string | null;
  /** Pause/resume the currently-playing sign. */
  queuePaused?: boolean;
  /** Bump to restart the queue from its first sign. */
  queueRestartKey?: number;
  onQueueComplete?: () => void;
}) {
  const [currentGloss, setCurrentGloss] = useState<string | null>(null);
  const [model, setModel] = useState<QuickMagicModel | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Pop the caption each time the sign changes, so it reads as a new word
  // rather than silently swapping text mid-sequence.
  useGSAP(
    () => {
      if (!currentGloss || !badgeRef.current) return;
      gsap.fromTo(
        badgeRef.current,
        { y: 10, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.7)" }
      );
    },
    { dependencies: [currentGloss] }
  );

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-xl border border-border"
      style={{ background: viewerBackground }}
    >
      {!model && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-foreground-muted">
          <Loader2 size={16} className="animate-spin" />
          Loading {AVATARS[avatarId].label.toLowerCase()} avatar…
        </div>
      )}

      <ModelErrorBoundary>
        <Canvas
          camera={{ position: [0, 1.3, 2.2], fov: 32, near: 0.01, far: 100 }}
          /* `flat` is what disables tone mapping — R3F applies its own colour
             defaults after `gl` and would otherwise force ACES Filmic, which
             greys out the stylised skin. */
          flat
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.35} />
          <hemisphereLight args={["#ffffff", "#d6cec6", 0.9]} />
          <directionalLight position={[1.8, 3.2, 4]} intensity={0.62} />
          <directionalLight position={[-2.5, 1.5, 2.5]} intensity={0.32} />
          <directionalLight position={[0, 1.5, -3]} intensity={0.22} />

          <FramingRig model={model} />
          <SignAvatar
            avatarId={avatarId}
            glossQueue={glossQueue}
            emotion={emotion}
            paused={queuePaused}
            restartKey={queueRestartKey}
            onGlossChange={setCurrentGloss}
            onQueueComplete={onQueueComplete}
            onReady={setModel}
          />
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={5} blur={2.6} far={3} />
          <OrbitControls makeDefault enablePan={false} minDistance={0.4} maxDistance={5} />
        </Canvas>
      </ModelErrorBoundary>

      {currentGloss && (
        <div
          ref={badgeRef}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-accent/40 bg-background-elevated/90 px-4 py-1.5 text-sm text-accent backdrop-blur"
        >
          {currentGloss}
        </div>
      )}
    </div>
  );
}
