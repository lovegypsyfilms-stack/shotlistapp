/* ============================================================
   SERVICE WORKER — offline first, but never stale
   ------------------------------------------------------------
   The old version cached under a fixed name and served cache
   before network, so a new build only appeared on the SECOND
   launch. This version:

     - bumps CACHE on every deploy, so old builds are purged
     - fetches the app shell from the network first, with a
       short timeout, falling back to cache when there is no
       signal (which is the normal state on a shoot)
     - leaves icons and the manifest on cache-first, since
       they rarely change

   BUMP THE VERSION BELOW EVERY TIME YOU PUSH A CHANGE.
   That single line is what makes the phone update.
   ============================================================ */

const VERSION = '2026-09-04-3';
const CACHE   = 'island-field-' + VERSION;

const SHELL = ['./', './index.html', './sync-config.js', './cloud-sync.js'];
const STATIC = ['./manifest.webmanifest', './icon-192.png', './icon-512.png'];
const ASSETS = SHELL.concat(STATIC);

const NET_TIMEOUT = 3500; // ms before we stop waiting and use the cached copy

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})            // a missing asset must not block install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isShell(url) {
  const p = url.pathname;
  return p.endsWith('/') || p.endsWith('/index.html') ||
         p.endsWith('/sync-config.js') || p.endsWith('/cloud-sync.js');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Firebase and any other cross-origin request goes straight to the network.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || isShell(url)) {
    e.respondWith(networkFirst(req));
  } else {
    e.respondWith(cacheFirst(req));
  }
});

function networkFirst(req) {
  return new Promise(resolve => {
    let settled = false;
    const done = res => { if (!settled) { settled = true; resolve(res); } };

    const timer = setTimeout(() => {
      caches.match(req, { ignoreSearch: true }).then(hit => { if (hit) done(hit); });
    }, NET_TIMEOUT);

    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      done(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(hit => {
        done(hit || new Response('Offline', { status: 503, statusText: 'Offline' }));
      });
    });
  });
}

function cacheFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    return fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }));
  });
}
