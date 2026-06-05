import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// The av_uid guest cookie is an HMAC-signed `<uuid>.<sig>` so a stranger can't set
// av_uid=<someone-else's-uuid> and impersonate them. Use a DEDICATED secret so a leak
// of the cookie secret doesn't grant DB access (and vice-versa). Falls back to the
// service-role key only if GUEST_COOKIE_SECRET is unset, to keep dev working.
const SECRET = process.env.GUEST_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-guest-secret";

function sign(uid: string): string {
  return createHmac("sha256", SECRET).update(uid).digest("base64url");
}

/** Produce the signed cookie value for a guest profile id. */
export function signGuest(uid: string): string {
  return `${uid}.${sign(uid)}`;
}

/**
 * Verify a signed cookie value → the uid, or null if missing/forged.
 * In dev (NEXT_PUBLIC_DEV_SWITCH=1) an UNSIGNED raw value is also accepted so the
 * dev profile-switcher keeps working; in prod only a valid signature passes.
 */
export function verifyGuest(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot > 0) {
    const uid = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = sign(uid);
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return uid;
    } catch {}
  }
  // dev-only fallback: unsigned raw id (dev switcher / legacy cookie)
  if (process.env.NEXT_PUBLIC_DEV_SWITCH === "1") return value;
  return null;
}
