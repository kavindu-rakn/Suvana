import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNgrokUrl } from "@/lib/ngrok";

/**
 * Proxies an audio recording/upload to the ngrok-hosted notebook's
 * `/translate` endpoint (see lib/ipynb/WhishperBackend.ipynb) and normalizes
 * its response. The notebook already does Sinhala ASR, tokenization, and
 * Sinhala->gloss dictionary lookup server-side, so `glosses` here is the
 * primary source for the 3D avatar pipeline (see app/api/gloss/predict).
 *
 * The notebook's base URL is always looked up fresh from Mongo (lib/ngrok.ts)
 * instead of a hardcoded value, so this keeps working when ngrok rotates the
 * URL on restart — see the Dashboard -> Settings tab for local dev, or
 * notebook-integration/register_ngrok_url.py for deployed apps.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ngrokUrl = await getNgrokUrl();
  if (!ngrokUrl) {
    return NextResponse.json(
      {
        error:
          "The speech recognition service isn't registered yet. Start the notebook, then paste its ngrok URL into Dashboard -> Settings.",
      },
      { status: 503 }
    );
  }

  const incomingForm = await req.formData().catch(() => null);
  const audio = incomingForm?.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const endpointPath = process.env.STT_ENDPOINT_PATH || "/translate";
  const forwardForm = new FormData();
  forwardForm.append("audio", audio, "audio.webm");

  let upstream: Response;
  try {
    upstream = await fetch(`${ngrokUrl}${endpointPath}`, {
      method: "POST",
      body: forwardForm,
      // Skips ngrok's free-tier browser interstitial page for non-browser requests.
      headers: { "ngrok-skip-browser-warning": "true" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the notebook. It may be offline, restarting, or the registered URL is stale." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.json().catch(() => null);
    return NextResponse.json(
      {
        error:
          (detail && typeof detail === "object" && "error" in detail && String(detail.error)) ||
          `The notebook returned an error (${upstream.status}).`,
      },
      { status: 502 }
    );
  }

  const data = await upstream.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json(
      { error: "Malformed response from the notebook." },
      { status: 502 }
    );
  }

  const record = data as Record<string, unknown>;
  const emotionRecord = (record.emotion ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    text: (record.transcription ?? "") as string,
    tokens: (record.tokens ?? []) as string[],
    emotion: (emotionRecord.emotion ?? "neutral") as string,
    confidence: (emotionRecord.confidence ?? null) as number | null,
    glosses: (record.glosses ?? []) as string[],
    unknownTokens: (record.unknown_tokens ?? []) as string[],
  });
}
