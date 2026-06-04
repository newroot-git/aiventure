import { NextResponse } from "next/server";
import { createPlanFromDrop, invitePeople, type CreateExtras } from "@/lib/db";
import type { DropInput } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  let body: DropInput & CreateExtras & { inviteIds?: string[] };
  try {
    body = (await req.json()) as DropInput & CreateExtras & { inviteIds?: string[] };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  // a description is only required for AI builds; building it yourself needs none
  if (body.aiBuild && (!body?.intent || typeof body.intent !== "string" || !body.intent.trim())) {
    return NextResponse.json({ error: "add a description so AI can build it" }, { status: 400 });
  }
  if (typeof body.intent === "string" && body.intent.length > 500) {
    return NextResponse.json({ error: "description too long (max 500)" }, { status: 400 });
  }
  if (typeof body.intent !== "string") body.intent = "";
  try {
    const { slug } = await createPlanFromDrop(body);
    if (Array.isArray(body.inviteIds) && body.inviteIds.length) {
      await invitePeople(slug, body.inviteIds).catch((e) => console.error("[invite on create]", e));
    }
    return NextResponse.json({ slug });
  } catch (e) {
    console.error("[/api/plans/create]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
