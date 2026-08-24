"use client";

import { apiPath } from "@/lib/basePath";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileJson,
  Loader2,
  Pause,
  Play,
  Save,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useQuickMagicModel,
  AVATARS,
  DEFAULT_AVATAR,
  type AvatarId,
  type LoadOptions,
  type QuickMagicModel,
} from "@/components/three/useQuickMagicModel";
import {
  retargetClip,
  describeBinding,
  type ClipBindingReport,
} from "@/components/three/retargetClip";
import { PostureRig } from "@/components/three/PostureRig";
import {
  EMOTION_ORDER,
  EMOTION_STYLES,
  describeStyle,
  type EmotionLabel,
} from "@/lib/emotion/styles";
import { Select } from "@/components/ui/Select";
import { parseFbxToClips, clipToStoredJson } from "@/lib/animation/fbxToClipJson";
import { toAnimationClip } from "@/lib/animation/mixamoJsonToClip";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

interface LoadedAnimation {
  fileName: string;
  clips: THREE.AnimationClip[];
  /** Binding report per clip, index-aligned with `clips`. */
  reports: ClipBindingReport[];
}

/** One registered sign, as returned by GET /api/animations. */
interface GlossEntry {
  _id: string;
  gloss: string;
  synonyms: string[];
  cloudinaryUrl: string;
  rig?: "mixamo" | "biped";
  sourceAvatar?: AvatarId;
  duration?: number;
  boneCount?: number;
}

type Toast = { kind: "ok" | "error"; message: string } | null;

/**
 * The import fixes are settled, so they're applied unconditionally rather
 * than exposed as toggles: strip the junk vertex-colour channel, weld the
 * unindexed geometry, keep authored normals, and bake a substitute face map
 * (the export is missing `F1_001_Head_Diff.png`). See useQuickMagicModel.
 */
const IMPORT_OPTIONS: LoadOptions = {
  stripVertexColors: true,
  weldVertices: true,
  recomputeNormals: false,
  bakeFaceDetail: true,
};

/**
 * Framing presets. "Full" is computed from the model's bounding box so the
 * whole avatar always fits the viewport whatever its size; the closer views
 * are fixed offsets, since hands and face are the parts that have to be
 * legible for sign language.
 */
const CLOSE_VIEWS = {
  upper: { position: [0, 1.32, 1.45], target: [0, 1.22, 0] },
  hands: { position: [0, 1.18, 0.85], target: [0, 1.14, 0] },
  face: { position: [0, 1.5, 0.5], target: [0, 1.46, 0] },
} as const;

type ViewPreset = "full" | keyof typeof CLOSE_VIEWS;

const VIEW_LABELS: Record<ViewPreset, string> = {
  full: "Full",
  upper: "Upper",
  hands: "Hands",
  face: "Face",
};

/* ------------------------------------------------------------------ */
/*  Camera                                                            */
/* ------------------------------------------------------------------ */

/**
 * Places the camera for the selected preset.
 *
 * "Full" solves for the distance that fits the model's bounding box in the
 * *current* viewport rather than using a hardcoded position — a fixed
 * distance crops the avatar as soon as the panel is short or narrow, which
 * is exactly the "have to scroll to see the whole model" problem. Re-runs on
 * resize because the fit depends on aspect ratio.
 */
