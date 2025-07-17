// Service Worker for Surah Al-Alaq PWA
const CACHE_NAME = 'surah-alaq-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './assets/manifest.json',
  './assets/fonts/amiri-quran.woff2',
  './assets/fonts/scheherazade-new.woff2',
  './assets/fonts/noto-sans-arabic.woff2',
  './assets/fonts/jameel-noori-nastaleeq.woff2',
  './assets/data/surah-alaq.json',
  './assets/data/tafsir-layers.json',
  './assets/data/reciters.json',
  './assets/data/translations.json',
  './assets/audio/notification.mp3',
  './assets/images/star-pattern.svg'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .catch(error => {
        console.log('Cache install failed:', error);
        // Continue without caching if some resources fail
        return Promise.resolve();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Return offline fallback for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          
          // Return empty response for other failed requests
          return new Response('', {
            status: 200,
            statusText: 'OK',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Activate event - clean up old caches
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
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle offline actions when back online
  return Promise.resolve();
}

// Push notifications (if needed)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New content available',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: './assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './assets/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Surah Al-Alaq', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

