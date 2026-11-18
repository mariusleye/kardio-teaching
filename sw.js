// Service Worker von Kardio Teaching (erzeugt von bauen.mjs, nicht von Hand ändern).
// App: startet sofort aus dem Speicher und sieht im Hintergrund nach einer neueren Fassung; die laufende App erfährt davon und wechselt.
// Symbole und Clips: aus dem Speicher, sie ändern sich selten.
const CACHE = 'kardio-teaching-6511a5bf5dc0';   // App und Manifeste; wechselt, wenn sich der Build ändert
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
// Frische Fassung der App holen und speichern. Der Server wird immer gefragt, schickt eine unveränderte Datei aber nicht noch einmal
let laufend = null;   // das zuletzt gestartete Auffrischen (damit eine Nachfrage der App darauf warten kann)
const holeApp = () => (laufend = fetch(SCOPE, { cache: 'no-cache' }).then((res) => {
  if (!res.ok || res.type !== 'basic' || res.redirected) return null;
  const kopie = res.clone();
  return caches.open(CACHE).then((c) => c.put(SCOPE, kopie)).then(() => res);
}).catch(() => null));
// Kennung der Fassung, die jetzt im Speicher liegt (steht vorn in der Datei)
const fassungImSpeicher = () => caches.open(CACHE).then((c) => c.match(SCOPE)).then((r) => (r ? r.text() : '')).then((t) => {
  const m = /<meta name="kt-build" content="([0-9a-f]+)">/.exec(t.slice(0, 5000));
  return m ? m[1] : null;
});
// Offenen Fenstern die gespeicherte Fassung melden; die App vergleicht mit ihrer eigenen und wechselt, wenn sie älter ist
const meldeFassung = () => fassungImSpeicher().then((build) => (build ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ typ: 'kt-fassung', build }))) : null)).catch(() => null);
// Die App fragt beim Start nach: Antwort erst, wenn ein laufendes Auffrischen fertig ist
self.addEventListener('message', (e) => {
  if (!e.data || e.data.typ !== 'kt-frage' || !e.source) return;
  e.waitUntil(Promise.resolve(laufend).then(fassungImSpeicher).then((build) => { if (build) e.source.postMessage({ typ: 'kt-fassung', build }); }).catch(() => null));
});
self.addEventListener('install', (e) => {
  // Der Kern ist Pflicht: Lädt er nicht vollständig, bleibt der bisherige Service Worker mit seinem Speicher aktiv
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KERN.map((u) => new Request(u, { cache: 'no-cache' })))).then(() => fuelleFest()).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  const alt = (k) => (k.startsWith('kardio-teaching-') && k !== CACHE) || (k.startsWith('kardio-fest-') && k !== FEST);
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter(alt).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin || !req.url.startsWith(SCOPE)) return;
  // Fester Schlüssel ohne Query und Fragment: kein Wachstum durch ?utm=…, und der Hausschlüssel (#k=…) gerät nicht in den Speicher
  const pfad = u.origin + u.pathname, istApp = pfad === SCOPE || pfad === SCOPE + 'index.html';
  const key = istApp ? SCOPE : pfad;
  const name = istFest(key) ? FEST : CACHE;
  const ausCache = () => caches.open(name).then((c) => c.match(key));
  const ausNetz = () => fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const kopie = res.clone(); e.waitUntil(caches.open(name).then((c) => c.put(key, kopie))); }
    return res;
  });
  if (istFest(key)) { e.respondWith(ausCache().then((r) => r || ausNetz())); return; }
  if (req.mode === 'navigate' && !istApp) return;   // eine andere Adresse direkt geöffnet (z. B. eine Datei): unverändert ans Netz
  if (req.mode !== 'navigate') { e.respondWith(ausNetz().catch(() => ausCache().then((r) => r || Response.error()))); return; }
  // Start der App: gespeicherte Fassung sofort zeigen, im Hintergrund auffrischen und der App melden. Beim ersten Besuch kommt die Seite aus dem Netz
  const gespeichert = ausCache(), frisch = holeApp();
  e.waitUntil(Promise.all([gespeichert, frisch]).then(([g, res]) => (g && res ? meldeFassung() : null)).then(() => fuelleFest()).catch(() => null));
  e.respondWith(gespeichert.then((g) => g || frisch.then((res) => res || Response.error())));
});
