import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getNgrokUrl, setNgrokUrl } from "@/lib/ngrok";

const BodySchema = z.object({ url: z.string().url() });

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-api-key");
  return !!secret && !!process.env.NGROK_UPDATE_SECRET && secret === process.env.NGROK_UPDATE_SECRET;
}

/** Called by the notebook right after `ngrok.connect(...)` on every restart. */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { url: string (valid URL) }" }, { status: 400 });
  }

  await setNgrokUrl(parsed.data.url);
  return NextResponse.json({ ok: true });
}

/** Admin/debug: check what URL the app currently has registered. */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getNgrokUrl();
  return NextResponse.json({ url });
}
