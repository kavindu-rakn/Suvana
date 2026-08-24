# Avatar model

Drop your rigged 3D avatar here as **`avatar.glb`** (this exact filename/path:
`public/models/avatar.glb`). It's loaded by [`components/three/Avatar.tsx`](../../components/three/Avatar.tsx).

Requirements:
- glTF Binary (`.glb`) format, with a skinned mesh + skeleton (e.g. exported
  from Mixamo/Blender in T-pose or A-pose).
- Bone names should match whatever names are referenced inside your gloss
  animation JSON files (e.g. `mixamorigRightForeArm`), since
  `lib/animation/mixamoJsonToClip.ts` builds keyframe tracks targeting those
  bone names.

Until this file exists, the 3D viewer shows a "couldn't load the 3D avatar"
message instead of crashing the page.
