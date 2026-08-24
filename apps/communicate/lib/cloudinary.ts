import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary env vars are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

/**
 * Uploads a gloss animation JSON payload to Cloudinary as a raw resource.
 * Stored under `sign-glosses/<publicId>.json` so it can be replaced/deleted
 * later by the same public id.
 */
export async function uploadGlossJson(
  jsonData: unknown,
  publicId: string
): Promise<UploadApiResponse> {
  ensureConfigured();

  const payload = `data:application/json;base64,${Buffer.from(
    JSON.stringify(jsonData)
  ).toString("base64")}`;

  return cloudinary.uploader.upload(payload, {
    resource_type: "raw",
    public_id: `sign-glosses/${publicId}`,
    overwrite: true,
    format: "json",
  });
}

export async function deleteGlossJson(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(`sign-glosses/${publicId}`, {
    resource_type: "raw",
  });
}

/**
 * Uploads a binary avatar model file (FBX) to Cloudinary as a raw resource
 * under `sign-avatars/<publicId>`. Mirrors uploadGlossJson's base64-data-URI
 * approach, just with arbitrary binary content instead of JSON text.
 */
export async function uploadModelFile(
  buffer: ArrayBuffer,
  publicId: string,
  filename: string
): Promise<UploadApiResponse> {
  ensureConfigured();

  const ext = filename.split(".").pop()?.toLowerCase() || "fbx";
  const payload = `data:application/octet-stream;base64,${Buffer.from(buffer).toString(
    "base64"
  )}`;

  return cloudinary.uploader.upload(payload, {
    resource_type: "raw",
    public_id: `sign-avatars/${publicId}`,
    overwrite: true,
    format: ext,
  });
}

export async function deleteModelFile(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(`sign-avatars/${publicId}`, {
    resource_type: "raw",
  });
}

/**
 * Uploads one recorded WAV take under `voice-emotion/<publicId>.wav`.
 *
 * `raw` rather than Cloudinary's `video` type, which is what it normally uses
 * for audio: the training pipeline wants the exact bytes the browser produced,
 * and `video` may transcode. A 4-second 16 kHz mono clip is ~128 KB, so a full
 * 400-clip dataset is around 50 MB.
 *
 * `overwrite` is on because re-recording a take is expected — the unique index
 * on VoiceSample means the same slot is replaced rather than duplicated, and
 * the stored file has to follow.
 */
export async function uploadVoiceSample(
  buffer: ArrayBuffer,
  publicId: string
): Promise<UploadApiResponse> {
  ensureConfigured();

  const payload = `data:audio/wav;base64,${Buffer.from(buffer).toString("base64")}`;

  return cloudinary.uploader.upload(payload, {
    resource_type: "raw",
    public_id: `voice-emotion/${publicId}`,
    overwrite: true,
    format: "wav",
  });
}

export { cloudinary };
