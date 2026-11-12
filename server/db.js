import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function openDb(path = process.env.DB_PATH || 'data/repasse.db') {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  // Migration des bases créées avant l'ajout des colonnes de conservation.
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  if (!cols('users').includes('last_seen_at')) db.exec('ALTER TABLE users ADD COLUMN last_seen_at TEXT');
  if (!cols('annonces').includes('closed_at')) db.exec('ALTER TABLE annonces ADD COLUMN closed_at TEXT');
  return db;
}
