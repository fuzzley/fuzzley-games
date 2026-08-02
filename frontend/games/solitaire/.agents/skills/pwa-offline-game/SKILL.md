---
name: pwa-offline-game
description: Progressive Web App (PWA) manifest configuration, Service Worker caching strategies (CacheFirst for card atlas & Phaser JS bundles), offline game state persistence, and standalone app installation for fSolitaire. Triggers on: pwa, offline, service worker, manifest, cachefirst, web app manifest, offline persistence.
---

# Progressive Web App (PWA) & Offline Game Support

> Guidelines for PWA manifest integration, service worker caching for offline solitaire play, mobile touch viewports, and local storage state sync in fSolitaire.

## Service Worker Caching Strategy

Because fSolitaire is a client-side game requiring no real-time network backends during gameplay:
- **Static Asset Cache (`CacheFirst`):** Cache `index.html`, `cards.webp`, `cards.json`, audio files, and JS bundle chunks (`vendor-phaser`, `vendor-angular`).
- **Offline First:** Game should load and run completely offline after initial load.

```js
// Service worker caching pattern
const CACHE_NAME = 'fsolitaire-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/atlas/cards.json',
  './assets/atlas/cards.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```

## Web App Manifest (`public/manifest.webmanifest`)

- **Display:** `standalone` (removes browser address bar for native full-screen feel).
- **Orientation:** `any` or `landscape` / `portrait` adaptive layout.
- **Icons:** Supply 192x192 and 512x512 maskable PNG icons.

```json
{
  "name": "fSolitaire",
  "short_name": "Solitaire",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#121820",
  "theme_color": "#1e293b",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

## Offline Game State & Metrics Persistence

- **LocalStorage Integration (`LocalStorageService`):** Save running game metrics, win rates, undos used, active theme, and sound settings in local storage.
- **Corrupted Data Protection:** Wrap `JSON.parse` operations in try-catch fallbacks to prevent application crashes when reading invalid or stale browser storage.
- **Unload Handler:** Autosave current tableau state before page unload or visibility change (`visibilitychange` listener).
