/* 서비스워커 — network-first + 오프라인 + 업데이트 자동 적용 (귀화앱과 동일 방식)
   배포 시 CACHE 숫자만 올리면 다음 접속 때 모든 기기가 자동 갱신됩니다. */
const CACHE = 'typing-v26';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './hangul.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

let isUpdate = false;

self.addEventListener('install', (e) => {
  isUpdate = !!self.registration.active;
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (isUpdate) {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) { try { c.navigate(c.url); } catch (err) {} }
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/typing/data.js')) return;
  e.respondWith(
    // GitHub Pages 가 max-age=600 을 보내서, 그냥 fetch(req) 하면 배포 뒤 10분 동안
    // 브라우저 HTTP 캐시의 옛 파일을 '네트워크에서 받은 것'처럼 돌려준다.
    // no-cache 는 매번 서버에 바뀌었는지 묻는다(안 바뀌었으면 304 로 가볍게 끝난다).
    // 페이지 이동(navigate) 요청은 옵션을 붙여 다시 만들면 리다이렉트 처리가 달라질 수 있어 그대로 둔다.
    // 옛 파일이 끼어드는 것은 app.js 같은 하위 자원이라 그쪽만 no-cache 로 묻는다.
    fetch(req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' }))
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'CLEAR_MEMBER_CACHE') return;
  e.waitUntil((async () => {
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      await Promise.all(reqs
        .filter((req) => /typing\/data\.js/.test(new URL(req.url).pathname))
        .map((req) => cache.delete(req)));
    }
  })());
});
