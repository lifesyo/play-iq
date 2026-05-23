// Play IQ Service Worker
// バージョンを変えると古いキャッシュが破棄される（更新時はここを上げる）
const CACHE = "playiq-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 外部通信（YouTube / Firebase / gstatic / Google）は一切キャッシュせず素通し
  // これらは常に最新を取りに行く必要があるため
  if (url.origin !== self.location.origin) {
    return; // ブラウザ標準の取得に任せる
  }

  // GET 以外は素通し
  if (e.request.method !== "GET") return;

  // アプリ本体（同一オリジン）は network-first：
  // ネットがあれば最新を取得しキャッシュ更新、なければキャッシュから返す（オフライン対応）
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
