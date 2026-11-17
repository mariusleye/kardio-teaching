// Service Worker von Kardio Teaching (erzeugt von bauen.mjs, nicht von Hand ändern).
// App: erst Netz, bei fehlendem oder langsamem Netz die gespeicherte Fassung. Symbole und Clips: aus dem Speicher, sie ändern sich selten.
const CACHE = 'kardio-teaching-ab59ccbebeec';   // App und Manifeste; wechselt, wenn sich der Build ändert
const FEST = 'kardio-fest-928b87e702cb';     // Symbole und Medien; wechselt nur, wenn sich deren Inhalt ändert
const KERN = ["./","manifest.webmanifest","manifest-ios.webmanifest"];
const VORRAT_FEST = ["icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","medien/frei/LIZENZEN.json","medien/frei/pocusatlas/echo-a4c-normal.webp","medien/frei/pocusatlas/echo-a4c-rv-dilatation.webp","medien/frei/pocusatlas/echo-plax-lv-schwer-eingeschraenkt.webp","medien/frei/pocusatlas/echo-plax-normal.webp","medien/frei/pocusatlas/echo-psax-d-zeichen.webp","medien/frei/pocusatlas/echo-psax-hyperdynam.webp","medien/frei/pocusatlas/echo-psax-normal.webp","medien/frei/pocusatlas/echo-subkostal-normal.webp","medien/frei/pocusatlas/echo-subkostal-tamponade.webp","medien/frei/pocusatlas/echo-vci-eng-kollabierend.webp","medien/frei/pocusatlas/echo-vci-gestaut.webp","medien/frei/pocusatlas/echo-vci-normal.webp","medien/frei/pocusatlas/efast-becken-laengs-fluessigkeit.webp","medien/frei/pocusatlas/efast-becken-laengs-normal.webp","medien/frei/pocusatlas/efast-luq-fluessigkeit.webp","medien/frei/pocusatlas/efast-luq-normal.webp","medien/frei/pocusatlas/efast-ruq-morison-fluessigkeit.webp","medien/frei/pocusatlas/efast-ruq-normal.webp","medien/frei/pocusatlas/efast-subxiphoidal-haemoperikard.webp","medien/frei/pocusatlas/lunge-a-linien.webp","medien/frei/pocusatlas/lunge-b-linien.webp","medien/frei/pocusatlas/lunge-gleiten-normal.webp","medien/frei/pocusatlas/lunge-kein-gleiten.webp","medien/frei/pocusatlas/lunge-lungenpunkt.webp","medien/frei/pocusatlas/lunge-mmode-seashore-barcode.webp"];
const SCOPE = self.registration.scope;
const istFest = (key) => key.startsWith(SCOPE + 'icons/') || key.startsWith(SCOPE + 'medien/');
// Fehlende Symbole und Clips nachladen; einzelne Fehler sind unkritisch und werden beim nächsten Start nachgeholt
const fuelleFest = () => caches.open(FEST).then((c) => c.keys().then((ks) => {
  const da = new Set(ks.map((r) => r.url));
  return Promise.all(VORRAT_FEST.filter((u) => !da.has(SCOPE + u)).map((u) => c.add(u).catch(() => null)));
}));
self.addEventListener('install', (e) => {
  // Der Kern ist Pflicht: Lädt er nicht vollständig, bleibt der bisherige Service Worker mit seinem Speicher aktiv
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KERN)).then(() => fuelleFest()).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  const alt = (k) => (k.startsWith('kardio-teaching-') && k !== CACHE) || (k.startsWith('kardio-fest-') && k !== FEST);
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter(alt).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin || !req.url.startsWith(SCOPE)) return;
  // Fester Schlüssel ohne Query und Fragment: kein Wachstum durch ?utm=…, und der Hausschlüssel (#k=…) gerät nicht in den Speicher
  const key = req.mode === 'navigate' || u.pathname.endsWith('/index.html') ? SCOPE : u.origin + u.pathname;
  const name = istFest(key) ? FEST : CACHE;
  const ausCache = () => caches.open(name).then((c) => c.match(key));
  const ausNetz = () => fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const kopie = res.clone(); e.waitUntil(caches.open(name).then((c) => c.put(key, kopie))); }
    return res;
  });
  if (istFest(key)) { e.respondWith(ausCache().then((r) => r || ausNetz())); return; }
  if (req.mode !== 'navigate') { e.respondWith(ausNetz().catch(() => ausCache().then((r) => r || Response.error()))); return; }
  // Seitenaufruf: höchstens 3,5 s auf das Netz warten, dann die gespeicherte Fassung zeigen; das Netz frischt den Speicher im Hintergrund auf
  const netz = ausNetz().catch(() => null);
  const warten = new Promise((r) => setTimeout(r, 3500)).then(ausCache);
  e.waitUntil(netz.then(() => fuelleFest()).catch(() => null));
  e.respondWith(Promise.race([netz, warten]).then((r) => r || ausCache()).then((r) => r || netz).then((r) => r || Response.error()));
});
