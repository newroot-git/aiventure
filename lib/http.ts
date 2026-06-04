import "server-only";

// User-facing error messages we deliberately throw (auth/validation). Anything
// not on this list is an internal error (DB/LLM/etc) and must NOT leak its text
// to the client — those get a generic message instead.
const SAFE = new Set([
  "plan not found",
  "option not found",
  "date option not found",
  "nudge not found",
  "not your nudge",
  "not your plan",
  "not invited to this plan",
  "sign in required",
  "Only the plan owner can do that",
]);

/** Map any thrown value to a safe client-facing message. */
export function clientError(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  return SAFE.has(m) ? m : "Something went wrong. Try again.";
}

// ---- tiny in-memory rate limiter (per warm instance; best-effort, zero-dep) ----
const hits = new Map<string, number[]>();

/** True if this key is still within budget; false once it exceeds `max` per `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  // opportunistic cleanup so the map can't grow without bound
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return arr.length <= max;
}

/** Caller's best-effort IP for rate-limit keying. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}
