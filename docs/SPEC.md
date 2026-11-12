# SPEC — Repasse V1 · US-01 « Consulter les annonces »

Source : `brief-repasse-v1.xml` (US1, écrans `accueil` + `detail`) et la maquette HTML. Budget : ≤ 500 Ko et ≤ 15 requêtes par page.

## 1. Architecture
- Site statique dans `site/`, HTML + CSS + JS vanilla, aucun framework, aucun build.
- Données : un seul `annonces.json` (annonces actives uniquement, déjà triées de la plus récente à la plus ancienne). Aucune base, aucun serveur applicatif.
- Une seule requête de données par visite : `fetch('annonces.json')` au premier chargement, copie dans `localStorage`. Ensuite aucune requête ; pagination et détail sont calculés côté navigateur.
- Navigation par ancre (`#`, `#page-2`, `#annonce-12`) : une seule page HTML, pas de rechargement.

## 2. Fichiers
`site/index.html` (structure, landmarks, `lang="fr"`) · `site/style.css` (charte sobre, police système, mode clair) · `site/app.js` (fetch, cache, rendu, pagination, routage par ancre) · `site/annonces.json`.

## 3. Écrans
**Liste** — `h1` « Annonces du lycée » ; lien d'évitement « Aller au contenu » ; en-tête avec le nom et la baseline ; `h2` « 20 annonces · page 1 sur 3 » (`role="status"`) ; cartes `<a>` : titre, prix ou badge « Don », catégorie, date relative ; 8 par page ; pagination Précédent / 1 / 2 / 3 / Suivant (`aria-current`) ; ligne d'état discrète « Liste chargée depuis le réseau » ou « …depuis le cache — aucune nouvelle requête ».
**Détail** — `h1` titre ; prix ou « Don », catégorie, date, prénom du vendeur, description ; lien « Retour aux annonces » (même page de liste).
**États**
- *Vide* : « Aucune annonce en ligne pour le moment. Revenez plus tard. »
- *Annonce introuvable* (à la place d'« adresse inconnue », `#annonce-999` ou annonce clôturée) : « Cette annonce n'existe plus ou a été clôturée. » + lien « Retour aux annonces ».
- *Hors connexion* : cache présent → liste affichée + « Hors connexion — liste enregistrée sur votre appareil » ; cache absent → « Vous êtes hors connexion et la liste n'a jamais été chargée. Réessayez avec du réseau. » + bouton « Réessayer ».

## 4. À retirer de la maquette
- React, ReactDOM et le runtime `dc-runtime` (46 Ko mesurés + ≈ 140 Ko estimés pour React) : remplacés par ≈ 6 Ko de JS natif.
- Écrans hors US1 : connexion, publier, mes annonces, panneau Performance et son lien de pied de page, dialogue de clôture, bandeau de confirmation, session/« Se déconnecter », liens de navigation connecté.
- Hors US1 (US2/US3) : filtre par catégorie, tri, bouton « Afficher le contact » (le détail ne montre aucun contact).
- Jeu de démo : annonce clôturée (id 16) et une annonce active en trop (22 → 20 comme dans le brief) ; badge « Nouveau » (dépend de la publication, US4).
- Mentions d'état de cache liées à la clôture/publication (« cache mis à jour »).

## 5. Critère Gherkin → élément
| Scénario | Élément vérifiable |
|---|---|
| Affichage de la liste | `ul` de cartes + `h2` du compteur ; état vide si 0 annonce |
| Consultation du détail | clic sur une carte `<a href="#annonce-N">` → écran Détail (`h1`, description) ; introuvable → message dédié |
| Mise en cache de la liste | après `fetch` réussi, écriture `localStorage["annonces"]` ; ligne d'état « depuis le réseau » |
| Affichage depuis le cache | retour sur la liste / rechargement : lecture `localStorage`, 0 requête vers `annonces.json` (onglet Réseau) ; ligne d'état « depuis le cache » ; secours hors connexion |
| Critère d'acceptation (actives, récentes d'abord) | ordre du JSON respecté, aucune annonce `closed` dans le fichier |

## 6. Poids estimé (≤ 500 Ko)
| Fichier | Poids |
|---|---|
| `index.html` | ≈ 3 Ko |
| `style.css` | ≈ 5 Ko |
| `app.js` | ≈ 6 Ko |
| `annonces.json` (20 annonces, texte seul) | ≈ 7 Ko |
| **Total** | **≈ 21 Ko, 4 requêtes** (marge ≈ 480 Ko) |
