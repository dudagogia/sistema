const CACHE_NAME = 'espaco-psico-v2';
const urlsToCache = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/menu.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Instala o Service Worker e faz o cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta as requisições e busca do cache primeiro
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Retorna do cache se existir
        }
        return fetch(event.request); // Se não, busca na internet
      })
  );
});

// sw.js
self.addEventListener('install', event => {
  self.skipWaiting(); // Força a nova versão a ativar imediatamente
  // ... código de cache ...
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Limpa caches antigos
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle das páginas abertas
  );
});