// Simple Service Worker for Anansesɛm Orders Manager PWA
const CACHE_NAME = 'amaya-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/anasesem.jpg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from Amaya',
    icon: '/anasesem.jpg',
    badge: '/anasesem.jpg'
  }

  event.waitUntil(
    self.registration.showNotification('Amaya Notification', options)
  )
})