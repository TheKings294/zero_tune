import Fastify from 'fastify';
import compress from '@fastify/compress';
import etag from '@fastify/etag';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seed } from './seed.js';

const PAGE_SIZE = 8;
const SITE = fileURLToPath(new URL('../site/', import.meta.url));

export async function buildApp(db) {
  const app = Fastify();
  await app.register(compress);
  await app.register(etag);

  const listQ = db.prepare(`SELECT id, titre, prix_cents, categorie, created_at FROM annonces
    WHERE statut = 'active' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`);
  const countQ = db.prepare("SELECT COUNT(*) AS n FROM annonces WHERE statut = 'active'");
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
    reply.header('Cache-Control', 'no-cache');
  });

  app.get('/api/annonces', async (req, reply) => {
    const asked = Number.parseInt(req.query.page, 10);
    const total = countQ.get().n;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(Number.isNaN(asked) ? 1 : asked, 1), pages);
    const body = memo(`list:${page}`, () => ({
      page, pages, total, items: listQ.all(PAGE_SIZE, (page - 1) * PAGE_SIZE),
    }));
    return reply.type('application/json; charset=utf-8').send(body);
  });

  app.get('/api/annonces/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const row = Number.isInteger(id) ? oneQ.get(id) : undefined;
    if (!row) return reply.code(404).send({ erreur: 'introuvable' });
    return reply.type('application/json; charset=utf-8').send(memo(`one:${id}`, () => row));
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
