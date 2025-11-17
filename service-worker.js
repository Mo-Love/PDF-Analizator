
const CACHE_NAME = 'ai-analyzer-cache-v2'; // Increased version to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json', // Added manifest to cache
  '/index.tsx',
  '/App.tsx',
  '/icon.svg',
  '/services/pdfService.ts',
  '/services/geminiService.ts',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  // Note: aistudiocdn scripts are removed from pre-cache and will be cached dynamically by the fetch event
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching essential assets');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache essential assets during install:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Return response from cache if found
        if (response) {
          return response;
        }

        // If not in cache, fetch from network
        return fetch(event.request).then(networkResponse => {
          // Check for valid response
          if (networkResponse && networkResponse.status === 200) {
            // Clone the response because it's a stream and can be consumed only once.
            const responseToCache = networkResponse.clone();
            // Cache the new response
            cache.put(event.request, responseToCache);
          }
          return networkResponse;
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
