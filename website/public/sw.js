const CACHE_NAME = "tryllestavsprojekt-v3";
const APP_SCOPE = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", APP_SCOPE).toString();
const APP_SHELL_ASSETS = [
  new URL("./", APP_SCOPE).toString(),
  INDEX_URL,
  new URL("manifest.webmanifest", APP_SCOPE).toString(),
  new URL("favicon.svg", APP_SCOPE).toString(),
  new URL("icon-192.png", APP_SCOPE).toString(),
  new URL("icon-512.png", APP_SCOPE).toString(),
  new URL("icon-maskable-192.png", APP_SCOPE).toString(),
  new URL("icon-maskable-512.png", APP_SCOPE).toString(),
  new URL("apple-touch-icon.png", APP_SCOPE).toString(),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage || caches.match(INDEX_URL);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(INDEX_URL));
    }),
  );
});
