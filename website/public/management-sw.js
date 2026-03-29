const workerUrl = new URL(self.location.href);
const buildId = workerUrl.searchParams.get("v") ?? "dev";
const CACHE_NAME = `tryllestav-management-${buildId}`;
const APP_SCOPE = new URL("management/", self.registration.scope);
const MANAGEMENT_URL = new URL("management/", APP_SCOPE).toString();
const INDEX_URL = new URL("management/index.html", APP_SCOPE).toString();

const APP_SHELL_ASSETS = [
  MANAGEMENT_URL,
  INDEX_URL,
  new URL("management-manifest.webmanifest", APP_SCOPE).toString(),
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
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

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
      if (cachedResponse) return cachedResponse;

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
