import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Fichiers à contenu empreint : URL « /app.js?v=<hash> » → cache navigateur d'un an (immutable).
// L'empreinte change avec le contenu : aucune purge à faire, pas de version à incrémenter à la main.
const FINGERPRINTED = ['style.css', 'app.js', 'icon.svg'];

export function loadSite(dir) {
  const read = (f) => readFileSync(join(dir, f));
  const hash = (...bufs) => {
    const h = createHash('sha1');
    bufs.forEach((b) => h.update(b));
    return h.digest('hex').slice(0, 10);
  };
  const v = {};
  for (const f of FINGERPRINTED) v[f] = hash(read(f));

  let html = read('index.html').toString('utf8');
  for (const f of FINGERPRINTED) html = html.split(`"${f}"`).join(`"/${f}?v=${v[f]}"`);

  const shell = ['/', ...FINGERPRINTED.map((f) => `/${f}?v=${v[f]}`), '/manifest.webmanifest'];
  const version = hash(html, read('sw.js'), read('manifest.webmanifest'), ...FINGERPRINTED.map((f) => read(f)));
  const sw = read('sw.js').toString('utf8')
    .replace('__VERSION__', version)
    .replace('__SHELL__', JSON.stringify(shell));

  return { html, sw, version, versions: v, fingerprinted: new Set(FINGERPRINTED.map((f) => `/${f}`)) };
}
