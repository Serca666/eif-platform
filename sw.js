/* ================================================================
   EIF Platform — Service Worker
   Soporte offline básico con cache-first strategy
   ================================================================ */

const CACHE_NAME = 'eif-v1.0.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/animations.css',
  './css/dashboard.css',
  './css/onboarding.css',
  './css/elearning.css',
  './css/evaluations.css',
  './css/mystery.css',
  './js/config.js',
  './js/store.js',
  './js/auth.js',
  './js/router.js',
  './js/components/toast.js',
  './js/pages/dashboard.js',
  './js/pages/onboarding.js',
  './js/pages/elearning.js',
  './js/pages/evaluations.js',
  './js/pages/mystery.js',
  './js/pages/records.js',
  './js/pages/users.js',
  './js/pages/settings.js'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
