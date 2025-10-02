// Simple Service Worker for AMAYA Orders Manager PWA
const CACHE_NAME = 'amaya-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/amaya.png'
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
    body: event.data ? event.data.text() : 'New notification from AMAYA',
    icon: '/amaya.png',
    badge: '/amaya.png'
  }

  event.waitUntil(
    self.registration.showNotification('AMAYA Notification', options)
  )
})