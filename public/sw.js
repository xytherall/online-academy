// Service worker for the installed app. It does two things:
// 1. When a page can't be loaded because the phone is offline, it shows
//    /offline instead of the browser's own error page. Nothing else is
//    cached; every request still goes to the network, so students always see
//    live data.
// 2. Shows phone notifications (Web Push) sent by the server, and opens the
//    right portal page when one is tapped.

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

// --- Phone notifications ----------------------------------------------------

const DEFAULT_NOTIFICATION_URL = "/student/notifications";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  // A live class's time is formatted here, on the phone, so it is shown in
  // the student's own time zone (the server can't know it).
  let body = data.body || "";
  if (data.startsAt) {
    const startsAt = new Date(data.startsAt);
    if (!Number.isNaN(startsAt.getTime())) {
      body = "Starts " + startsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "New notification", {
      body,
      tag: data.tag,
      icon: "/app-icon/192",
      data: { url: data.url || DEFAULT_NOTIFICATION_URL },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Only ever open pages on this site, whatever the payload says.
  const target = new URL(event.notification.data?.url || DEFAULT_NOTIFICATION_URL, self.location.origin);
  const url = target.origin === self.location.origin ? target.href : new URL(DEFAULT_NOTIFICATION_URL, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
