"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * No-install join. A fresh visitor landing on a shared plan link has no identity yet.
 * Silently mint a throwaway guest profile (sets the av_uid cookie via /api/guest), then
 * refresh so the server re-resolves the page with that identity — now they can RSVP,
 * vote and add ideas without ever signing up.
 */
export function EnsureGuest() {
  const router = useRouter();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; // once per mount — don't churn accounts
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/guest", { method: "POST" });
        if (res.ok) router.refresh();
      } catch {
        // offline / blocked — they can still read the plan; acting will prompt later
      }
    })();
  }, [router]);
  return null;
}
