// Offline support for the prep app.
//
// Same-origin files: cache-first with background revalidation (stale-while-revalidate). A launch never waits on
// the network; the fresh copy is stored for the next launch. Bump CACHE on every deploy so the precache is rebuilt.
// The QR library CDN: cache-first. The sync / push APIs are never cached: progress must always be live.
const CACHE = "prep-v13";
const SHELL = [
  "/", "/index.html",
  "/css/style.css", "/css/skin.css", "/css/platform.css", "/css/lamplight.css", "/css/mascot.css",
  "/js/data.js", "/js/answers.js", "/js/migrate.js", "/js/viz.js", "/js/app.js", "/js/shell.js",
  "/js/lab-data.js", "/js/learn-data.js", "/js/decide-data.js", "/js/platform-core.js", "/js/mascot.js", "/js/scenes.js", "/js/learn.js", "/js/lab.js", "/js/decide.js",
  "/js/platform.js", "/js/notify.js", "/js/feel.js",
  "/fonts/Figtree.woff2", "/fonts/BricolageGrotesque.woff2", "/fonts/JetBrainsMono.woff2",
  "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;

  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }                 // instant launch; refresh in the background
      return (await net) || (await c.match("/")) || Response.error();
    }));
    return;
  }

  if (/cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});

// Study notifications: the server sends { title, body, url, tag }; a tap opens that question or quiz.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || "Prep", {
    body: d.body || "", tag: d.tag || "prep", renotify: true,
    icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: d.url || "/" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ("focus" in c) { c.postMessage({ open: url }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
