// Play IQ Service Worker
// アプリの基本ファイルをキャッシュし、オフラインでも開けるようにする。
const CACHE = "playiq-v2";
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

  // 外部リソース（YouTube / Firebase / gstatic / Google など）はキャッシュせず素通し。
  // 自分のオリジン以外は何もしない。
  if (url.origin !== self.location.origin) {
    return; // ブラウザの通常処理に任せる
  }

  // GET 以外は無視
  if (e.request.method !== "GET") return;

  // 自分のファイルは network-first：
  // 常に最新を取りに行き、取れたらキャッシュ更新。失敗時のみキャッシュを返す。
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
