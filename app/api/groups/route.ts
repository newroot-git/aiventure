import { NextResponse } from "next/server";
import { getUserGroups } from "@/lib/db";

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
