module.exports = {
  globDirectory: 'public/',
  // index.html is deliberately left out of the precache: the page itself is
  // fetched from the network first (see runtimeCaching below), otherwise the
  // browser keeps serving a stale shell, or hides a lost authentication behind
  // a cached copy.
  globPatterns: ['**/*.{js,css,woff2}'],
  globIgnores: ['index.html', 'sw.js', 'workbox-*.js'],
  swDest: 'public/sw.js',
  // A new service worker takes over right away instead of waiting for every tab
  // of the site to be closed.
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      // Network first for pages, cache as a fallback only. A 401 or a 5xx is
      // handed back to the browser as is, so an expired session stays visible.
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'flood-pages',
        networkTimeoutSeconds: 5,
        // Without this, the browser can answer from its own HTTP cache (the
        // server only sends Last-Modified), which is how a stale page survived
        // an update.
        fetchOptions: { cache: 'no-store' },
        cacheableResponse: { statuses: [200] },
      },
    },
  ],
};
