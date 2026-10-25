// Service Worker von Kardio Teaching (erzeugt von bauen.mjs, nicht von Hand ändern).
// Erst Netz, bei fehlendem Netz der Zwischenspeicher: Online gibt es immer die neueste Fassung, offline die zuletzt geladene.
const CACHE = 'kardio-teaching-124236b83051';
const VORRAT = ["./","index.html","manifest.webmanifest","manifest-ios.webmanifest","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","medien/frei/LIZENZEN.json","medien/frei/pocusatlas/echo-a4c-normal.webp","medien/frei/pocusatlas/echo-a4c-rv-dilatation.webp","medien/frei/pocusatlas/echo-plax-lv-schwer-eingeschraenkt.webp","medien/frei/pocusatlas/echo-plax-normal.webp","medien/frei/pocusatlas/echo-psax-d-zeichen.webp","medien/frei/pocusatlas/echo-psax-hyperdynam.webp","medien/frei/pocusatlas/echo-psax-normal.webp","medien/frei/pocusatlas/echo-subkostal-normal.webp","medien/frei/pocusatlas/echo-subkostal-tamponade.webp","medien/frei/pocusatlas/echo-vci-eng-kollabierend.webp","medien/frei/pocusatlas/echo-vci-gestaut.webp","medien/frei/pocusatlas/echo-vci-normal.webp","medien/frei/pocusatlas/efast-becken-laengs-fluessigkeit.webp","medien/frei/pocusatlas/efast-becken-laengs-normal.webp","medien/frei/pocusatlas/efast-luq-fluessigkeit.webp","medien/frei/pocusatlas/efast-luq-normal.webp","medien/frei/pocusatlas/efast-ruq-morison-fluessigkeit.webp","medien/frei/pocusatlas/efast-ruq-normal.webp","medien/frei/pocusatlas/efast-subxiphoidal-haemoperikard.webp","medien/frei/pocusatlas/lunge-a-linien.webp","medien/frei/pocusatlas/lunge-b-linien.webp","medien/frei/pocusatlas/lunge-gleiten-normal.webp","medien/frei/pocusatlas/lunge-kein-gleiten.webp","medien/frei/pocusatlas/lunge-lungenpunkt.webp","medien/frei/pocusatlas/lunge-mmode-seashore-barcode.webp"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(VORRAT.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('kardio-teaching-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('./') : undefined)).then((r) => r || Response.error())));
});
