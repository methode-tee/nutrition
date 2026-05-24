const CACHE='methode-tee-v4-stable-cache';
const ASSETS=['./','./index.html','./admin.html','./style.css','./app.js','./landing.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{})));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))));
