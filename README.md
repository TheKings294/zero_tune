# Repasse — le matériel du lycée passe de main en main

PWA mobile-first de dons et de ventes de matériel scolaire entre élèves, pour le Bureau des Étudiants (BDE). Texte uniquement, sans framework, conçue pour les petits téléphones et les forfaits épuisés. Brief : `docs/brief-repasse-v1.xml` ; spécifications : `docs/SPEC*.md`.

## Gouvernance
| | |
|---|---|
| **Référent numérique responsable** | **À RENSEIGNER** (nom, rôle, contact). Il valide les budgets, les dépendances et l'hébergeur, et déclenche le décommissionnement. |
| **Licence** | **À CHOISIR** par le BDE (ajouter un fichier `LICENSE` et la mention ici avant toute mise en ligne publique). |
| **Hébergeur** | **À RENSEIGNER** : voir « Hébergement » ci-dessous. |

## Lancer
```bash
docker compose up --build        # http://localhost:8080 (jamais 80/443 : un reverse proxy HTTPS se branche devant)
npm ci && SEED_DEMO=1 npm start  # sans Docker (Node ≥ 22 ; .nvmrc = 24 LTS)
npm test                         # 58 tests (node:test, aucune dépendance de test)
```
Comptes de démonstration (si `SEED_DEMO=1`, base vide) : `catherine` / `kevin`, mot de passe `DEMO_PASSWORD` (défaut `demo`) — **à changer ou désactiver en production** (`SEED_DEMO=0`).

| Variable | Défaut | Rôle |
|---|---|---|
| `HOST_PORT` | 8080 | port publié par Docker |
| `COOKIE_SECURE` | 0 | passer à `1` dès que le site est en HTTPS (obligatoire pour la PWA hors `localhost`) |
| `GREEN_HOSTING` | 0 | `1` si l'hébergeur est « vert » (influe sur le calcul CO2.js) |
| `RETENTION_CLOSED_DAYS` | 90 | suppression des annonces clôturées |
| `RETENTION_INACTIVE_DAYS` | 365 | suppression des comptes sans connexion (et de leurs annonces) |
| `RETENTION_IMPACT_DAYS` | 730 | suppression des cumuls carbone journaliers |
| `SEED_DEMO`, `DEMO_PASSWORD` | 1, demo | jeu de démonstration au premier démarrage |

## Budgets (règle la plus stricte du brief)
| Indicateur | Budget | Mesure actuelle |
|---|---|---|
| Poids par page | ≤ 500 Ko | ≈ 15,5 Ko à la 1re visite (gzip) ; ≈ 1 Ko ensuite (Service Worker) |
| Requêtes par page | < 15 | 7 à la 1re visite (page, CSS, JS, manifeste, icône, Service Worker, liste), 1 ensuite ; plus d'appel `/api/me` pour un visiteur sans compte |
| Affichage | < 3 s en 3G, < 1 s en 4G | à mesurer sur Samsung S7 |
| EcoIndex | A ou B | à mesurer sur ecoindex.fr |
| CO2 par 1re visite | ≤ 0,005 g CO2e *(proposition à valider par le référent)* | ≈ 0,0023 g (CO2.js, modèle SWD v4) |
| Accessibilité | RGAA 4.1 AA | code conforme, à auditer |

Le coût carbone réel est visible dans l'interface (pied de page → « Impact environnemental ») et via `GET /api/impact`. Compatibilité visée : iPhone 8 et Samsung S7 (JS sans syntaxe récente, aucune dépendance côté navigateur).

## Données et conservation
Données stockées (SQLite, `data/repasse.db`) : comptes (identifiant, mot de passe haché scrypt, prénom, contact), annonces (texte), sessions, cumuls carbone par jour. Aucun traceur, aucun statistique par visiteur, aucune IP conservée.
Une **tâche de purge** tourne au démarrage puis toutes les 6 h (ou `npm run purge`) :
- sessions expirées, tentatives de connexion périmées (mémoire) ;
- annonces clôturées depuis plus de 90 jours ;
- comptes sans connexion depuis plus de 365 jours, avec leurs annonces ;
- cumuls carbone de plus de 730 jours.

Les durées se règlent par variables d'environnement. Sauvegarde : copier `data/` à froid (`docker compose stop`) ; ne pas conserver de sauvegarde plus longtemps que les durées ci-dessus.

## Mise à jour
- **Dépendances et image** : Dependabot (`.github/dependabot.yml`) ouvre chaque semaine des PR npm et Docker. Node suit une version **LTS** (24 actuellement ; fin de support prévue avril 2028 — à revérifier sur nodejs.org/releases) ; changer `FROM` dans le `Dockerfile`, `.nvmrc` et `engines` ensemble.
- **Procédure** : PR → `npm test` → `docker compose build` → (si possible) tester sur un téléphone ancien → fusion → sur le serveur `git pull && docker compose up -d --build` → vérifier la page, `/api/impact` et le journal (`docker compose logs`).
- **Service Worker** : sa version dérive du contenu des fichiers (empreintes) ; rien à incrémenter. Les fichiers `style.css`, `app.js`, `icon.svg` sont servis avec empreinte (`?v=…`) et cache d'un an. Redémarrer le serveur après modification de `site/`.
- **Retour arrière** : `git revert` puis même procédure ; la base est compatible (migrations additives dans `server/db.js`).

## Hébergement
Choisir l'hébergeur selon : localisation (Union européenne), électricité renouvelable et PUE publiés, certifications ou rapport environnemental, sobriété de l'offre (petite VM suffisante : un conteneur, SQLite). Vérifier avec `npm run hosting:check -- <domaine>` (Green Web Foundation) et reporter le résultat dans `GREEN_HOSTING`.
Fiche à compléter : hébergeur **À RENSEIGNER** · pays · source d'énergie · justificatif (lien) · date de vérification.

## Décommissionnement
1. Décision du référent et annonce aux utilisateurs (date de fermeture, 30 jours de préavis conseillés).
2. Mettre le site en lecture seule ou afficher une page de fermeture ; supprimer les annonces et comptes (`docker compose down -v`, puis supprimer `data/` et toute sauvegarde).
3. Supprimer le nom de domaine, les certificats, le serveur ou la VM, et les clés/secrets associés.
4. Archiver le dépôt (code et documentation, sans données personnelles).
5. Noter la date et l'auteur du décommissionnement dans ce fichier.
