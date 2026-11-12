import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { buildApp } from './server.js';

let app, db;
before(async () => {
  db = openDb(':memory:');
  seed(db);
  app = await buildApp(db);
});

const get = async (url, headers) => app.inject({ url, headers });

test('liste : 8 annonces, 3 pages, 20 au total', async () => {
  const res = await get('/api/annonces');
  const body = res.json();
  assert.equal(res.statusCode, 200);
  assert.equal(body.items.length, 8);
  assert.deepEqual([body.page, body.pages, body.total], [1, 3, 20]);
});

test('liste : de la plus récente à la plus ancienne, sans description ni contact', async () => {
  const { items } = (await get('/api/annonces')).json();
  const dates = items.map((i) => i.created_at);
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal(items[0].titre, 'Calculatrice graphique TI-83 Premium CE');
  assert.ok(!('description' in items[0]) && !('contact_value' in items[0]));
});

test('liste : page 3 contient les 4 dernières, page hors bornes ramenée dans les bornes', async () => {
  assert.equal((await get('/api/annonces?page=3')).json().items.length, 4);
  assert.equal((await get('/api/annonces?page=99')).json().page, 3);
  assert.equal((await get('/api/annonces?page=abc')).json().page, 1);
});

test('liste : une annonce clôturée n’apparaît pas', async () => {
  db.prepare("UPDATE annonces SET statut = 'closed' WHERE titre LIKE 'Clé USB%'").run();
  app.invalidate();
  const body = (await get('/api/annonces?page=1')).json();
  assert.equal(body.total, 19);
  assert.ok(!JSON.stringify(body).includes('Clé USB'));
  db.prepare("UPDATE annonces SET statut = 'active' WHERE titre LIKE 'Clé USB%'").run();
  app.invalidate();
});

test('liste vide : items vide, 1 page', async () => {
  const empty = openDb(':memory:');
  const a = await buildApp(empty);
  const body = (await a.inject({ url: '/api/annonces' })).json();
  assert.deepEqual([body.items.length, body.total, body.pages], [0, 0, 1]);
});

test('détail : description et prénom du vendeur, jamais le contact', async () => {
  const { id } = (await get('/api/annonces')).json().items[1];
  const res = await get(`/api/annonces/${id}`);
  const body = res.json();
  assert.equal(res.statusCode, 200);
  assert.equal(body.vendeur, 'Catherine');
  assert.ok(body.description.length > 0);
  assert.ok(!/contact|@exemple|06 /.test(res.body));
});

test('détail : 404 si inconnue, invalide ou clôturée', async () => {
  assert.equal((await get('/api/annonces/99999')).statusCode, 404);
  assert.equal((await get('/api/annonces/abc')).statusCode, 404);
  const { id } = (await get('/api/annonces')).json().items[0];
  db.prepare("UPDATE annonces SET statut = 'closed' WHERE id = ?").run(id);
  app.invalidate();
  assert.equal((await get(`/api/annonces/${id}`)).statusCode, 404);
});

test('cache HTTP : ETag + no-cache, 304 sur If-None-Match', async () => {
  const first = await get('/api/annonces?page=2');
  assert.equal(first.headers['cache-control'], 'no-cache');
  assert.ok(first.headers.etag);
  const second = await get('/api/annonces?page=2', { 'if-none-match': first.headers.etag });
  assert.equal(second.statusCode, 304);
});

test('compression : gzip/brotli si demandé', async () => {
  const res = await get('/api/annonces', { 'accept-encoding': 'gzip' });
  assert.equal(res.headers['content-encoding'], 'gzip');
});

test('schéma : contact dans users, pas dans annonces', () => {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  assert.ok(cols('users').includes('contact_value'));
  assert.ok(!cols('annonces').includes('contact_value'));
});
