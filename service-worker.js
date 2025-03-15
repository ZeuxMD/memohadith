const CACHE_NAME = "my-pwa-cache-v1";
const urlsToCache = [
	"./",
	"./index.html",
	"./public/style/style.css",
	"./public/style/normalize.css",
	"./public/index.js",
	"./public/images/2.jpg",
	"./public/favicon.ico",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(urlsToCache);
		})
	);
});

self.addEventListener("fetch", (event) => {
	event.respondWith(
		caches.match(event.request).then((cacheResponse) => {
			return cacheResponse || fetch(event.request).then(async (networkResponse) => {
				return caches.open("my-cache").then((cache) => {
					cache.put(event.request, networkResponse.clone()); // Store in cache
					return networkResponse;
				});
			});
		})
	);
});
