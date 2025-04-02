// set to true to log all IndexedDB events
const DEBUG = false;
function debugLog(...args) {
	if (DEBUG) {
		console.log('[ServiceWorker Debug]', ...args);
	}
}

const CACHE_NAME = "my-pwa-cache-v2";
const urlsToCache = [
	"./",
	"./index.html",
	"./public/style/style.css",
	"./public/style/normalize.css",
	"./public/index.js",
	"./public/images/2.jpg",
	"./public/favicon.ico",
];

// Initialize the database immediately when the service worker starts
initializeIndexedDB().catch(err => {
	debugLog('Failed to initialize IndexedDB:', err);
});

// Function to initialize IndexedDB and create store
function initializeIndexedDB() {
	return new Promise((resolve, reject) => {
		debugLog('Initializing IndexedDB...');
		const request = indexedDB.open("my-database", 1);

		request.onupgradeneeded = event => {
			debugLog('Database upgrade needed, creating object stores');
			const db = event.target.result;
			if (!db.objectStoreNames.contains("api-data")) {
				db.createObjectStore("api-data");
				debugLog('Created "api-data" object store');
			}
		};

		request.onsuccess = event => {
			debugLog('Successfully opened database');
			const db = event.target.result;
			db.close();
			resolve();
		};

		request.onerror = event => {
			debugLog('Error opening database:', event.target.error);
			reject(event.target.error);
		};
	});
}

self.addEventListener("install", (event) => {
	debugLog('Service Worker installing');
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			debugLog('Cache opened, adding URLs to cache');
			return cache.addAll(urlsToCache);
		}).then(() => {
			debugLog('All resources cached successfully');
		}).catch(err => {
			debugLog('Error caching resources:', err);
		})
	);
	self.skipWaiting();
	debugLog('Skip waiting called');
});

self.addEventListener("activate", (event) => {
	debugLog('Service Worker activating');
	event.waitUntil(
		caches.keys().then(cacheNames => {
			debugLog('Checking caches:', cacheNames);
			return Promise.all(
				cacheNames.map(cache => {
					if (cache !== CACHE_NAME) {
						debugLog('Deleting old cache:', cache);
						return caches.delete(cache);
					}
				})
			);
		}).then(() => {
			debugLog('Activation complete, claiming clients');
			return self.clients.claim();
		})
	);
});

self.addEventListener("fetch", (event) => {
	const url = event.request.url;

	// Only use IndexedDB for API requests
	if (url.includes('/api/') || url.includes('json')) {
		debugLog('Handling API request:', url);

		event.respondWith(handleStaticApiRequest(event.request));
	} else {
		// For non-API requests, use cache-first
		debugLog('Handling non-API request:', url);
		event.respondWith(
			caches.match(event.request)
				.then(cachedResponse => {
					if (cachedResponse) {
						debugLog('Serving from cache:', url);
						return cachedResponse;
					}

					debugLog('Not in cache, fetching from network:', url);
					return fetch(event.request)
						.then(response => {
							// Cache the fetched response
							if (response.ok && response.type === 'basic') {
								debugLog('Caching new response for:', url);
								caches.open(CACHE_NAME)
									.then(cache => {
										cache.put(event.request, response.clone());
										debugLog('Successfully cached response for:', url);
									});
							}

							return response;
						});
				})
		);
	}
});

// for static api requests (api's that don't update and return the same data)
async function handleStaticApiRequest(request) {
	try {
		// Try IndexedDB first
		const cachedData = await getFromIndexedDB("api-data", request.url);
		return new Response(JSON.stringify(cachedData), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (dbError) {
		// Not in IndexedDB, fetch from network
		try {
			const networkResponse = await fetch(request);
			const jsonData = await networkResponse.clone().json();
			// If it is hadith data, then extract only the hadiths
			// NOTE: this will need to be changed if you use another api
			let hadiths;
			if (jsonData.hadiths) {
				hadiths = jsonData.hadiths.map(hadith => hadith.text.replaceAll("<br>", ""));
				await saveToIndexedDB("api-data", request.url, hadiths);
				return new Response(JSON.stringify(hadiths), { status: 200, headers: { "Content-Type": "application/json" } })
			}

			// Store in IndexedDB
			await saveToIndexedDB("api-data", request.url, jsonData);
			return networkResponse;
		} catch (networkError) {
			// Completely offline with no cached data
			return new Response(JSON.stringify({
				error: "You are offline and this resource hasn't been cached yet"
			}), {
				status: 503,
				headers: { "Content-Type": "application/json" }
			});
		}
	}
}

function saveToIndexedDB(storeName, key, data) {
	return new Promise((resolve, reject) => {
		debugLog('Opening database for save operation:', storeName, key);
		const request = indexedDB.open("my-database", 1);

		request.onupgradeneeded = event => {
			debugLog('Upgrade needed during save operation');
			const db = event.target.result;
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName);
				debugLog('Created store during save:', storeName);
			}
		};

		request.onsuccess = (event) => {
			const db = event.target.result;
			debugLog('Database opened successfully for save');

			try {
				const transaction = db.transaction(storeName, "readwrite");
				debugLog('Transaction created');

				transaction.onerror = (event) => {
					debugLog('Transaction error during save:', event.target.error);
					db.close();
					reject(event.target.error);
				};

				transaction.oncomplete = () => {
					debugLog('Transaction completed successfully');
					db.close();
					resolve();
				};

				const store = transaction.objectStore(storeName);
				const putRequest = store.put(data, key);

				putRequest.onsuccess = () => {
					debugLog('Data successfully saved to store');
				};

				putRequest.onerror = (event) => {
					debugLog('Error putting data in store:', event.target.error);
					reject(event.target.error);
				};
			} catch (err) {
				debugLog('Exception during transaction:', err);
				db.close();
				reject(err);
			}
		};

		request.onerror = (event) => {
			debugLog('Error opening database for save:', event.target.error);
			reject(event.target.error);
		};
	});
}

function getFromIndexedDB(storeName, key) {
	return new Promise((resolve, reject) => {
		debugLog('Opening database for get operation:', storeName, key);
		const request = indexedDB.open("my-database", 1);

		request.onsuccess = (event) => {
			const db = event.target.result;
			debugLog('Database opened successfully for get');

			try {
				if (!db.objectStoreNames.contains(storeName)) {
					debugLog('Store does not exist:', storeName);
					db.close();
					return reject(new Error(`Store ${storeName} does not exist`));
				}

				const transaction = db.transaction(storeName, "readonly");
				debugLog('Read transaction created');

				transaction.onerror = (event) => {
					debugLog('Transaction error during get:', event.target.error);
					db.close();
					reject(event.target.error);
				};

				const store = transaction.objectStore(storeName);
				const getRequest = store.get(key);

				getRequest.onsuccess = (event) => {
					if (event.target.result) {
						debugLog('Found data in store for key:', key);
						resolve(event.target.result);
					} else {
						debugLog('No data found in store for key:', key);
						reject(new Error("No cached data found"));
					}
					db.close();
				};

				getRequest.onerror = (event) => {
					debugLog('Error getting data from store:', event.target.error);
					db.close();
					reject(event.target.error);
				};
			} catch (err) {
				debugLog('Exception during get operation:', err);
				db.close();
				reject(err);
			}
		};

		request.onerror = (event) => {
			debugLog('Error opening database for get:', event.target.error);
			reject(event.target.error);
		};
	});
}
