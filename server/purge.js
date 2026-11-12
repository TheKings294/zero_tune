// Conservation des données : on ne garde que ce qui sert. Appelé au démarrage puis toutes les 6 h.
const DAY = 24 * 3600 * 1000;

export const RETENTION = {
  closedDays: Number(process.env.RETENTION_CLOSED_DAYS) || 90,      // annonces clôturées
  inactiveDays: Number(process.env.RETENTION_INACTIVE_DAYS) || 365,  // comptes sans connexion
  impactDays: Number(process.env.RETENTION_IMPACT_DAYS) || 730,      // cumuls carbone journaliers
};

export function purge(db, { now = Date.now(), ...custom } = {}) {
  const r = { ...RETENTION, ...custom };
  const iso = (days) => new Date(now - days * DAY).toISOString();
  const out = {};
  db.transaction(() => {
    out.sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now).changes;
    out.annoncesCloturees = db.prepare(`DELETE FROM annonces WHERE statut = 'closed'
      AND COALESCE(closed_at, created_at) < ?`).run(iso(r.closedDays)).changes;
    const inactive = db.prepare('SELECT id FROM users WHERE COALESCE(last_seen_at, created_at) < ?')
      .all(iso(r.inactiveDays)).map((u) => u.id);
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