function CameraRig({ preset, model }: { preset: ViewPreset; model: QuickMagicModel | null }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;

  useEffect(() => {
    if (preset !== "full") {
      const { position, target } = CLOSE_VIEWS[preset];
      camera.position.set(position[0], position[1], position[2]);
      if (controls) {
        controls.target.set(target[0], target[1], target[2]);
        controls.update();
      }
      return;
    }

    if (!model) return;

    const box = new THREE.Box3().setFromObject(model.scene);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());

    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // Distance needed on each axis; the larger one is what actually fits.
    const distance = Math.max(
      extent.y / 2 / Math.tan(vFov / 2),
      extent.x / 2 / Math.tan(hFov / 2)
    );

    // 12% headroom so the silhouette isn't flush against the edges. Near/far
    // are set declaratively on the Canvas — this model is ~1.6 m, well inside
    // a 0.01–100 range, so there's nothing to adjust per-fit.
    camera.position.set(center.x, center.y, center.z + distance * 1.12 + extent.z / 2);

    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [preset, model, camera, controls, size.width, size.height]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Scene                                                             */
/* ------------------------------------------------------------------ */

function Scene({
  avatarId,
  clip,
  playing,
  emotion,
  replayKey,
  onReady,
  onError,
}: {
  avatarId: AvatarId;
  clip: THREE.AnimationClip | null;
  playing: boolean;
  /** Applies the same speed + posture conditioning the sign page uses. */
  emotion: EmotionLabel;
  /** Bump to restart the clip from its first frame. */
  replayKey: number;
  onReady: (model: QuickMagicModel) => void;
  onError: (error: string | null) => void;
}) {
  const { model, error } = useQuickMagicModel(avatarId, IMPORT_OPTIONS);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const style = EMOTION_STYLES[emotion];

  useEffect(() => {
    if (model) onReady(model);
  }, [model, onReady]);

  useEffect(() => {
    onError(error);
  }, [error, onError]);

  useEffect(() => {
    if (!model || !clip) return;
    const action = model.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    actionRef.current = action;
    return () => {
      action.stop();
      model.mixer.uncacheAction(clip);
      actionRef.current = null;
    };
  }, [model, clip, replayKey]);

  useEffect(() => {
    if (actionRef.current) actionRef.current.paused = !playing;
  }, [playing, model, clip]);

  // Live, so changing the dropdown re-times the loop already running rather
  // than waiting for the clip to be re-mounted.
  useEffect(() => {
    if (actionRef.current) actionRef.current.timeScale = style.speed;
  }, [style.speed, model, clip]);

  if (!model) return null;
  return (
    <>
      <primitive object={model.scene} dispose={null} />
      {/* After <primitive>, so the posture offset lands on top of the mixer. */}
      <PostureRig model={model} style={style} />
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={5} blur={2.6} far={3} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Presentational pieces                                             */
/* ------------------------------------------------------------------ */

function SectionCard({
  step,
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  step: number;
  icon: typeof BookOpen;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card data-reveal className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-foreground-muted">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Icon size={14} className="text-accent" />
              {title}
            </h2>
            {hint && (
              <p className="mt-0.5 text-[11px] leading-snug text-foreground-muted">{hint}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function BindingNotice({ report }: { report: ClipBindingReport }) {
  const { tone, headline, detail } = describeBinding(report);
  const style = {
    ok: { icon: CheckCircle2, text: "text-accent", border: "border-accent/40" },
    warn: { icon: AlertTriangle, text: "text-yellow-400", border: "border-yellow-400/40" },
    fail: { icon: XCircle, text: "text-red-400", border: "border-red-400/40" },
  }[tone];
  const Icon = style.icon;

  return (
    <div className={`mt-2 rounded border ${style.border} p-2`}>
      <p className={`flex items-start gap-1.5 text-[11px] font-medium ${style.text}`}>
        <Icon size={12} className="mt-0.5 shrink-0" />
        {headline}
      </p>
      <p className="mt-1 pl-[18px] text-[11px] leading-snug text-foreground-muted">{detail}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

const viewerBackground =
  "radial-gradient(ellipse 65% 60% at 50% 42%, #18141f 0%, #0c0a10 60%, #08070a 100%)";

export function SignDictionaryWorkbench() {
  /* viewer */
  const [model, setModel] = useState<QuickMagicModel | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [viewPreset, setViewPreset] = useState<ViewPreset>("full");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR);

  /* animation */
  const [loaded, setLoaded] = useState<LoadedAnimation | null>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  /**
   * Manual emotion, for checking the conditioning without going through the
   * audio pipeline. On the sign page this comes from the classifier; here it's
   * whatever you pick.
   */
  const [emotion, setEmotion] = useState<EmotionLabel>("neutral");
  const [replayKey, setReplayKey] = useState(0);

  /* dictionary */
  const [entries, setEntries] = useState<GlossEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [glossName, setGlossName] = useState("");
  const [synonyms, setSynonyms] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rootRef = useRef<HTMLDivElement>(null);

  // One-time entrance: the three steps cascade in, the viewer settles a beat
  // later. Runs on mount only — re-running on every state change would make
  // the panel flicker each time the dictionary refetches.
  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power2.out" } })
        .from("[data-reveal]", { y: 18, opacity: 0, duration: 0.45, stagger: 0.09 })
        .from("[data-viewer]", { opacity: 0, scale: 0.985, duration: 0.5 }, "-=0.35");
    },
    { scope: rootRef }
  );

  // Slide the toast in rather than popping it, so it reads as a notification.
  const toastRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!toast || !toastRef.current) return;
      gsap.from(toastRef.current, { y: -8, opacity: 0, duration: 0.3, ease: "power2.out" });
    },
    { dependencies: [toast] }
  );

  /** Node names any track could target — bones plus the transforms above them. */
  const nodeNames = useMemo(() => {
    const names = new Set<string>();
    model?.scene.traverse((child) => {
      if (child.name) names.add(child.name);
    });
    return names;
  }, [model]);

  /**
   * Nodes directly under the model root — the rig's root transform. Passed to
   * the retargeter so it can drop those tracks; the two avatars store their
   * up-axis differently and a clip's root rotation otherwise flips one of them
   * onto its back. See retargetClip().
   */
  const rootNodeNames = useMemo(() => {
    const names = new Set<string>();
    for (const child of model?.scene.children ?? []) {
      if (child.name) names.add(child.name);
    }
    return names;
  }, [model]);

  /* ---------- dictionary list ---------- */

  const refreshDictionary = useCallback(() => {
    setListLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  // Refetched by bumping a token rather than calling a loader, so every
  // setState sits behind an await inside the effect.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiPath("/api/animations"));
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 401) {
          setEntries([]);
          setListError("Sign in to read or edit the dictionary.");
          return;
        }
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setEntries((data.glosses as GlossEntry[]) ?? []);
        setListError(null);
      } catch (err) {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Couldn't load the dictionary.");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  /* ---------- loading animations ---------- */

  const adopt = useCallback(
    (clips: THREE.AnimationClip[], fileName: string, suggestedName?: string) => {
      const retargeted = clips.map((clip) => retargetClip(clip, nodeNames, rootNodeNames));
      setLoaded({
        fileName,
        clips: retargeted.map((r) => r.clip),
        reports: retargeted.map((r) => r.report),
      });
      setClipIndex(0);
      setPlaying(true);
      if (suggestedName) setGlossName((current) => current || suggestedName.toUpperCase());
    },
    [nodeNames, rootNodeNames]
  );

  /**
   * Retargeting runs at load time, not play time, so the binding verdict is
   * visible before anything is saved — a clip that binds nothing looks
   * exactly like a paused one on screen.
   */
  const handleFbxUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLoadError(null);
      setParsing(true);
      try {
        const clips = parseFbxToClips(await file.arrayBuffer());
        if (clips.length === 0) {
          setLoadError("No animation clips found in this FBX.");
          return;
        }
        adopt(clips, file.name, file.name.replace(/\.fbx$/i, ""));
      } catch {
        setLoadError("Couldn't parse that as FBX. FBXLoader needs binary or ASCII FBX 7.0+.");
      } finally {
        setParsing(false);
      }
    },
    [adopt]
  );

  /** `toAnimationClip` is the converter the production avatar uses, so what plays here is what ships. */
  const handleJsonUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLoadError(null);
      setParsing(true);
      try {
        const json: unknown = JSON.parse(await file.text());
        const name = file.name.replace(/\.json$/i, "");
        adopt([toAnimationClip(json, name)], file.name, name);
      } catch (err) {
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn't read that file as an animation clip."
        );
      } finally {
        setParsing(false);
      }
    },
    [adopt]
  );

  const handlePreviewEntry = useCallback(
    async (entry: GlossEntry) => {
      setBusyId(entry._id);
      setLoadError(null);
      if (entry.sourceAvatar && entry.sourceAvatar !== avatarId) {
        setLoadError(
          `"${entry.gloss}" was recorded on the ${AVATARS[entry.sourceAvatar].label.toLowerCase()} avatar. ` +
            `The two rigs share bone names but not bind poses, so it will deform the ` +
            `${AVATARS[avatarId].label.toLowerCase()} — switch avatar to view it correctly.`
        );
      }
      try {
        const res = await fetch(
          `/api/animations/fetch?url=${encodeURIComponent(entry.cloudinaryUrl)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        adopt([toAnimationClip(json, entry.gloss)], `dictionary: ${entry.gloss}`);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Couldn't load that clip.");
      } finally {
        setBusyId(null);
      }
    },
    [adopt, avatarId]
  );

  /* ---------- derived ---------- */

  const activeClips = loaded?.clips ?? model?.clips ?? [];
  const safeIndex = clipIndex < activeClips.length ? clipIndex : 0;
  const currentClip = activeClips[safeIndex] ?? null;
  const activeReport = loaded?.reports[safeIndex] ?? null;

  const duplicateEntry = useMemo(
    () => entries.find((e) => e.gloss === glossName.trim().toUpperCase()),
    [entries, glossName]
  );

  /* ---------- dictionary writes ---------- */

  /**
   * Always re-serialises from the live clip rather than posting the uploaded
   * file back: whatever shape came in, what gets stored is the one normalised
   * format, already retargeted — so what you previewed is what's saved.
   */
  const handleSave = useCallback(async () => {
    if (!currentClip || !glossName.trim()) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("gloss", glossName.trim());
      form.append("synonyms", synonyms);
      // Which skeleton this was authored against — the two avatars share bone
      // names but not bind poses, so playback needs to know.
      form.append("sourceAvatar", avatarId);
      form.append(
        "file",
        new Blob([JSON.stringify(clipToStoredJson(currentClip))], { type: "application/json" }),
        `${glossName.trim().toLowerCase().replace(/\s+/g, "-")}.json`
      );

      const res = await fetch(apiPath("/api/animations/upload"), { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Sign in to save to the dictionary.");
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setToast({ kind: "ok", message: `Saved "${glossName.trim().toUpperCase()}".` });
      setSynonyms("");
      refreshDictionary();
    } catch (err) {
      setToast({ kind: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }, [currentClip, glossName, synonyms, refreshDictionary, avatarId]);

  const handleDelete = useCallback(
    async (entry: GlossEntry) => {
      if (!window.confirm(`Delete "${entry.gloss}" from the dictionary? This can't be undone.`)) {
        return;
      }
      setBusyId(entry._id);
      try {
        const res = await fetch(apiPath(`/api/animations/${entry._id}`), { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setToast({
          kind: "ok",
          message: data.blobDeleted
            ? `Deleted "${entry.gloss}".`
            : `Removed "${entry.gloss}" — the stored file may be orphaned.`,
        });
        refreshDictionary();
      } catch (err) {
        setToast({ kind: "error", message: err instanceof Error ? err.message : "Delete failed." });
      } finally {
        setBusyId(null);
      }
    },
    [refreshDictionary]
  );

  const handleExport = useCallback(() => {
    if (!currentClip) return;
    const blob = new Blob([JSON.stringify(clipToStoredJson(currentClip), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentClip.name || "animation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentClip]);

  /* ------------------------------------------------------------------ */

  return (
    /* Pinned to the viewport so the avatar is always fully visible without
       scrolling the page; only the controls column scrolls. The 12rem covers
       the dashboard chrome above and below (navbar + tabs + container
       padding). */
    <div ref={rootRef} className="flex flex-col gap-3 md:h-[calc(100vh-12rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BookOpen className="text-accent" size={20} />
          Sign Dictionary
        </h1>

        {/* Both avatars share one Biped skeleton, so the loaded clip keeps
            playing across a switch — no reload, no retarget. */}
        <div className="flex items-center gap-3">
          <fieldset className="flex items-center gap-1 rounded-md border border-border p-1">
            <legend className="sr-only">Avatar</legend>
            {(Object.keys(AVATARS) as AvatarId[]).map((id) => (
              <label
                key={id}
                className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors ${
                  avatarId === id
                    ? "bg-accent/20 text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="avatar"
                  className="sr-only"
                  checked={avatarId === id}
                  onChange={() => setAvatarId(id)}
                />
                {AVATARS[id].label}
              </label>
            ))}
          </fieldset>
          <span
            className="hidden max-w-[280px] truncate font-mono text-[11px] text-foreground-muted sm:inline"
            title={AVATARS[avatarId].note}
          >
            {AVATARS[avatarId].file}
          </span>
        </div>
      </div>

      {toast && (
        <div
          ref={toastRef}
          className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            toast.kind === "ok"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-red-400/40 bg-red-950/40 text-red-300"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {toast.message}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[330px_1fr]">
        {/* ------------ controls (scrolls) ------------
            Ordered second on narrow screens so the avatar is what's on screen
            first — stacking the controls above it is what pushed the model
            below the fold. */}
        <div className="order-2 flex flex-col gap-4 md:order-1 md:min-h-0 md:overflow-y-auto md:pr-1">
          {/* 1 — animation */}
          <SectionCard
            step={1}
            icon={Play}
            title="Animation"
            hint="Drop in an animation FBX to convert, or a clip JSON to preview."
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-center text-[11px] text-foreground-muted transition-colors hover:border-accent hover:text-accent">
                {parsing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                <span>Animation .fbx</span>
                <input
                  type="file"
                  accept=".fbx"
                  className="hidden"
                  onChange={(e) => {
                    void handleFbxUpload(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-center text-[11px] text-foreground-muted transition-colors hover:border-accent hover:text-accent">
                {parsing ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />}
                <span>Clip .json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    void handleJsonUpload(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {loaded && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-accent" title={loaded.fileName}>
                  {loaded.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoaded(null);
                    setLoadError(null);
                    setClipIndex(0);
                  }}
                  className="flex shrink-0 items-center gap-1 text-[11px] text-foreground-muted transition-colors hover:text-accent"
                >
                  <X size={10} />
                  Clear
                </button>
              </div>
            )}

            {loadError && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-red-400">
                <XCircle size={12} className="mt-0.5 shrink-0" />
                {loadError}
              </p>
            )}

            {activeReport && <BindingNotice report={activeReport} />}

            {activeClips.length > 1 && (
              <select
                value={safeIndex}
                onChange={(e) => setClipIndex(Number(e.target.value))}
                className="mt-2 h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground"
              >
                {activeClips.map((clip, i) => (
                  <option key={clip.uuid} value={i}>
                    {clip.name || `Clip ${i + 1}`} — {clip.duration.toFixed(2)}s
                  </option>
                ))}
              </select>
            )}

            {currentClip && (
              <p className="mt-2 text-[11px] text-foreground-muted">
                <span className="text-foreground">{loaded ? "Loaded" : "Embedded"}</span> ·{" "}
                {currentClip.duration.toFixed(2)}s · {currentClip.tracks.length} tracks
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                disabled={!currentClip}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                disabled={!currentClip}
                onClick={handleExport}
              >
                <Download size={14} />
                JSON
              </Button>
            </div>
          </SectionCard>

          {/* 2 — add to dictionary */}
          <SectionCard
            step={2}
            icon={Save}
            title="Add to dictionary"
            hint="Clip JSON goes to Cloudinary; the searchable entry goes to MongoDB."
          >
            <div className="flex flex-col gap-3">
              <Input
                id="gloss-name"
                label="Gloss"
                placeholder="HELLO"
                value={glossName}
                onChange={(e) => setGlossName(e.target.value)}
              />
              <Input
                id="gloss-synonyms"
                label="Synonyms (comma separated)"
                placeholder="hi, hey, greetings"
                value={synonyms}
                onChange={(e) => setSynonyms(e.target.value)}
              />

              {duplicateEntry && (
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-yellow-400">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  &quot;{duplicateEntry.gloss}&quot; already exists — saving replaces its animation.
                </p>
              )}

              <Button
                onClick={() => void handleSave()}
                disabled={!currentClip || !glossName.trim() || saving}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : duplicateEntry ? "Replace entry" : "Save to dictionary"}
              </Button>

              {!currentClip && (
                <p className="text-[11px] text-foreground-muted">Load an animation first.</p>
              )}
            </div>
          </SectionCard>

          {/* 3 — dictionary */}
          <SectionCard
            step={3}
            icon={BookOpen}
            title={`Dictionary (${entries.length})`}
            hint="Play loads a stored sign back onto the avatar."
            action={
              <button
                type="button"
                onClick={refreshDictionary}
                className="shrink-0 text-[11px] text-foreground-muted transition-colors hover:text-accent"
              >
                Refresh
              </button>
            }
          >
            {listLoading && (
              <p className="flex items-center gap-2 text-[11px] text-foreground-muted">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </p>
            )}

            {listError && (
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-yellow-400">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                {listError}
              </p>
            )}

            {!listLoading && !listError && entries.length === 0 && (
              <p className="text-[11px] text-foreground-muted">No signs registered yet.</p>
            )}

            {entries.length > 0 && (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded border border-border">
                {entries.map((entry) => (
                  <li
                    key={entry._id}
                    className="flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-background-elevated"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{entry.gloss}</p>
                      <p className="truncate text-[11px] text-foreground-muted">
                        {entry.synonyms.length > 0 ? entry.synonyms.join(", ") : "no synonyms"}
                        {entry.duration ? ` · ${entry.duration.toFixed(2)}s` : ""}
                        {entry.sourceAvatar ? ` · ${entry.sourceAvatar}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Play on the avatar"
                      onClick={() => void handlePreviewEntry(entry)}
                      disabled={busyId === entry._id}
                      className="shrink-0 rounded border border-border p-1.5 text-foreground-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                    >
                      {busyId === entry._id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Delete from dictionary"
                      onClick={() => void handleDelete(entry)}
                      disabled={busyId === entry._id}
                      className="shrink-0 rounded border border-border p-1.5 text-foreground-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ------------ viewer (fixed height) ------------ */}
        <Card
          data-viewer
          className="relative order-1 h-[55vh] overflow-hidden md:order-2 md:h-auto md:min-h-0"
          style={{ background: viewerBackground }}
        >
          <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-md bg-background/75 p-1 backdrop-blur">
            {(Object.keys(VIEW_LABELS) as ViewPreset[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewPreset(key)}
                className={`rounded px-2 py-1 text-[11px] transition-colors ${
                  viewPreset === key
                    ? "bg-accent/20 text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {VIEW_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Manual emotion picker. The classifier isn't trained yet, so this
              is how the conditioning gets checked: pick a mood, watch the same
              clip replay with its speed and posture applied. */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-background/75 p-1 backdrop-blur">
            <label htmlFor="wb-emotion" className="pl-1 text-[11px] text-foreground-muted">
              Emotion
            </label>
            <Select
              id="wb-emotion"
              compact
              value={emotion}
              onChange={(e) => {
                setEmotion(e.target.value as EmotionLabel);
                // Restart the clip so the new timing is visible from frame 0
                // rather than picked up halfway through the loop.
                setReplayKey((k) => k + 1);
                setPlaying(true);
              }}
              title={describeStyle(emotion)}
            >
              {EMOTION_ORDER.map((id) => (
                <option key={id} value={id}>
                  {EMOTION_STYLES[id].label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setReplayKey((k) => k + 1)}
              title="Replay from the first frame"
              className="rounded px-2 py-1 text-[11px] text-foreground-muted transition-colors hover:text-accent"
            >
              Replay
            </button>
          </div>

          {modelError && (
            <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-red-950/80 px-3 py-2 text-xs text-red-300">
              <AlertTriangle size={13} className="shrink-0" />
              {modelError}
            </div>
          )}

          {!model && !modelError && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-foreground-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading avatar…
            </div>
          )}

          <Canvas
            camera={{ position: [0, 1, 3], fov: 32, near: 0.01, far: 100 }}
            /* `flat` is what disables tone mapping — R3F applies its own colour
               defaults after `gl` and would otherwise force ACES Filmic, which
               greys out the stylised skin. */
            flat
            gl={{ alpha: true, antialias: true }}
            style={{ height: "100%" }}
          >
            <ambientLight intensity={1.35} />
            <hemisphereLight args={["#ffffff", "#d6cec6", 0.9]} />
            <directionalLight position={[1.8, 3.2, 4]} intensity={0.62} />
            <directionalLight position={[-2.5, 1.5, 2.5]} intensity={0.32} />
            <directionalLight position={[0, 1.5, -3]} intensity={0.22} />
            <CameraRig preset={viewPreset} model={model} />
            <Scene
              avatarId={avatarId}
              clip={currentClip}
              playing={playing}
              emotion={emotion}
              replayKey={replayKey}
              onReady={setModel}
              onError={setModelError}
            />
            <OrbitControls makeDefault enablePan minDistance={0.25} maxDistance={8} />
          </Canvas>
        </Card>
      </div>
    </div>
  );
}
