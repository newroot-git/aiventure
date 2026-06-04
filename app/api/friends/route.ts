import { NextResponse } from "next/server";
import { getFriends } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const friends = await getFriends();
    return NextResponse.json({ friends: friends.map((f) => f.profile) });
  } catch (e) {
    console.error("[/api/friends]", e);
    return NextResponse.json({ friends: [] });
  }
}
