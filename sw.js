const CACHE_NAME = "founder-os-v3";
const FILES_TO_CACHE = [
  "./index.html",
  "./tasks.html",
  "./notes.html",
  "./progress.html",
  "./track.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install SW and cache files
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate SW and cleanup old caches
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler: try network first, fallback to cache
self.addEventListener("fetch", (evt) => {
  if (evt.request.method !== "GET") return;

  evt.respondWith(
    fetch(evt.request)
      .then((resp) => {
        const respClone = resp.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(evt.request, respClone));
        return resp;
      })
      .catch(() => caches.match(evt.request))
  );
});
