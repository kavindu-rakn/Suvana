import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveModel } from "@/lib/activeModel";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await getActiveModel();
  return NextResponse.json({ model: active });
}
