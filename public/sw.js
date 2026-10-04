// Service worker for the installed app. It does one thing: when a page can't
// be loaded because the phone is offline, it shows /offline instead of the
// browser's own error page. Nothing else is cached; every request still goes
// to the network, so students always see live data.

const CACHE = "offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(OFFLINE_URL, { cache: "reload" });
      if (!response.ok) throw new Error(`Could not cache ${OFFLINE_URL}: ${response.status}`);
      // The offline page needs its stylesheets and fonts too, or it renders
      // unstyled. Stylesheets are linked in the HTML; Next.js preloads the
      // fonts through the Link response header.
      const html = await response.clone().text();
      const linkHeader = response.headers.get("Link") ?? "";
      const assets = [
        ...[...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]),
        ...[...linkHeader.matchAll(/<(\/_next\/static\/[^>]+\.woff2)>/g)].map((m) => m[1]),
      ];
      await cache.put(OFFLINE_URL, response);
      await cache.addAll([...new Set(assets)]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Only the offline page's own CSS and fonts are in the cache; everything
  // else falls through to the network as normal.
  if (new URL(request.url).pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request)) ?? Response.error()),
    );
  }
});
