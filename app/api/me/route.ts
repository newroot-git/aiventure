import { NextResponse } from "next/server";
import { getCurrentProfile, updateMyProfile } from "@/lib/db";
import { clientError } from "@/lib/http";

export const runtime = "nodejs";

// GET: who am I + do I still need onboarding (no interests set yet)?
export async function GET() {
  try {
    const me = await getCurrentProfile();
    return NextResponse.json({
      id: me?.id ?? null,
      name: me?.name ?? null,
      interests: me?.interests ?? [],
      needsOnboard: !!me && (me.interests?.length ?? 0) === 0,
    });
  } catch {
    return NextResponse.json({ id: null, needsOnboard: false });
  }
}

// POST: save onboarding / profile edits
export async function POST(req: Request) {
  let body: { name?: string; interests?: string[]; interest_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  try {
    await updateMyProfile(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/me]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
