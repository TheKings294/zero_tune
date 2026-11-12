# SPEC — Repasse V1 · US-01 « Consulter les annonces »

Source : `brief-repasse-v1.xml` (US1, écrans `accueil` + `detail`, sections technique, performance, accessibilité) et la maquette. Persona guide : Kevin (téléphone de 15 ans, 4G épuisée, discrétion). Règle d'arbitrage : la plus stricte. Login/register : US4/US5.

## 1. Architecture
- **PWA mobile-first**, accessible par lien, sans installation obligatoire : `manifest.webmanifest` (nom, `display: standalone`, couleur d'accent, une icône SVG de < 1 Ko) + **Service Worker** `sw.js`. Front HTML/CSS/JS vanilla, sans framework ni build, compatible Samsung S7 et iPhone 8 (JS ES2017 sans syntaxe récente, pas de `color-mix`/`dialog`).
- **Un conteneur** Node.js + Fastify : API JSON + fichiers de `site/` (pas de nginx). **SQLite** (`better-sqlite3`) sur volume Docker : pas de second conteneur, sobre ; migrable vers PostgreSQL.
- **Comptes sans rôle** : table `users`, mots de passe hachés. Aucune route d'auth en US-01.
- **API** : `GET /api/annonces?page=N` (8 par page, `statut='active'`, `created_at DESC`, sans description) → `{page, pages, total, items[]}` ; `GET /api/annonces/:id` (description + prénom du vendeur ; le contact vient de `users` mais n'est **pas renvoyé**, US3) → `404` si absente ou clôturée. Pagination uniquement, jamais de défilement infini.
- **Cache, 4 niveaux** : mémoire serveur (invalidée à l'écriture) · gzip/brotli + `ETag` (`304` quasi vide) · **Service Worker** : coquille (html, css, js, manifest) en cache-first, API réseau d'abord (liste toujours fraîche) avec cache en secours hors connexion · `localStorage`, valable 5 min : retour à la liste = 0 requête.
- **Docker** : `Dockerfile` (Node alpine, non-root) + `compose.yml`, service `app`, port interne 3000 publié sur **8080** (`HOST_PORT`, jamais 80/443), volume `./data:/data`, `restart: unless-stopped`.
- **Cibles (DoD verte)** : < 500 Ko · < 15 requêtes (visé : 7) · affichage < 3 s en 3G / < 1 s en 4G · EcoIndex A/B (DOM < 300 nœuds, 8 cartes) · aucune ressource chargée sans être utilisée. Mesure : F12 Réseau, Samsung S7, ecoindex.fr.

## 2. Fichiers
`server/{server.js, db.js, schema.sql, seed.js}` · `site/{index.html, style.css, app.js, sw.js, manifest.webmanifest, icon.svg}` · `Dockerfile` · `compose.yml`.
**Tables** — `users`(id, username unique, password_hash, first_name, contact_type `email|tel`, contact_value, created_at) · `annonces`(id, user_id → users, titre ≤ 80, description ≤ 1000, prix_cents NULL = don, categorie parmi les 10 du brief, statut `active|closed`, created_at) ; index `(statut, created_at DESC)`. **Seed** : 20 annonces texte seul, ≈ 1/3 « Don », autres de 1 à 40 €, dates variées, comptes `catherine` (3 annonces actives) et `kevin` (aucune), chacun avec son contact unique (email ou téléphone), mot de passe de démo à changer en production.

## 3. Écrans (charte : fond clair, accent vert foncé, police système, corps ≥ 16 px, mode clair seul, aucune image/animation)
**Liste** (`<title>` « Annonces — Repasse ») — lien d'évitement « Aller au contenu » ; `header` (nom, baseline) ; `nav` ; `main` : `h1` « Annonces du lycée », `h2` « 20 annonces · page 1 sur 3 » (`role="status"`), cartes `<a>` entières (`h3` titre, prix ou badge texte « Don », catégorie, date relative) ; `nav` pagination Précédent / 1 / 2 / 3 / Suivant (`aria-current`, style distinct) ; ligne discrète « Liste chargée depuis le cache — aucune nouvelle requête » ; `footer` « Repasse · un service du BDE ».
**Détail** (`<title>` « {titre} — Repasse ») — `h1` titre ; prix ou « Don », catégorie, date, prénom du vendeur, `h2` Description ; lien « Retour aux annonces » (garde la page).
**États** — *Vide* : « Aucune annonce en ligne pour le moment. Revenez plus tard. » · *Introuvable* (`404`) : « Cette annonce n'existe plus ou a été clôturée. » + retour · *Hors connexion* : cache présent → liste + « Hors connexion — dernière liste enregistrée » ; absent → « Vous êtes hors connexion et la liste n'a jamais été chargée. » + « Réessayer » · *Erreur serveur* : « Service indisponible, réessayez plus tard. »
**RGAA 4.1 AA** — `lang="fr"`, h1>h2>h3, landmarks, contraste ≥ 4,5:1 (3:1 composants, focus visible), tout au clavier, éléments natifs, cibles ≥ 44 × 44 px, 320 px sans scroll horizontal, zoom 200 %, états annoncés via `aria-live`, « Don » jamais par la couleur seule.

## 4. À retirer de la maquette
React, ReactDOM, `dc-runtime` (46 Ko mesurés, React ≈ 140 Ko estimés) · connexion, publier, mes annonces, dialogue, bandeau, session, bouton « Se connecter » (US4/5) · filtre, tri, bouton contact (US2/US3) · panneau Performance et son lien de pied de page (valeurs de démo ; remplacé par les mesures réelles) · badge « Nouveau », annonce clôturée (id 16), 1 annonce en trop (22 → 20) · données en dur dans le JS (→ `seed.js`) · simulation du cache (→ vrai Service Worker).

## 5. Critère Gherkin → élément
| Scénario | Élément vérifiable |
|---|---|
| Affichage de la liste | `GET /api/annonces` → `ul` de cartes + `h2` ; état vide si 0 |
| Détail d'une annonce | carte `<a href="#annonce-N">` → `GET /api/annonces/N` → `h1` + description ; `404` → message |
| Mise en cache de la liste | écriture `localStorage` + Cache Storage (SW) ; `ETag` renvoyé |
| Affichage depuis le cache | retour liste < 5 min : 0 requête ; au-delà : `If-None-Match` → `304` ; ligne « depuis le cache » ; hors connexion OK |
| Actives, récentes d'abord | `WHERE statut='active' ORDER BY created_at DESC` |

## 6. Poids estimé (≤ 500 Ko, 7 requêtes)
`index.html` 3 Ko · `style.css` 5 Ko · `app.js` 6 Ko · `sw.js` 1 Ko · `manifest` 0,5 Ko · `icon.svg` 0,5 Ko · API liste 3 Ko gzip. **Total ≈ 19 Ko** (détail : +1 Ko, 8 requêtes). Image Docker ≈ 380 Mo (mesurée), hors budget page.
