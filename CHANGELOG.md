# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versionnement [SemVer](https://semver.org/lang/fr/) :
**MAJOR** = changement incompatible (API, base de données non migrable) · **MINOR** = évolution (nouvelle fonctionnalité) · **PATCH** = correctif.
Chaque version sépare les **évolutions** des **corrections** (RGESN 3.5). Procédure de publication : voir « Versionner » dans le README.

## [Non publié]

### Évolutions
- Écran « Impact environnemental » : tableau comparant le budget de performance (poids, requêtes, temps d'affichage en 3G, EcoIndex) aux mesures réelles de l'équipe, avec le score RGESN (89 %).
- Conteneur à ressources bornées : 256 Mo de mémoire sans swap, 0,5 CPU, 128 processus (`compose.yml`).
- Fichiers statiques précompressés au démarrage (Brotli 11, gzip 9), manifeste avec empreinte, front minifié dans l'image Docker (esbuild, absent de l'image finale) : première visite de ≈ 18,5 Ko à ≈ 16,5 Ko, `app.js` de 11,7 Ko (gzip) à 8,6 Ko (Brotli).
- `npm run budget` : mesure le poids et le nombre de requêtes d'une première visite et échoue au-delà de 500 Ko ou de 14 requêtes ; intégré à la CI GitHub (tests + budget).
- Modèle de pull request avec la case « impact sur le poids et les requêtes ».
- Revue d'écoconception trimestrielle : procédure (`docs/REVUE-ECOCONCEPTION.md`) et ticket créé automatiquement chaque trimestre.
- Évaluation utilité / impact de chaque fonctionnalité dans le brief.
- Dependabot suit aussi les actions GitHub.

### Corrections
- Écran « Impact » : les tableaux qui défilent sont atteignables au clavier (région nommée) ; n'affiche plus « tout vient du cache » quand le navigateur ne renseigne pas `transferSize`.
- Purge : une durée de conservation à `0` est acceptée au lieu de revenir à la valeur par défaut ; un compte ayant une session valide n'est jamais purgé.

## [0.1.0] - 2026-11-12

### Évolutions
- Consultation des annonces (US1) : liste paginée par 8, détail, cache serveur, navigateur et Service Worker, hors connexion.
- Filtre par catégorie et tri par prix (US2) ; contact du vendeur révélé à la demande (US3).
- Comptes sans rôle, inscription et connexion (sessions à cookie `HttpOnly`) ; publication immédiate d'annonces (US4, US6) ; « Mes annonces » et clôture avec boîte de dialogue accessible (US5).
- PWA mobile-first : manifeste, Service Worker, menu mobile « Menu » (icône et texte), palette indigo/ambre conforme RGAA AA (`docs/COULEURS.md`).
- Mesure du coût carbone par visite avec CO2.js (`/api/impact`) et écran « Impact environnemental ».
- RGESN : Node 24 LTS, Dependabot, tâche de purge et durées de conservation configurables, écritures groupées des mesures, cache du total, fichiers statiques à empreinte et cache d'un an, aucun appel `/api/me` pour un visiteur sans compte.
- Déploiement Docker (port 8080, jamais 80/443), hébergement OVHcloud Gravelines déclaré (`/carbon.txt`, `docs/HEBERGEMENT.md`), documentation, licence.

### Corrections
- Image Docker : compilation de `better-sqlite3` quand aucun binaire précompilé n'existe pour l'architecture.
- Mesure CO2 : octets comptés après compression (47 Ko annoncés au lieu de 16 Ko).
- Droits d'écriture du volume `/data` dans le conteneur.
- Bandeau de confirmation non rafraîchi après une déconnexion.
- Script de test compatible Node 22 et plus (motif de fichiers explicite).
