import { NextResponse } from "next/server";
import { choosePlanOption, setPlanWhen, invitePeople } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    slug?: string;
    action?: "choose" | "when" | "invite";
    optionId?: string;
    startsAt?: string;
    profileIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !body.action) {
    return NextResponse.json({ error: "slug + action required" }, { status: 400 });
  }
  try {
    if (body.action === "choose" && body.optionId) await choosePlanOption(body.slug, body.optionId);
    else if (body.action === "when" && body.startsAt) await setPlanWhen(body.slug, body.startsAt);
    else if (body.action === "invite" && body.profileIds) await invitePeople(body.slug, body.profileIds);
    else return NextResponse.json({ error: "bad action params" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/plans/edit]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
