const CACHE_NAME = 'cgz-cache-v1';
const urlsToCache = [
  './index.html',
  './styles.css',
  './app.js',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Stale-While-Revalidate: Returns cached version instantly but fetches latest code in background
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
              caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse.clone());
              });
              return networkResponse;
          });
          return cachedResponse || fetchPromise;
      })
  );
});

// If we need to receive direct notification pings from the window
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body } = event.data.payload;
        self.registration.showNotification(title, {
            body: body,
            icon: "./icon-512.png",
            vibrate: [200, 100, 200]
        });
    }
});
