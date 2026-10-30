/* Family Survival Atlas (web edition) service worker: keeps the loader, icons and the 29 MB atlas body
   so the app opens with no signal. Bump VERSION when the atlas changes. */
const VERSION = 'fsa-2026-10-30a';
const ATLAS = 'https://ieimwwhvrbujgnovvrrc.supabase.co/functions/v1/atlas/Survival-Atlas.html';
const LOCAL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(LOCAL.map(async f => { const r = await fetch(new Request(f, { cache: 'reload' })); if (r.ok) await c.put(f, r); }));
    const a = await fetch(ATLAS, { cache: 'reload', mode: 'cors' });
    if (!a.ok) throw new Error('atlas fetch ' + a.status);
    await c.put(ATLAS, a);
    (await self.clients.matchAll({ includeUncontrolled: true })).forEach(cl => cl.postMessage('cached'));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))); await self.clients.claim(); })());
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url.split('#')[0];
  const isAtlas = url.split('?')[0] === ATLAS;
  const sameOrigin = new URL(url).origin === location.origin;
  if (!isAtlas && !sameOrigin) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(isAtlas ? ATLAS : e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('./index.html') : null);
    if (hit) return hit;
    const r = await fetch(e.request);
    if (r.ok && (isAtlas || sameOrigin)) c.put(isAtlas ? ATLAS : e.request, r.clone());
    return r;
  })());
});
