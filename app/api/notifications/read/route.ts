import { NextResponse } from "next/server";
import { markNotificationsRead } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    await markNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/notifications/read]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
