const CACHE_NAME = "my-pwa-cache-v1";
const urlsToCache = [
	"/",
	"/index.html",
	"/public/style/style.css",
	"/public/style/normalize.css",
	"/public/index.js",
	"/public/images/2.jpg",
	"/public/favicon.ico",
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
		caches.match(event.request).then((response) => {
			return response || fetch(event.request);
		})
	);
});
