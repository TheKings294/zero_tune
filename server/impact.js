import { co2 } from '@tgwf/co2';

// Modèle Sustainable Web Design v4 de CO2.js : grammes de CO2e pour un nombre d'octets transférés.
export function createMeter(db, { green = process.env.GREEN_HOSTING === '1' } = {}) {
  const swd = new co2({ model: 'swd', version: 4 });
  const upsert = db.prepare(`INSERT INTO impact (jour, visites, requetes, octets, co2_g) VALUES (@jour, @v, @r, @o, @g)
    ON CONFLICT (jour) DO UPDATE SET visites = visites + @v, requetes = requetes + @r,
      octets = octets + @o, co2_g = co2_g + @g`);
  const rows = db.prepare('SELECT jour, visites, requetes, octets, co2_g FROM impact ORDER BY jour DESC LIMIT ?');
  const total = db.prepare(`SELECT COALESCE(SUM(visites), 0) AS visites, COALESCE(SUM(requetes), 0) AS requetes,
    COALESCE(SUM(octets), 0) AS octets, COALESCE(SUM(co2_g), 0) AS co2_g FROM impact`);

  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

  // Écritures groupées : les mesures s'accumulent en mémoire et partent en une seule transaction.
  const pending = new Map();
  const flush = db.transaction(() => {
    for (const [jour, p] of pending) upsert.run({ jour, ...p });
    pending.clear();
  });

  return {
    perByte: (bytes) => swd.perByte(bytes, green),
    record(bytes, isVisit) {
      const jour = new Date().toISOString().slice(0, 10);
      const p = pending.get(jour) || { v: 0, r: 0, o: 0, g: 0 };
      p.v += isVisit ? 1 : 0; p.r += 1; p.o += bytes; p.g += swd.perByte(bytes, green);
      pending.set(jour, p);
    },
    flush: () => { if (pending.size) flush(); },
    summary(days = 30) {
      if (pending.size) flush();
      const t = total.get();
      return {
        modele: 'Sustainable Web Design v4 (CO2.js)',
        hebergement_vert: green,
        visites: t.visites, requetes: t.requetes, octets: t.octets,
        co2_g: round(t.co2_g, 4),
        // Une visite = un chargement de l'accueil ; on y rattache toutes les requêtes mesurées.
        co2_g_par_visite: t.visites ? round(t.co2_g / t.visites, 5) : null,
        octets_par_visite: t.visites ? Math.round(t.octets / t.visites) : null,
        jours: rows.all(days).map((r) => ({
          jour: r.jour, visites: r.visites, requetes: r.requetes, octets: r.octets, co2_g: round(r.co2_g, 4),
          co2_g_par_visite: r.visites ? round(r.co2_g / r.visites, 5) : null,
        })),
      };
    },
  };
}

// Compte les octets réellement écrits sur la réponse (donc après compression), en-têtes estimés compris.
export function meterHook(meter) {
  const size = (chunk, enc) => {
    if (chunk == null || typeof chunk === 'function') return 0;
    return typeof chunk === 'string' ? Buffer.byteLength(chunk, typeof enc === 'string' ? enc : 'utf8') : chunk.length;
  };
  return (req, reply, done) => {
    const url = req.url.split('?')[0];
    if ((req.method !== 'GET' && req.method !== 'POST') || url === '/api/impact') return done(); // ne se mesure pas lui-même
    const raw = reply.raw;
    const write = raw.write.bind(raw);
    const end = raw.end.bind(raw);
    let bytes = 0;
    raw.write = (chunk, enc, cb) => { bytes += size(chunk, enc); return write(chunk, enc, cb); };
    raw.end = (chunk, enc, cb) => { bytes += size(chunk, enc); return end(chunk, enc, cb); };
    raw.once('finish', () => {
      let head = 17; // ligne de statut
      const h = raw.getHeaders();
      for (const k of Object.keys(h)) head += k.length + String(h[k]).length + 4;
      meter.record(head + bytes, req.method === 'GET' && url === '/');
    });
    done();
  };
}
