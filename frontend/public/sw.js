// Service Worker for Push Notifications + Offline Mode - The Room App

var CACHE_NAME = 'the-room-v2';
var OFFLINE_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install: Pre-cache shell
self.addEventListener('install', function(event) {
    console.log('Service Worker v2 installing.');
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
    console.log('Service Worker v2 activated.');
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

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension, ws, and other non-http(s)
    if (!url.protocol.startsWith('http')) return;

    // Skip WebSocket upgrade requests
    if (event.request.headers.get('Upgrade') === 'websocket') return;

    // API requests: network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                // Cache successful API responses for read endpoints
                if (response.ok && isReadEndpoint(url.pathname)) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    if (cached) return cached;
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
                // For navigation requests, return the cached index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Push notification handler
self.addEventListener('push', function(event) {
    console.log('Push notification received:', event);
    
    var data = { title: 'The Room', body: 'You have a new notification' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    var options = {
        body: data.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
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
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Message handler — receives commands from main thread
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CACHE_API') {
        // Pre-cache specific API responses on demand
        var urls = event.data.urls || [];
        event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
                var promises = urls.map(function(url) {
                    return fetch(url, { headers: event.data.headers || {} })
                        .then(function(response) {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        })
                        .catch(function() {});
                });
                return Promise.all(promises);
            })
        );
    }
});

// Helper: Check if API endpoint should be cached for offline
function isReadEndpoint(pathname) {
    var cacheablePatterns = [
        '/api/courses',
        '/api/lessons/',
        '/api/auth/me',
        '/api/my-progress',
        '/api/groups/my',
        '/api/groups/all',
        '/api/chat',
        '/api/messages/inbox',
        '/api/search',
        '/api/enrollments/my',
        '/api/analytics',
        '/api/teachers',
        '/api/users'
    ];
    for (var i = 0; i < cacheablePatterns.length; i++) {
        if (pathname.indexOf(cacheablePatterns[i]) !== -1) {
            return true;
        }
    }
    return false;
}

// Helper: Check if static asset should be cached
function shouldCacheStatic(url) {
    var ext = url.pathname.split('.').pop();
    var cacheableExtensions = ['js', 'css', 'png', 'jpg', 'jpeg', 'svg', 'woff', 'woff2', 'ico', 'webp', 'gif'];
    for (var i = 0; i < cacheableExtensions.length; i++) {
        if (ext === cacheableExtensions[i]) {
            return true;
        }
    }
    return false;
}
