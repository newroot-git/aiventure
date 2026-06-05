import { NextResponse } from "next/server";
import { getInvites, getNudges, getNotifications } from "@/lib/db";

export const runtime = "nodejs";

// Lightweight poll target for the notifications menu so new nudges/invites/notes
// surface without a navigation (no realtime push yet).
export async function GET() {
  try {
    const [invites, nudges, notifications] = await Promise.all([
      getInvites(), getNudges(), getNotifications(),
    ]);
    return NextResponse.json({ invites, nudges, notifications });
  } catch {
    return NextResponse.json({ invites: [], nudges: [], notifications: [] });
  }
}
