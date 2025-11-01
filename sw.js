const CACHE_NAME = 'shuvo-expense-tracker-v1';
// This list includes all the essential files for the app to work offline.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  // Since we are in a dev environment, caching the source files is what we need.
  // In a real build, we'd cache the bundled JS/CSS files.
  '/App.tsx',
  '/types.ts',
  '/metadata.json',
  '/manifest.json',
  '/assets/icon.svg',
  '/components/BottomNav.tsx',
  '/components/Calculator.tsx',
  '/components/Header.tsx',
  '/components/ThemeToggleButton.tsx',
  '/contexts/ThemeContext.tsx',
  '/pages/DashboardPage.tsx',
  '/pages/ExpenseListPage.tsx',
  '/pages/ExpensePage.tsx',
  '/pages/IncomePage.tsx',
  '/pages/SegmentsPage.tsx',
  '/contexts/AuthContext.tsx',
  '/pages/AccountPage.tsx',
  '/components/ProtectedRoute.tsx',
  '/components/SyncStatus.tsx',
  '/components/icons/AccountIcon.tsx',
  '/components/icons/CalculatorIcon.tsx',
  '/components/icons/CloudOfflineIcon.tsx',
  '/components/icons/DashboardIcon.tsx',
  '/components/icons/EditIcon.tsx',
  '/components/icons/ExpenseIcon.tsx',
  '/components/icons/GoogleIcon.tsx',
  '/components/icons/IncomeIcon.tsx',
  '/components/icons/ListIcon.tsx',
  '/components/icons/MoonIcon.tsx',
  '/components/icons/SegmentIcon.tsx',
  '/components/icons/SunIcon.tsx',
  '/components/icons/SyncIcon.tsx',
  '/components/icons/SystemIcon.tsx',
  '/components/icons/TrashIcon.tsx',
  // Caching external resources loaded via CDN
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client',
  'https://aistudiocdn.com/react-router-dom@^7.9.4',
  'https://aistudiocdn.com/react@^19.2.0/jsx-runtime',
  'https://aistudiocdn.com/recharts@^3.3.0',
  'https://aistudiocdn.com/jspdf@^2.5.1',
  'https://aistudiocdn.com/jspdf-autotable@^3.8.2'
];

// Install event: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache, fall back to network (Cache-First strategy)
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If we have a response in cache, return it.
      // Otherwise, fetch from the network.
      return response || fetch(event.request).then(networkResponse => {
        // Optional: Cache the new resource for next time.
        // This is useful for resources not in the initial cache list.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});