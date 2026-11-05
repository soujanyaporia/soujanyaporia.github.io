import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve('dist'), base = '/singapore-primary-maths/';
const assets = (await readdir(path.join(root, 'assets'))).filter(name => /\.(js|css|woff2?|svg|png|webp)$/.test(name)).map(name => 'assets/' + name);
const files = ['index.html', 'resources.css', 'favicon.svg', ...assets];
const hash = createHash('sha256'); let size = 0;
for (const file of files) { const bytes = await readFile(path.join(root, file)); hash.update(bytes); size += (await stat(path.join(root, file))).size; }
const cache = 'sg-maths-shell-' + hash.digest('hex').slice(0, 16);
// Only static application assets are cached. API requests and recovery fragments are never cache keys.
const worker = `const CACHE=${JSON.stringify(cache)}, BASE=${JSON.stringify(base)}, FILES=${JSON.stringify(files.map(p => base + p))};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sg-maths-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
 if (event.request.mode === 'navigate' && (url.pathname === BASE || url.pathname === BASE + 'index.html')) {
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(BASE + 'index.html')))); return;
 }
 if (FILES.includes(url.pathname)) event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
});
`;
await writeFile(path.join(root, 'sw.js'), worker);
console.log(`Offline app shell: ${files.length} static assets, ${(size / 1024 / 1024).toFixed(1)} MB. Cloud APIs are excluded.`);
