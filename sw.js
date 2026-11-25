// GCSELLION offline cache: opens the game instantly from the phone, then checks for a newer version in the background.
const CACHE='gcsellion-v1';
const PAGES=['/','/index.html'];
const ASSETS=['/manifest.json','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];

self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/',...ASSETS]).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});

async function refresh(req,cached){
  try{
    const res=await fetch('/',{cache:'no-store'});
    if(!res.ok)return res;
    const c=await caches.open(CACHE);
    if(cached){const [a,b]=await Promise.all([cached.clone().text(),res.clone().text()]);
      if(a!==b)await c.put('/',res.clone())}
    else await c.put('/',res.clone());
    return res;
  }catch(err){return null}
}

self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin||url.searchParams.has('v'))return;     // never touch Supabase, or the page's own update check
  if(req.mode==='navigate'||PAGES.includes(url.pathname)){
    e.respondWith((async()=>{
      const cached=await caches.match('/');
      const fresh=refresh(req,cached);
      if(cached){e.waitUntil(fresh);return cached}                         // instant from the phone; update quietly
      return (await fresh)||new Response('Offline — open GCSELLION again when you have signal.',{status:503,headers:{'Content-Type':'text/plain'}});
    })());return;
  }
  if(ASSETS.includes(url.pathname))e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
