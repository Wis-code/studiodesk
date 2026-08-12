const CACHE = 'studiodesk-v0.4.0';
const CORE = [
  './', './index.html', './styles.css', './app.js',
  './assets/studiodesk-mark.png', './manifest.webmanifest',
  './config/firebase-config.js',
  './core/pricing-engine.js', './core/diagnostic-engine.js',
  './core/project-engine.js', './core/permissions.js',
  './services/firebase.js', './services/auth.js', './services/firestore.js',
  './data/seed.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
