// Service Worker for Push Notifications + Offline Mode - The Room App

var CACHE_NAME = 'the-room-v3';
var OFFLINE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];
var PENDING_ACTIONS_KEY = 'pending-offline-actions';

// Install: Pre-cache shell
self.addEventListener('install', function(event) {
    console.log('Service Worker v3 installing.');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Caching app shell');
            return cache.addAll(OFFLINE_URLS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', function(event) {
    console.log('Service Worker v3 activated.');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            var deletePromises = [];
            for (var i = 0; i < cacheNames.length; i++) {
                if (cacheNames[i] !== CACHE_NAME) {
                    deletePromises.push(caches.delete(cacheNames[i]));
                }
            }
            return Promise.all(deletePromises);
        }).then(function() {
            return clients.claim();
        })
    );
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Skip non-http(s) and WebSocket
    if (!url.protocol.startsWith('http')) return;
    if (event.request.headers.get('Upgrade') === 'websocket') return;

    // Write requests: queue for background sync when offline
    if (event.request.method !== 'GET') {
        event.respondWith(
            fetch(event.request.clone()).catch(function() {
                // Queue the action for later
                return event.request.clone().text().then(function(body) {
                    return queueAction({
                        url: event.request.url,
                        method: event.request.method,
                        body: body,
                        headers: Object.fromEntries(event.request.headers.entries()),
                        timestamp: Date.now()
                    }).then(function() {
                        return new Response(JSON.stringify({ queued: true, offline: true, message: 'Action queued for when you are back online' }), {
                            status: 202,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                });
            })
        );
        return;
    }

    // API requests: network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                if (response.ok && isReadEndpoint(url.pathname)) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    if (cached) {
                        // Add offline header so frontend knows this is cached data
                        var init = { status: cached.status, statusText: cached.statusText, headers: new Headers(cached.headers) };
                        init.headers.set('X-Served-From', 'sw-cache');
                        return cached.clone().blob().then(function(body) {
                            return new Response(body, init);
                        });
                    }
                    return new Response(JSON.stringify({ error: 'You are offline', offline: true }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                });
            })
        );
        return;
    }

    // Static assets: cache-first
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(response) {
                if (response.ok && shouldCacheStatic(url)) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(function() {
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Background sync — replay queued actions when back online
self.addEventListener('sync', function(event) {
    if (event.tag === 'replay-offline-actions') {
        event.waitUntil(replayQueuedActions());
    }
});

// Push notification handler
self.addEventListener('push', function(event) {
    var data = { title: 'The Room', body: 'You have a new notification' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }
    var options = {
        body: data.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.action === 'dismiss') return;
    var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// Message handler
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CACHE_API') {
        var urls = event.data.urls || [];
        event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
                return Promise.all(urls.map(function(url) {
                    return fetch(url, { headers: event.data.headers || {} })
                        .then(function(response) { if (response.ok) return cache.put(url, response); })
                        .catch(function() {});
                }));
            })
        );
    }
    if (event.data && event.data.type === 'REPLAY_QUEUE') {
        event.waitUntil(replayQueuedActions());
    }
});

// ============ HELPERS ============

function isReadEndpoint(pathname) {
    var patterns = [
        '/api/courses', '/api/lessons/', '/api/auth/me',
        '/api/my-progress', '/api/groups/my', '/api/groups/all',
        '/api/chat', '/api/messages/inbox', '/api/search',
        '/api/enrollments/my', '/api/analytics', '/api/teachers', '/api/users',
        '/api/chat/read-receipts'
    ];
    for (var i = 0; i < patterns.length; i++) {
        if (pathname.indexOf(patterns[i]) !== -1) return true;
    }
    return false;
}

function shouldCacheStatic(url) {
    var ext = url.pathname.split('.').pop();
    var exts = ['js', 'css', 'png', 'jpg', 'jpeg', 'svg', 'woff', 'woff2', 'ico', 'webp', 'gif'];
    for (var i = 0; i < exts.length; i++) {
        if (ext === exts[i]) return true;
    }
    return false;
}

// IndexedDB-backed queue for offline write operations
function openDB() {
    return new Promise(function(resolve, reject) {
        var req = indexedDB.open('the-room-sw', 1);
        req.onupgradeneeded = function(e) {
            e.target.result.createObjectStore('queue', { keyPath: 'timestamp' });
        };
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
    });
}

function queueAction(action) {
    return openDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').put(action);
            tx.oncomplete = function() {
                // Notify clients about queued action
                self.clients.matchAll().then(function(clients) {
                    clients.forEach(function(client) {
                        client.postMessage({ type: 'ACTION_QUEUED', action: action });
                    });
                });
                resolve();
            };
            tx.onerror = function(e) { reject(e.target.error); };
        });
    });
}

function replayQueuedActions() {
    return openDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('queue', 'readonly');
            var req = tx.objectStore('queue').getAll();
            req.onsuccess = function(e) {
                var actions = e.target.result || [];
                if (actions.length === 0) { resolve(); return; }

                var chain = Promise.resolve();
                var replayed = 0;
                actions.forEach(function(action) {
                    chain = chain.then(function() {
                        return fetch(action.url, {
                            method: action.method,
                            body: action.body || undefined,
                            headers: action.headers || {}
                        }).then(function() {
                            replayed++;
                            // Remove from queue
                            var delTx = db.transaction('queue', 'readwrite');
                            delTx.objectStore('queue').delete(action.timestamp);
                        }).catch(function() {
                            // Keep in queue for next attempt
                        });
                    });
                });
                chain.then(function() {
                    if (replayed > 0) {
                        self.clients.matchAll().then(function(clients) {
                            clients.forEach(function(client) {
                                client.postMessage({ type: 'QUEUE_REPLAYED', count: replayed });
                            });
                        });
                    }
                    resolve();
                });
            };
            req.onerror = function(e) { reject(e.target.error); };
        });
    });
}
