# SPEC — Mesure du coût carbone (CO2.js)

Objectif : connaître le coût en g CO2e de chaque visite, avec la bibliothèque `@tgwf/co2` (CO2.js), modèle **Sustainable Web Design v4** (`new co2({ model: 'swd', version: 4 })`, `perByte(octets, hébergementVert)`). Côté serveur uniquement : **0 octet ajouté aux pages** (la librairie ne part pas chez le client, cohérent avec le budget ≤ 500 Ko).

## Mesure
- `server/impact.js` : un hook compte les **octets réellement écrits** sur chaque réponse (donc après gzip/brotli) + une estimation des en-têtes (statut + `clé: valeur`). Il convertit en g CO2e via CO2.js et cumule **par jour** dans la table `impact(jour, visites, requetes, octets, co2_g)` (SQLite, volume Docker : survit aux redémarrages).
- **Visite** = un chargement de l'accueil (`GET /`) ; toutes les requêtes mesurées (CSS, JS, API…) sont rattachées au total, donc `g CO2e / visite = total g / visites`.
- Les ressources servies par le Service Worker ou le cache HTTP ne passent pas par le serveur : elles ne sont pas comptées, c'est précisément l'économie du cache (1re visite ≈ 15,7 Ko / 0,0023 g ; visite suivante ≈ 1,4 Ko / 0,0003 g, mesuré).
- Aucune donnée personnelle : ni IP, ni cookie, ni identifiant ; uniquement des cumuls par jour. `GET /api/impact` et ses propres requêtes ne sont pas mesurés.

## API
`GET /api/impact?jours=30` (`no-store`) → `{modele, hebergement_vert, visites, requetes, octets, co2_g, co2_g_par_visite, octets_par_visite, jours:[{jour, visites, requetes, octets, co2_g, co2_g_par_visite}]}`. Public (agrégats seulement) ; à restreindre si l'exposition pose problème.

## Réglage
`GREEN_HOSTING=1` (compose) si l'hébergeur est « vert » (Green Web Foundation) ; sinon calcul avec l'intensité carbone mondiale moyenne du modèle.

## Limites (à dire honnêtement)
Estimation du transfert réseau seulement (modèle SWD : centres de données, réseau, appareil), pas de mesure d'énergie réelle. En-têtes de requête et surcoût TLS/TCP non comptés ; en-têtes de réponse estimés. Les ordres de grandeur sont fiables, pas la 3e décimale.
