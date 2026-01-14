const CACHE_NAME = "founder-os-v2";
const BASE_PATH = "/ToTheMooon/";

const FILES_TO_CACHE = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "track.html",
  BASE_PATH + "tasks.html",
  BASE_PATH + "notes.html",
  BASE_PATH + "progress.html",
  BASE_PATH + "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
