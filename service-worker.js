// import pako for compression
importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');

// set to true to log all IndexedDB events
const DEBUG = false;
function debugLog(...args) {
	if (DEBUG) {
		console.log('[ServiceWorker Debug]', ...args);
	}
}

const CACHE_NAME = "my-pwa-cache-v3";
const DB_VERSION = 2;
const DB_NAME = "my-database";
const OBJECT_STORE_NAME = "api-data";
const urlsToCache = [
	"./",
	"./index.html",
	"./public/style/style.css",
	"./public/style/normalize.css",
	"./public/index.js",
	"./public/images/mosque.webp",
	"./public/images/192.png",
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
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = event => {
			debugLog('Database upgrade needed, creating object stores');
			const db = event.target.result;
			if (event.oldVersion < 1) {
				if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
					db.createObjectStore(OBJECT_STORE_NAME);
					debugLog(`Created ${OBJECT_STORE_NAME} object store`);
				}
			} else {
				if (db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
					db.deleteObjectStore(OBJECT_STORE_NAME);
					debugLog(`Deleted "${OBJECT_STORE_NAME}" object store`)
				}
				db.createObjectStore(OBJECT_STORE_NAME);
				debugLog(`Recreated "${OBJECT_STORE_NAME}" object store`)
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
				cacheNames
					.filter((cache) => cache !== CACHE_NAME)
					.map((oldCache) => caches.delete(oldCache))
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
							const res = response.clone();
							if (res.ok && res.type === 'basic') {
								debugLog('Caching new response for:', url);
								caches.open(CACHE_NAME)
									.then(cache => {
										cache.put(event.request, res);
										debugLog('Successfully cached response for:', url);
									});
							}

							return response;
						});
				})
		);
	}
});

function removeTashkeel(text) {
	const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
	return text.replace(tashkeelRegex, '');
}

// performance tests
//const start = performance.now();
//const end = performance.now();
//const time = end - start;
//console.log("Time taken: ", time)

// for static api requests (api's that don't update and return the same data)
async function handleStaticApiRequest(request) {
	try {
		// Try IndexedDB first
		const cachedData = await retrieveAndDecompress(OBJECT_STORE_NAME, request.url)

		return new Response(cachedData, {
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
				hadiths = jsonData.hadiths.map((hadithInstance) => hadithInstance.text.replaceAll("<br>", ""));
				await compressAndStore(OBJECT_STORE_NAME, request.url, hadiths);
				return new Response(JSON.stringify(hadiths), { status: 200, headers: { "Content-Type": "application/json" } })
			}

			// Store in IndexedDB
			await compressAndStore(OBJECT_STORE_NAME, request.url, jsonData);
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
		const request = indexedDB.open(DB_NAME, DB_VERSION);

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
		const request = indexedDB.open(DB_NAME, DB_VERSION);

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

async function compressAndStore(storeName, key, data) {
	return new Promise((resolve, reject) => {
		try {
			// 1. Serialize
			const jsonString = JSON.stringify(data);

			// 2. Compress
			const compressedData = pako.deflate(jsonString, { to: "string" });

			debugLog("Data compressed successfully");

			saveToIndexedDB(storeName, key, compressedData)
				.then(() => {
					debugLog("Compressed data saved successfully");
					resolve();
				})
				.catch(err => {
					debugLog("Error saving compressed data:", err);
					// If saving compressed data fails, attempt to save uncompressed
					debugLog("Attempting to save uncompressed data instead");
					saveToIndexedDB(storeName, key, data)
						.then(() => {
							debugLog("Uncompressed data saved successfully");
							resolve(); // Resolve the promise when the uncompressed data is saved
						})
						.catch(err2 => {
							debugLog("Error saving uncompressed data:", err2);
							reject(err2); // Reject the promise if both save attempts fail
						});
				});

		} catch (error) {
			console.error("Error during compression and encoding:", error);
			debugLog("Compression failed, attempting to save uncompressed data");
			saveToIndexedDB(storeName, key, data)
				.then(() => {
					debugLog("Uncompressed data saved successfully");
					resolve(); // Resolve the promise when the uncompressed data is saved
				})
				.catch(err => {
					debugLog("Error saving uncompressed data:", err);
					reject(err); // Reject the promise if saving uncompressed data also fails
				});
		}
	});
}

async function retrieveAndDecompress(storeName, key) {
	return new Promise((resolve, reject) => {
		getFromIndexedDB(storeName, key)
			.then(compressedData => {
				try {
					// Decompress
					const data = pako.inflate(compressedData, { to: 'string' });
					resolve(data);
				} catch (error) {
					console.error("Error during decompression and decoding:", error);
					resolve(compressedData)
					reject(error);
				}
			})
			.catch(reject);
	});
}
