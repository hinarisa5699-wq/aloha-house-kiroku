// アロハハウス入居者記録アプリ Service Worker：画面ファイルを端末に保持（電波が弱くても画面は開く。データはGASに接続時のみ）
const CACHE='house-app-v2';
const FILES=['./','./index.html','./parsers.js','./kiroku.js','./app.js','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET' || u.origin!==location.origin) return; // GASへの通信はそのまま
  // ネットワーク優先、失敗したらキャッシュ（更新はすぐ反映、圏外でも開ける）
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
