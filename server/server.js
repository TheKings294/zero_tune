import Fastify from 'fastify';
import compress from '@fastify/compress';
import etag from '@fastify/etag';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seed } from './seed.js';

const PAGE_SIZE = 8;
export const CATEGORIES = ['Mathématiques', 'Français', 'Langues', 'Sciences', 'Histoire-Géo',
  'Informatique', 'Calculatrices', 'Fournitures', 'Livres', 'Autre'];
const ORDER = {
  recent: 'created_at DESC, id DESC',
  prix: 'COALESCE(prix_cents, 0) ASC, created_at DESC, id DESC',
};
const SITE = fileURLToPath(new URL('../site/', import.meta.url));

export async function buildApp(db) {
  const app = Fastify();
  await app.register(compress);
  await app.register(etag);

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
    reply.header('Cache-Control', 'no-cache');
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
