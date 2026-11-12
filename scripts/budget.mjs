// Budget de poids et de requêtes d'une première visite (RGESN 2.6, brief : ≤ 500 Ko, < 15 requêtes).
// Démarre l'application en mémoire, rejoue ce que fait un navigateur (page, ressources déclarées,
// Service Worker, appel de la liste) en demandant du Brotli, et compte les octets réellement envoyés.
// Usage : npm run budget      → code de sortie 1 si un budget est dépassé.
import http from 'node:http';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { co2 } from '@tgwf/co2';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/server.js';

const MAX_BYTES = 500 * 1024;
const MAX_REQUESTS = 14; // « moins de 15 requêtes par page »

const db = openDb(':memory:');
seed(db);
const app = await buildApp(db);
await app.listen({ port: 0, host: '127.0.0.1' });
const { port } = app.server.address();

const get = (path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path, headers: { 'accept-encoding': 'br, gzip' } }, (res) => {
    let body = 0;
    const chunks = [];
    res.on('data', (c) => { body += c.length; chunks.push(c); });
    res.on('end', () => {
      const head = Object.entries(res.headers).reduce((n, [k, v]) => n + k.length + String(v).length + 4, 17);
      resolve({ path, status: res.statusCode, bytes: body + head, raw: Buffer.concat(chunks), encoding: res.headers['content-encoding'] || '-' });
    });
  }).on('error', reject);
});

const home = await get('/');
const inflate = (r) => (r.encoding === 'br' ? brotliDecompressSync(r.raw) : r.encoding === 'gzip' ? gunzipSync(r.raw) : r.raw).toString('utf8');
const refs = [...inflate(home).matchAll(/(?:href|src)="(\/[^"#]+)"/g)].map((m) => m[1]);
const firstVisit = [home];
for (const p of new Set(refs)) firstVisit.push(await get(p));
firstVisit.push(await get('/sw.js'));                                 // enregistré après le chargement
firstVisit.push(await get('/api/annonces?page=1&tri=recent'));       // liste affichée
const detail = [...firstVisit, await get('/api/annonces/2')];         // + ouverture d'une annonce

const swd = new co2({ model: 'swd', version: 4 });
let failed = false;
const report = (label, list) => {
  const total = list.reduce((n, r) => n + r.bytes, 0);
  const ok = total <= MAX_BYTES && list.length <= MAX_REQUESTS && list.every((r) => r.status === 200);
  failed ||= !ok;
  console.log(`\n${label}`);
  for (const r of list) console.log(`  ${String(r.status).padEnd(4)} ${(r.bytes / 1024).toFixed(1).padStart(6)} Ko  ${r.encoding.padEnd(4)} ${r.path}`);
  console.log(`  → ${list.length} requêtes (max ${MAX_REQUESTS}) · ${(total / 1024).toFixed(1)} Ko (max ${MAX_BYTES / 1024}) · ≈ ${swd.perByte(total, true).toFixed(4)} g CO2e · ${ok ? 'OK' : 'BUDGET DÉPASSÉ'}`);
};
report('Première visite (accueil + liste)', firstVisit);
report('Première visite + détail d’une annonce', detail);

await app.close();
process.exit(failed ? 1 : 0);
