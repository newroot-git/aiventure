import { NextResponse } from "next/server";
import { getUserGroups, createGroup, setGroupDescription } from "@/lib/db";
import { clientError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const groups = await getUserGroups();
    return NextResponse.json({ groups });
  } catch (e) {
    console.error("[/api/groups]", e);
    return NextResponse.json({ groups: [] });
  }
}

// Create a crew. Body: { name: string, memberIds?: string[] } → { id }
export async function POST(req: Request) {
  let body: { name?: string; memberIds?: string[]; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  try {
    const { id } = await createGroup(body.name, Array.isArray(body.memberIds) ? body.memberIds : [], body.description);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[/api/groups POST]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}

// Edit a crew's description (owner only). Body: { id, description }
export async function PATCH(req: Request) {
  let body: { id?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await setGroupDescription(body.id, body.description ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/groups PATCH]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
