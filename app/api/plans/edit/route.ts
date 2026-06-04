import { NextResponse } from "next/server";
import {
  choosePlanOption, setPlanWhen, invitePeople,
  setSlotTime, addSlot, setRecurrence, deletePlan,
  type PlanRecurrence,
} from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    slug?: string;
    action?: "choose" | "when" | "invite" | "slotTime" | "addSlot" | "recurrence" | "delete";
    optionId?: string;
    startsAt?: string;
    profileIds?: string[];
    slotKey?: string;
    day?: number;
    time?: string | null;
    label?: string;
    recurrence?: PlanRecurrence | null;
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
    else if (body.action === "slotTime" && body.slotKey) await setSlotTime(body.slug, body.slotKey, body.day ?? 1, body.time ?? null);
    else if (body.action === "addSlot" && body.label?.trim()) await addSlot(body.slug, body.label, body.day ?? 1);
    else if (body.action === "recurrence") await setRecurrence(body.slug, body.recurrence ?? null);
    else if (body.action === "delete") await deletePlan(body.slug);
    else return NextResponse.json({ error: "bad action params" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/plans/edit]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
