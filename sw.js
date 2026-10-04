/* GET CLOCKED — offline app shell.
 *
 * Caches the static app shell (HTML/CSS/JS/icons/config) so pass-and-play
 * works with no connection. Bump CACHE_VERSION on every deploy that
 * changes a cached file; old caches are purged on activate.
 *
 * Never caches cross-origin requests (the ads flag service) — those simply
 * fail through to their own fallbacks when offline.
 */
"use strict";
var CACHE_VERSION = "v1";
var CACHE_NAME = "getclocked-shell-" + CACHE_VERSION;
var SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "config.json",
  "favicon.svg",
  "css/styles.css",
  "js/data.js",
  "js/store.js",
  "js/ads.js",
  "js/haptics.js",
  "js/app.js",
  "js/game.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* add one at a time: a single 404 must not fail the whole install */
      return SHELL.reduce(function (p, url) {
        return p.then(function () {
          return cache.add(url).catch(function () { /* best-effort */ });
        });
      }, Promise.resolve());
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf("getclocked-shell-") === 0 && k !== CACHE_NAME) {
          return caches.delete(k);
        }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* cross-origin: never intercept */
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { return res; }).catch(function () {
        /* offline + not cached: fall back to the shell for navigations */
        if (req.mode === "navigate") return caches.match("index.html", { ignoreSearch: true });
        return Response.error();
      });
    })
  );
});
