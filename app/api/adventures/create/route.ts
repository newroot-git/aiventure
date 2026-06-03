import { NextResponse } from "next/server";
import { createAdventure, type AdventureInput } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  let body: AdventureInput;
  try {
    body = (await req.json()) as AdventureInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.intent || !Array.isArray(body.activities) || body.activities.length === 0) {
    return NextResponse.json({ error: "intent + at least one activity required" }, { status: 400 });
  }
  try {
    const { slug } = await createAdventure(body);
    return NextResponse.json({ slug });
  } catch (e) {
    console.error("[/api/adventures/create]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
