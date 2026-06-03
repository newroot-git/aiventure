import { NextResponse } from "next/server";
import { refinePlanOptions } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  let body: { slug?: string; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  try {
    await refinePlanOptions(body.slug, body.feedback);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/plans/refine]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
