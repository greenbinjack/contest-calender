const CACHE_NAME = 'cgz-cache-v1';
const urlsToCache = [
  './index.html',
  './styles.css',
  './app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Service Worker offline caching strategy (Stale while revalidate)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
          if (response) return response;
          return fetch(event.request);
      })
  );
});

// If we need to receive direct notification pings from the window
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body } = event.data.payload;
        self.registration.showNotification(title, {
            body: body,
            icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Circle-icons-calendar.svg/1024px-Circle-icons-calendar.svg.png",
            vibrate: [200, 100, 200]
        });
    }
});
