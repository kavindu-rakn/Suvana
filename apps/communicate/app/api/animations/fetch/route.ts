import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_HOST = "res.cloudinary.com";

/**
 * Same-origin proxy for fetching a gloss's animation JSON from Cloudinary.
 * Keeps the browser fetch same-origin (sidesteps any CORS configuration on
 * the Cloudinary resource) and restricts which hosts can be requested.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query param" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: "URL host is not allowed" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch animation JSON" }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  if (data === null) {
    return NextResponse.json({ error: "Animation resource is not valid JSON" }, { status: 502 });
  }

  return NextResponse.json(data);
}
