import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

// Fichiers à contenu empreint : URL « /app.js?v=<hash> » → cache navigateur d'un an (immutable).
// L'empreinte change avec le contenu : aucune purge à faire, pas de version à incrémenter à la main.
const FINGERPRINTED = ['style.css', 'app.js', 'icon.svg', 'manifest.webmanifest'];
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.html': 'text/html; charset=utf-8',
};
const typeOf = (name) => TYPES[name.slice(name.lastIndexOf('.'))] || 'application/octet-stream';

const sha = (...bufs) => {
  const h = createHash('sha1');
  bufs.forEach((b) => h.update(b));
  return h.digest('hex').slice(0, 10);
};

// Précompression : chaque fichier est compressé une fois au démarrage (Brotli 11 + gzip 9), pas à chaque requête.
const compressed = new Map(); // empreinte du contenu → variantes (partagé entre instances)
function variants(buf) {
  const key = sha(buf);
  if (!compressed.has(key)) {
    compressed.set(key, {
      identity: buf,
      br: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
      gzip: gzipSync(buf, { level: 9 }),
    });
  }
  return compressed.get(key);
}

// Choisit la variante la plus petite acceptée par le client (jamais plus lourde que l'original).
export function pick(v, acceptEncoding = '') {
  if (/\bbr\b/.test(acceptEncoding) && v.br.length < v.identity.length) return { body: v.br, encoding: 'br' };
  if (/\bgzip\b/.test(acceptEncoding) && v.gzip.length < v.identity.length) return { body: v.gzip, encoding: 'gzip' };
  return { body: v.identity, encoding: null };
}

export function loadSite(dir) {
  const read = (f) => readFileSync(join(dir, f));
  const v = {};
  for (const f of FINGERPRINTED) v[f] = sha(read(f));

  let html = read('index.html').toString('utf8');
  for (const f of FINGERPRINTED) html = html.split(`"${f}"`).join(`"/${f}?v=${v[f]}"`);

  const shell = ['/', ...FINGERPRINTED.map((f) => `/${f}?v=${v[f]}`)];
  const version = sha(html, read('sw.js'), ...FINGERPRINTED.map((f) => read(f)));
  const sw = read('sw.js').toString('utf8')
    .replace('__VERSION__', version)
    .replace('__SHELL__', JSON.stringify(shell));

  const entry = (name, buf) => ({ type: typeOf(name), variants: variants(buf) });
  const files = {};
  for (const f of FINGERPRINTED) files[`/${f}`] = entry(f, read(f));

  return {
    version, versions: v, files,
    html: entry('index.html', Buffer.from(html)),
    sw: entry('sw.js', Buffer.from(sw)),
    // contenu texte brut, pour les tests et les messages
    htmlText: html, swText: sw,
    fingerprinted: new Set(FINGERPRINTED.map((f) => `/${f}`)),
  };
}
