"use client";
import { useEffect } from "react";

// Registers the app-shell service worker (public/sw.js). Browsers only allow SW
// over HTTPS or localhost, so this no-ops on insecure origins. Skipped in dev to
// avoid stale-cache surprises while iterating.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
