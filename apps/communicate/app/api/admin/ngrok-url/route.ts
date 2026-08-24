import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getNgrokUrl, setNgrokUrl } from "@/lib/ngrok";

/**
 * Session-authenticated counterpart to /api/config/ngrok-url, for the
 * Dashboard -> Settings page. That route is gated by NGROK_UPDATE_SECRET for
 * server-to-server calls from the notebook (see notebook-integration/); this
 * one is gated by a logged-in browser session instead, since a secret can't
 * safely live in client-side JS. Both read/write the same Config doc.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getNgrokUrl();
  return NextResponse.json({ url });
}

const BodySchema = z.object({ url: z.string().url() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  }

  await setNgrokUrl(parsed.data.url);
  return NextResponse.json({ ok: true });
}
