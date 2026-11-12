# Repasse — le matériel du lycée passe de main en main

PWA mobile-first de dons et de ventes de matériel scolaire entre élèves, pour le Bureau des Étudiants (BDE). Texte uniquement, sans framework, conçue pour les petits téléphones et les forfaits épuisés. Brief : `docs/brief-repasse-v1.xml` ; spécifications : `docs/SPEC*.md`.

## Gouvernance
| | |
|---|---|
| **Référent numérique responsable** | Nathan Chabalier nathan.chabalier@possessio.fr |
| **Licence** | MIT |
| **Hébergeur** | OVHCloud |

## Lancer
```bash
docker compose up --build        # http://localhost:8080 (jamais 80/443 : un reverse proxy HTTPS se branche devant)
npm ci && SEED_DEMO=1 npm start  # sans Docker (Node ≥ 22 ; .nvmrc = 24 LTS)
npm test                         # 64 tests (node:test, aucune dépendance de test)
npm run budget                   # poids et requêtes d'une 1re visite (échoue au-delà de 500 Ko ou de 14 requêtes)
npm run build                    # front minifié dans dist/site/ (fait par le Dockerfile, pas nécessaire en local)
```
Comptes de démonstration (si `SEED_DEMO=1`, base vide) : `catherine` / `kevin`, mot de passe `DEMO_PASSWORD` (défaut `demo`) — **à changer ou désactiver en production** (`SEED_DEMO=0`).

| Variable | Défaut | Rôle |
|---|---|---|
| `HOST_PORT` | 8080 | port publié par Docker |
| `COOKIE_SECURE` | 0 | passer à `1` dès que le site est en HTTPS (obligatoire pour la PWA hors `localhost`) |
| `GREEN_HOSTING` | 1 | `1` si l'hébergeur est « vert » (influe sur le calcul CO2.js) |
| `APP_MEM_LIMIT`, `APP_CPUS` | 256m, 0.5 | limites de mémoire (sans swap) et de CPU du conteneur (`compose.yml`) |
| `RETENTION_CLOSED_DAYS` | 90 | suppression des annonces clôturées (`0` = ne rien garder) |
| `RETENTION_INACTIVE_DAYS` | 365 | suppression des comptes sans connexion et de leurs annonces (`0` = tous, sauf ceux qui ont une session valide) |
| `RETENTION_IMPACT_DAYS` | 730 | suppression des cumuls carbone journaliers |
| `SEED_DEMO`, `DEMO_PASSWORD` | 1, demo | jeu de démonstration au premier démarrage |

## Budgets (règle la plus stricte du brief)
| Indicateur | Budget | Mesure actuelle |
|---|---|---|
| Poids par page | ≤ 500 Ko | ≈ 16,5 Ko à la 1re visite (Brotli, mesuré par `npm run budget`) ; ≈ 1 Ko ensuite (Service Worker) |
| Requêtes par page | < 15 | 7 à la 1re visite (page, manifeste, icône, CSS, JS, Service Worker, liste), 1 ensuite ; plus d'appel `/api/me` pour un visiteur sans compte |
| Affichage | < 3 s en 3G, < 1 s en 4G | à mesurer sur Samsung S7 |
| EcoIndex | A ou B | à mesurer sur ecoindex.fr |
| CO2 par 1re visite | ≤ 0,005 g CO2e *(proposition à valider par le référent)* | ≈ 0,0020 g (CO2.js, modèle SWD v4) |
| Accessibilité | RGAA 4.1 AA | code conforme, à auditer |

Le coût carbone réel est visible dans l'interface (pied de page → « Impact environnemental ») et via `GET /api/impact`. Compatibilité visée : iPhone 8 et Samsung S7 (JS sans syntaxe récente, aucune dépendance côté navigateur).

## Données et conservation
Données stockées (SQLite, `data/repasse.db`) : comptes (identifiant, mot de passe haché scrypt, prénom, contact), annonces (texte), sessions, cumuls carbone par jour. Aucun traceur, aucun statistique par visiteur, aucune IP conservée.
Une **tâche de purge** tourne au démarrage puis toutes les 6 h (ou `npm run purge`) :
- sessions expirées, tentatives de connexion périmées (mémoire) ;
- annonces clôturées depuis plus de 90 jours ;
- comptes sans connexion depuis plus de 365 jours, avec leurs annonces ;
- cumuls carbone de plus de 730 jours.

Les durées se règlent par variables d'environnement ; `0` signifie « ne rien garder » (un compte avec une session valide n'est jamais purgé). Sauvegarde : copier `data/` à froid (`docker compose stop`) ; ne pas conserver de sauvegarde plus longtemps que les durées ci-dessus.

