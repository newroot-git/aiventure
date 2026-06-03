import { NextResponse } from "next/server";
import { createPlanFromDrop } from "@/lib/db";
import type { DropInput } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  let body: DropInput;
  try {
    body = (await req.json()) as DropInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.intent || typeof body.intent !== "string" || body.intent.length > 500) {
    return NextResponse.json({ error: "valid intent (<=500 chars) required" }, { status: 400 });
  }
  try {
    const { slug } = await createPlanFromDrop(body);
    return NextResponse.json({ slug });
  } catch (e) {
    console.error("[/api/plans/create]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
