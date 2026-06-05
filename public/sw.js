// AIventure service worker — app-shell offline caching. Bundler-independent
// (plain SW; Next 16 builds with Turbopack, which @serwist/next's webpack
// injection doesn't run under). Bump VERSION to invalidate caches on deploy.
const VERSION = "v2";
const SHELL_CACHE = `aiventure-shell-${VERSION}`;
const RUNTIME_CACHE = `aiventure-runtime-${VERSION}`;

// minimal app-shell assets precached so the icon/chrome work offline
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // cache individually so one bad URL can't fail the whole install
      .then((c) => Promise.all(SHELL_ASSETS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Only fingerprinted, immutable assets are safe to serve cache-first. Everything
// else — pages, RSC payloads (router.refresh / soft nav), API — MUST be
// network-first, or the app serves stale UI after an action (the lock-in bug).
function isStaticImmutable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|woff2?|ttf)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations (POST etc.)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // skip cross-origin (OSM, OpenRouter…)

  // static immutable → cache-first (fast, offline-safe)
  if (isStaticImmutable(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // everything else (navigations, RSC refresh/soft-nav, /api, dynamic pages) →
  // NETWORK-FIRST so live data + fresh server-rendered UI always win online;
  // fall back to cache only when offline.
  const isNav = request.mode === "navigate";
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (isNav) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(request)
          .then((c) => c || (isNav ? caches.match("/plans") : Response.error())),
      ),
  );
});
