import { NextResponse } from "next/server";
import { generateDrop, type DropInput } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(req: Request) {
  let body: DropInput;
  try {
    body = (await req.json()) as DropInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body?.intent || typeof body.intent !== "string" || body.intent.length > 500) {
    return NextResponse.json({ error: "a valid intent (<=500 chars) is required" }, { status: 400 });
  }

  try {
    const result = await generateDrop(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/drop]", e);
    return NextResponse.json({ error: "generation failed", detail: (e as Error).message }, { status: 502 });
  }
}
