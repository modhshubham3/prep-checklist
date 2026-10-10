// Offline support for the prep app.
//
// Same-origin files: network-first — online you always get the latest deploy,
// offline you get the last copy that loaded. Fonts and the QR library from
// CDNs: cache-first, they're versioned and never change. The sync API is never
// cached — progress must always be live.
const CACHE = "prep-v5";
const SHELL = [
  "/", "/css/style.css", "/css/skin.css",
  "/js/data.js", "/js/answers.js", "/js/migrate.js", "/js/viz.js", "/js/app.js", "/js/notify.js",
  "/manifest.webmanifest", "/icons/icon-192.png"
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
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("/")))
    );
    return;
  }

  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname)) {
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