## Mise à jour
- **Dépendances et image** : Dependabot (`.github/dependabot.yml`) ouvre chaque semaine des PR npm et Docker. Node suit une version **LTS** (24 actuellement ; fin de support prévue avril 2028 — à revérifier sur nodejs.org/releases) ; changer `FROM` dans le `Dockerfile`, `.nvmrc` et `engines` ensemble.
- **Procédure** : PR → `npm test` → `docker compose build` → (si possible) tester sur un téléphone ancien → fusion → sur le serveur `git pull && docker compose up -d --build` → vérifier la page, `/api/impact` et le journal (`docker compose logs`).
- **Service Worker** : sa version dérive du contenu des fichiers (empreintes) ; rien à incrémenter. Les fichiers `style.css`, `app.js`, `icon.svg` et le manifeste sont servis avec empreinte (`?v=…`) et cache d'un an. Ils sont précompressés (Brotli, gzip) au démarrage. Redémarrer le serveur après modification de `site/`.
- **Minification** : l'image Docker minifie `app.js` et `style.css` avec esbuild (`npm run build`, dépendance de développement absente de l'image finale) ; les sources de `site/` restent lisibles.
- **Retour arrière** : `git revert` puis même procédure ; la base est compatible (migrations additives dans `server/db.js`).

## Ressources du conteneur
`compose.yml` borne le conteneur : 256 Mo de mémoire sans swap (un dépassement redémarre le conteneur au lieu de ralentir la machine), 0,5 CPU, 128 processus. Mesuré après 300 pages et 5 connexions : ≈ 50 Mo de RAM et 0,03 % de CPU. Réglable par `APP_MEM_LIMIT` et `APP_CPUS` ; réévalué à chaque revue d'écoconception.

## Processus
- **Versionner** : SemVer, un tag `vX.Y.Z` par livraison et un `CHANGELOG.md` qui sépare les **évolutions** des **corrections**. Publier : déplacer « Non publié » sous le nouveau numéro dans `CHANGELOG.md`, puis `npm version <patch|minor|major>` (crée le commit et le tag `vX.Y.Z`), puis `git push --follow-tags`. PATCH = correctif, MINOR = évolution, MAJOR = changement incompatible (API, base de données non migrable).
- **Pull request** : le modèle `.github/pull_request_template.md` demande l'impact sur le poids et les requêtes (`npm run budget`), les nouvelles dépendances, données et points RGAA. La CI (`.github/workflows/ci.yml`) lance les tests et le budget.
- **Nouvelle fonctionnalité** : son évaluation utilité / impact est ajoutée au brief (`docs/brief-repasse-v1.xml`, section `evaluation-utilite-impact`) avant le développement.
- **Revue d'écoconception trimestrielle** : un ticket est créé les 1er janvier, avril, juillet et octobre ; procédure, seuils d'alerte et journal dans `docs/REVUE-ECOCONCEPTION.md`.

## Hébergement
**Hébergeur : OVHcloud, datacenter de Gravelines (France).** PUE 1,21, WUE 0,20 L/kWh, énergie 100 % renouvelable déclarée (exercice 2025). Fiche et justificatifs RGESN (critères 2.8 et 8.1 à 8.7) : `docs/HEBERGEMENT.md`.
- **Déclaration** : `site/carbon.txt`, servi à `/carbon.txt` (standard carbon.txt de la Green Web Foundation, hébergeur en amont `ovhcloud.com`).
- **Calcul CO2.js** : `GREEN_HOSTING=1` (défaut du `compose.yml`) car `ovhcloud.com` est référencé « vert » par la Green Web Foundation (vérifié le 12/11/2026 : `npm run hosting:check -- ovhcloud.com`). À revérifier à chaque changement d'offre ou de datacenter, et avec le domaine réel du site une fois connu.
- **Critères de choix** : localisation dans l'Union européenne, électricité renouvelable et PUE publiés, sobriété de l'offre (petite VM suffisante : un conteneur, SQLite).

## Décommissionnement
1. Décision du référent et annonce aux utilisateurs (date de fermeture, 30 jours de préavis conseillés).
2. Mettre le site en lecture seule ou afficher une page de fermeture ; supprimer les annonces et comptes (`docker compose down -v`, puis supprimer `data/` et toute sauvegarde).
3. Supprimer le nom de domaine, les certificats, le serveur ou la VM, et les clés/secrets associés.
4. Archiver le dépôt (code et documentation, sans données personnelles).
5. Noter la date et l'auteur du décommissionnement dans ce fichier.
