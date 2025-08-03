// Define a cache name
const CACHE_NAME = 'project-senegal-cache-v1';
// List the files to cache using relative paths
const urlsToCache = [
  './',
  './index.html'
  // Note: If you add your icon to the cache, add './icon-512x512.png' here too.
];

// Install the service worker and cache the files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the file is in the cache, serve it.
        if (response) {
          return response;
        }
        // Otherwise, fetch it from the network.
        return fetch(event.request);
      })
  );
});
