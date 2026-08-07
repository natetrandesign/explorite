/* Explorite v2 service worker — app shell cache, network-first for data */
const SHELL = 'explorite-v2-shell-1';
const SHELL_FILES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // never cache Supabase or CDN data calls
  if (url.hostname.endsWith('supabase.co')) return;
  if (url.origin === location.origin) {
    // stale-while-revalidate for shell
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fresh = fetch(e.request).then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put(e.request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
  } else if (url.hostname === 'images.unsplash.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open('explorite-v2-assets').then((c) =>
        c.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }))
      )
    );
  }
});
