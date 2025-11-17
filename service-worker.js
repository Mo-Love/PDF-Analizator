
const CACHE_NAME = 'ai-analyzer-cache-v4';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Event: install
// Caches the essential app shell files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// Event: activate
// Cleans up old caches to save space.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Tell the active service worker to take control of the page immediately.
        return self.clients.claim();
    })
  );
});

// Event: fetch
// Serves assets from cache or network.
self.addEventListener('fetch', event => {
  const { request } = event;

  // For navigation requests (HTML pages), try the network first.
  // This ensures users get the latest version of the app's structure.
  // If the network fails, fall back to the cached index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For all other requests (CSS, JS, images, etc.), use a cache-first strategy.
  // This makes the app load instantly on subsequent visits.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // If we have a response in the cache, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not, fetch it from the network.
      return fetch(request).then(networkResponse => {
        // Check if we received a valid response.
        if (networkResponse && networkResponse.status === 200) {
          // Clone the response because it's a stream and can only be consumed once.
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Cache the new resource for future use.
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});