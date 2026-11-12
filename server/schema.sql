CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  contact_type  TEXT NOT NULL CHECK (contact_type IN ('email', 'tel')),
  contact_value TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at  TEXT                    -- dernière connexion/activité (purge des comptes inactifs)
);

CREATE TABLE IF NOT EXISTS annonces (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  titre       TEXT NOT NULL CHECK (length(titre) BETWEEN 1 AND 80),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  prix_cents  INTEGER CHECK (prix_cents IS NULL OR prix_cents > 0),
  categorie   TEXT NOT NULL CHECK (categorie IN (
    'Mathématiques', 'Français', 'Langues', 'Sciences', 'Histoire-Géo',
    'Informatique', 'Calculatrices', 'Fournitures', 'Livres', 'Autre')),
  statut      TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'closed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at   TEXT                    -- date de clôture (purge des annonces clôturées)
);

CREATE INDEX IF NOT EXISTS idx_annonces_statut_date ON annonces (statut, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- Impact carbone (CO2.js, modèle Sustainable Web Design) : cumul par jour, aucune donnée personnelle.
CREATE TABLE IF NOT EXISTS impact (
  jour     TEXT PRIMARY KEY,           -- AAAA-MM-JJ (UTC)
  visites  INTEGER NOT NULL DEFAULT 0, -- chargements de la page d'accueil (GET /)
  requetes INTEGER NOT NULL DEFAULT 0,
  octets   INTEGER NOT NULL DEFAULT 0, -- octets réellement envoyés (corps compressé + en-têtes)
  co2_g    REAL    NOT NULL DEFAULT 0
);
