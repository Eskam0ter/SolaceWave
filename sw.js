const CACHE = 'solacewave-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './static/audio/forest.mp3',
  './static/audio/cat.mp3',
  './static/audio/ocean.mp3',
  './static/audio/fireplace.mp3',
  './static/img/forest.jpg',
  './static/img/cat.jpg',
  './static/img/ocean.jpg',
  './static/img/fireplace.jpg'  
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
