// Conservation des données : on ne garde que ce qui sert. Appelé au démarrage puis toutes les 6 h.
const DAY = 24 * 3600 * 1000;

// Durée en jours lue dans l'environnement. 0 est une valeur valide (« ne rien garder ») ;
// seule une valeur absente, vide, négative ou non numérique retombe sur le défaut.
export function readDays(raw, fallback) {
  if (raw === undefined || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function readRetention(env = process.env) {
  return {
    closedDays: readDays(env.RETENTION_CLOSED_DAYS, 90),      // annonces clôturées
    inactiveDays: readDays(env.RETENTION_INACTIVE_DAYS, 365), // comptes sans connexion
    impactDays: readDays(env.RETENTION_IMPACT_DAYS, 730),     // cumuls carbone journaliers
  };
}

export const RETENTION = readRetention();

export function purge(db, { now = Date.now(), ...custom } = {}) {
  const r = { ...RETENTION, ...custom };
  const iso = (days) => new Date(now - days * DAY).toISOString();
  const out = {};
  db.transaction(() => {
    out.sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now).changes;
    out.annoncesCloturees = db.prepare(`DELETE FROM annonces WHERE statut = 'closed'
      AND COALESCE(closed_at, created_at) < ?`).run(iso(r.closedDays)).changes;
    // Un compte qui a une session valide n'est jamais purgé (utile quand la durée est 0).
    const inactive = db.prepare(`SELECT id FROM users WHERE COALESCE(last_seen_at, created_at) < ?
      AND id NOT IN (SELECT user_id FROM sessions WHERE expires_at > ?)`)
      .all(iso(r.inactiveDays), now).map((u) => u.id);
    out.annoncesDeComptes = 0;
    for (const id of inactive) {
      out.annoncesDeComptes += db.prepare('DELETE FROM annonces WHERE user_id = ?').run(id).changes;
      db.prepare('DELETE FROM users WHERE id = ?').run(id); // les sessions suivent (ON DELETE CASCADE)
    }
    out.comptes = inactive.length;
    out.impact = db.prepare('DELETE FROM impact WHERE jour < ?').run(iso(r.impactDays).slice(0, 10)).changes;
  })();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { openDb } = await import('./db.js');
  console.log('purge :', JSON.stringify(purge(openDb())));
}
