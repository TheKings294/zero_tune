# Revue d'écoconception périodique (RGESN 1.4)

**Fréquence : chaque trimestre** (1er janvier, 1er avril, 1er juillet, 1er octobre). Un ticket avec la liste de contrôle est créé automatiquement par `.github/workflows/revue-trimestrielle.yml` (déclenchable à la main depuis l'onglet « Actions »). **Participants** : le référent numérique responsable (voir README) et un développeur. **Durée visée** : une demi-journée.

## Déroulé
1. **Mesurer** : `npm run budget` (poids et requêtes d'une première visite), écran « Impact environnemental » ou `GET /api/impact` (g CO2e par visite et par jour), `docker stats` (mémoire et CPU réels), EcoIndex sur ecoindex.fr.
2. **Comparer** au journal ci-dessous et aux budgets du README (≤ 500 Ko, < 15 requêtes, EcoIndex A ou B, CO2 par première visite ≤ 0,005 g).
3. **Réexaminer les fonctionnalités** avec l'évaluation utilité / impact du brief (`docs/brief-repasse-v1.xml`, section `evaluation-utilite-impact`) : une fonctionnalité peu utilisée et coûteuse est proposée au retrait.
4. **Dépendances et plateforme** : fusionner ou refuser les PR Dependabot, retirer les dépendances inutilisées, vérifier que Node est toujours en LTS.
5. **Données** : purge exécutée (`purge` dans le journal du conteneur), durées `RETENTION_*` toujours adaptées, taille de `data/repasse.db`.
6. **Accessibilité** : audit des écrans principaux (contrastes, clavier, lecteur d'écran).
7. **Hébergement** : relire `docs/HEBERGEMENT.md` (valeurs OVHcloud, statut « vert »), au moins une fois par an.
8. **Mettre à jour l'écran « Impact environnemental »** : reporter les mesures du trimestre (requêtes, temps d'affichage en 3G, EcoIndex, score RGESN) dans les constantes `PERF_BUDGET` de `site/app.js` et dans le tableau des budgets du README.
9. **Décider** : chaque écart devient un ticket avec un responsable et une échéance ; consigner la revue ci-dessous et mettre à jour le `CHANGELOG.md` si des changements en découlent.

## Seuils d'alerte (ouvrir un ticket prioritaire)
- première visite > 400 Ko ou > 12 requêtes ;
- g CO2e par visite en hausse de plus de 20 % par rapport à la revue précédente ;
- mémoire du conteneur > 70 % de la limite (`APP_MEM_LIMIT`) ou CPU > 50 % de la limite en moyenne ;
- dépendance sans mise à jour depuis plus d'un an ou version de Node hors support.

## Journal des revues
| Date | Poids 1re visite | Requêtes | g CO2e / 1re visite | RAM conteneur | Décisions et tickets |
|---|---|---|---|---|---|
| 12/11/2026 (état initial) | 16,5 Ko | 7 | ≈ 0,0020 | ≈ 50 Mo | référence ; limites de ressources posées, budget automatisé |
| 01/01/2027 (prévue) | | | | | |
| 01/04/2027 (prévue) | | | | | |
