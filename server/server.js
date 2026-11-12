import Fastify from 'fastify';
import compress from '@fastify/compress';
import etag from '@fastify/etag';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { DUMMY_HASH, hashPassword, newToken, tokenHash, verifyPassword } from './auth.js';
import { CATEGORIES, validateAnnonce, validateRegister } from './validate.js';

const PAGE_SIZE = 8;
const SESSION_MS = 7 * 24 * 3600 * 1000;
const COOKIE = 'rp_session';
const ORDER = {
  recent: 'created_at DESC, id DESC',
  prix: 'COALESCE(prix_cents, 0) ASC, created_at DESC, id DESC',
};
const SITE = fileURLToPath(new URL('../site/', import.meta.url));

export async function buildApp(db) {
  // Requêtes allégées : texte uniquement, 16 Ko maximum ; seul application/json est accepté (415 sinon, ce qui bloque aussi les formulaires venus d'un autre site).
  const app = Fastify({ bodyLimit: 16 * 1024 });
  await app.register(compress);
  await app.register(etag);
  await app.register(cookie);

  // Filtre catégorie facultatif ; ORDER vient d'une liste fermée (jamais d'une entrée brute).
  const listQ = {};
  for (const tri of Object.keys(ORDER)) {
    listQ[tri] = db.prepare(`SELECT id, titre, prix_cents, categorie, created_at FROM annonces
      WHERE statut = 'active' AND (@cat IS NULL OR categorie = @cat)
      ORDER BY ${ORDER[tri]} LIMIT @limit OFFSET @offset`);
  }
  const count = db.prepare(`SELECT COUNT(*) AS n FROM annonces
    WHERE statut = 'active' AND (@cat IS NULL OR categorie = @cat)`);
  const oneQ = db.prepare(`SELECT a.id, a.titre, a.description, a.prix_cents, a.categorie, a.created_at,
      u.first_name AS vendeur
    FROM annonces a JOIN users u ON u.id = a.user_id
    WHERE a.id = ? AND a.statut = 'active'`);

  // Cache mémoire : vidé à chaque écriture (US4/US5 appelleront app.invalidate()).
  const cache = new Map();
  app.decorate('invalidate', () => cache.clear());
  const memo = (key, build) => {
    if (!cache.has(key)) cache.set(key, JSON.stringify(build()));
    return cache.get(key);
  };

  app.addHook('onSend', async (req, reply) => {
    // Toujours revalider (ETag → 304) : le Service Worker et localStorage gèrent la durée.
    if (!reply.hasHeader('Cache-Control')) reply.header('Cache-Control', 'no-cache');
  });

  app.get('/api/annonces', async (req, reply) => {
    const cat = req.query.categorie || null;
    const tri = req.query.tri || 'recent';
    if ((cat !== null && !CATEGORIES.includes(cat)) || !(tri in ORDER)) {
      return reply.code(400).send({ erreur: 'paramètre invalide' });
    }
    const asked = Number.parseInt(req.query.page, 10);
    const total = count.get({ cat }).n;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(Number.isNaN(asked) ? 1 : asked, 1), pages);
    const body = memo(`list:${cat}:${tri}:${page}`, () => ({
      page, pages, total, categorie: cat, tri,
      items: listQ[tri].all({ cat, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    }));
    return reply.type('application/json; charset=utf-8').send(body);
  });

  app.get('/api/annonces/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const row = Number.isInteger(id) ? oneQ.get(id) : undefined;
    if (!row) return reply.code(404).send({ erreur: 'introuvable' });
    return reply.type('application/json; charset=utf-8').send(memo(`one:${id}`, () => row));
  });

  // Contact : lu à la demande seulement (US3), jamais mis en cache.
  const contactQ = db.prepare(`SELECT u.contact_type AS type, u.contact_value AS valeur
    FROM annonces a JOIN users u ON u.id = a.user_id
    WHERE a.id = ? AND a.statut = 'active'`);
  app.get('/api/annonces/:id/contact', async (req, reply) => {
    const id = Number(req.params.id);
    const row = Number.isInteger(id) ? contactQ.get(id) : undefined;
    reply.header('Cache-Control', 'no-store');
    if (!row) return reply.code(404).send({ erreur: 'introuvable' });
    return reply.type('application/json; charset=utf-8').send(row);
  });

  // ---- comptes (sans rôle) et sessions ----
  const secure = process.env.COOKIE_SECURE === '1';
  const setSession = (reply, userId) => {
    const token = newToken();
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(tokenHash(token), userId, Date.now() + SESSION_MS);
    reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: SESSION_MS / 1000 });
  };
  const sessionQ = db.prepare(`SELECT u.id, u.username, u.first_name, u.contact_type, u.contact_value
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`);
  const currentUser = (req) => {
    const t = req.cookies[COOKIE];
    return t ? sessionQ.get(tokenHash(t), Date.now()) : undefined;
  };
  const publicUser = (u) => ({
    username: u.username, prenom: u.first_name, contact: { type: u.contact_type, valeur: u.contact_value },
  });
  const requireUser = async (req, reply) => {
    req.user = currentUser(req);
    if (!req.user) return reply.code(401).send({ erreur: 'connexion requise' });
  };

  // Freinage des essais de connexion : 10 échecs / 15 min / adresse.
  const fails = new Map();
  const tooMany = (ip) => (fails.get(ip) || []).filter((t) => t > Date.now() - 15 * 60000).length >= 10;
  const addFail = (ip) => fails.set(ip, [...(fails.get(ip) || []).filter((t) => t > Date.now() - 15 * 60000), Date.now()]);

  const userById = db.prepare('SELECT * FROM users WHERE id = ?');

  app.get('/api/me', async (req, reply) => {
    const u = currentUser(req);
    reply.header('Cache-Control', 'no-store');
    return reply.type('application/json; charset=utf-8').send({ user: u ? publicUser(u) : null });
  });

  app.post('/api/register', async (req, reply) => {
    const { errors, value: v } = validateRegister(req.body);
    if (Object.keys(errors).length) return reply.code(422).send({ erreurs: errors });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(v.username)) {
      return reply.code(409).send({ erreurs: { username: 'Cet identifiant est déjà pris.' } });
    }
    const id = db.prepare(`INSERT INTO users (username, password_hash, first_name, contact_type, contact_value)
      VALUES (?, ?, ?, ?, ?)`).run(v.username, hashPassword(v.password), v.prenom, v.type, v.contact).lastInsertRowid;
    setSession(reply, id);
    reply.header('Cache-Control', 'no-store');
    return reply.code(201).send({ user: publicUser(userById.get(id)) });
  });

  app.post('/api/login', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (tooMany(req.ip)) return reply.code(429).send({ erreur: 'Trop d’essais. Réessayez dans quelques minutes.' });
    const b = req.body || {};
    const row = typeof b.username === 'string'
      ? db.prepare('SELECT * FROM users WHERE username = ?').get(b.username.trim().toLowerCase()) : undefined;
    const ok = verifyPassword(typeof b.password === 'string' ? b.password : '', row ? row.password_hash : DUMMY_HASH);
    if (!row || !ok) {
      addFail(req.ip);
      return reply.code(401).send({ erreur: 'Identifiant ou mot de passe incorrect.' });
    }
    setSession(reply, row.id);
    return { user: publicUser(row) };
  });

  app.post('/api/logout', async (req, reply) => {
    const t = req.cookies[COOKIE];
    if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(t));
    reply.clearCookie(COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  // ---- publication (US4/US6) : immédiate, sans modération ----
  app.post('/api/annonces', { preHandler: requireUser }, async (req, reply) => {
    const { errors, value: v } = validateAnnonce(req.body);
    if (Object.keys(errors).length) return reply.code(422).send({ erreurs: errors });
    const id = db.prepare(`INSERT INTO annonces (user_id, titre, description, prix_cents, categorie)
      VALUES (?, ?, ?, ?, ?)`).run(req.user.id, v.titre, v.description, v.prixCents, v.categorie).lastInsertRowid;
    app.invalidate();
    return reply.code(201).send({ id });
  });

  await app.register(fastifyStatic, {
    root: SITE,
    cacheControl: false,
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb();
  // Démo : jeu d'annonces au premier démarrage seulement (base vide).
  if (process.env.SEED_DEMO === '1' && db.prepare('SELECT COUNT(*) n FROM users').get().n === 0) seed(db);
  const app = await buildApp(db);
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
}
