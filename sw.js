// sw.js — Deftere Golle Service Worker
// v2 — updated for modular architecture (index.html + app.js + style.css + lang/*.json)
//
// Strategy summary:
//   Shell assets  → precached at install, cache-first forever
//   lang/*.json   → cache-first; fetched and cached on first language switch
//   Google Fonts  → network-first with cache fallback (stale fonts still readable)
//   Everything else → cache-first with network fallback

// ─── VERSION ─────────────────────────────────────────────────────────────────
// Bump this string whenever you deploy new files to force clients to update.
const CACHE_VERSION = 'dg-v2';
const FONT_CACHE    = 'dg-fonts-v1'; // separate so font updates don't bust content

// ─── SHELL — precached at install ────────────────────────────────────────────
// These are required for the app to function at all. Must all succeed.
const SHELL = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ─── LANGUAGE FILES — cached on first access, not at install ─────────────────
// We don't precache all lang files because:
//   (a) the user may only ever use one language
//   (b) adding new languages requires no SW update — they cache themselves
// Pattern match: any request to ./lang/*.json
const LANG_PATTERN = /\/lang\/[a-z-]+\.json$/;

// ─── GOOGLE FONTS URL ────────────────────────────────────────────────────────
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Noto+Sans:wght@400;600;700&display=swap';

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))      // hard fail if shell unavailable
      .then(() => self.skipWaiting())           // activate immediately
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())         // take control of open tabs
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Google Fonts CSS & font files: network-first, cache fallback ──────────
  // Fonts change rarely; serve fresh when online, fall back to cached copy offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(networkFirstFont(event.request));
    return;
  }

  // ── lang/*.json: cache-first, fetch-and-cache on miss ─────────────────────
  // Once a language is loaded once it's available forever offline.
  if (LANG_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirstLang(event.request));
    return;
  }

  // ── Shell assets and everything else: cache-first ─────────────────────────
  event.respondWith(cacheFirst(event.request));
});

// ─── STRATEGIES ──────────────────────────────────────────────────────────────

// Cache-first: serve from cache; if miss, fetch, store, return.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // No cache hit, no network — nothing we can do.
    return new Response('Offline — content not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Lang cache-first: same as above but uses CACHE_VERSION cache.
// Language files never change for a given version — safe to cache indefinitely.
async function cacheFirstLang(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('{"error":"Language file unavailable offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network-first for fonts: try fresh, fall back to cached, store successes.
async function networkFirstFont(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(FONT_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: FONT_CACHE });
    if (cached) return cached;
    // Font unavailable offline and not cached — app still works, just system fonts
    return new Response('', { status: 408 });
  }
}
