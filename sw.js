// Play IQ Service Worker
// アプリの基本ファイルをキャッシュしつつ、index.html / sw.js は常に最新を取りに行く。
const CACHE = "playiq-v3";

// オフライン用に最低限キャッシュするもの（アイコン等の静的物）
const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(STATIC_ASSETS).catch(() => {})) // アイコン等が無くても失敗させない
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 外部リソース（YouTube / Firebase / gstatic / Google など）は素通し
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;

  const path = url.pathname;
  const isHTML = e.request.mode === "navigate" || path.endsWith("/") || path.endsWith("index.html");
  const isSW = path.endsWith("sw.js");

  // index.html と sw.js は常にネットワーク優先（古いキャッシュを握り続けない）
  if (isHTML || isSW) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // その他の自オリジン静的物はキャッシュ優先（速度のため）
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
