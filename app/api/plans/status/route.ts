import { NextResponse } from "next/server";
import { updatePlanStatus } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { slug?: string; status?: "open" | "locked" | "completed" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !["open", "locked", "completed"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "slug + valid status required" }, { status: 400 });
  }
  try {
    await updatePlanStatus(body.slug, body.status!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
