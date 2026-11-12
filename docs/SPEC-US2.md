# SPEC — Repasse V1 · US-02 « Filtrer par matière »

Complète `SPEC.md` (même architecture, mêmes budgets : ≤ 500 Ko, ≤ 15 requêtes). Brief : US2 (Must) + écran `accueil` (filtre, tri secondaire, état vide) + `detail` (retour qui conserve filtre et page).

## 1. Architecture
- **Aucun nouveau fichier, aucune nouvelle table** : le filtre et le tri sont des paramètres de `GET /api/annonces?categorie=X&tri=recent|prix&page=N`.
- `categorie` : l'une des 10 catégories du brief, sinon `400`. Absente = toutes. `tri` : `recent` (défaut, `created_at DESC`) ou `prix` (dons d'abord, puis prix croissant, puis plus récent). Tri et filtre sont faits en SQL, avant la pagination (8 par page).
- Réponse : `{page, pages, total, categorie, tri, items[]}`. Cache mémoire serveur, `ETag`, `localStorage` (5 min) : clé par `(catégorie, tri, page)`. Changer de filtre = **1 requête** (aucune en cas de retour sur un filtre déjà vu < 5 min). Requêtes par page : 4 + 1 par filtre, ≤ 8.
- État dans l'ancre, pour le retour et le partage : `#liste?cat=Mathématiques&tri=prix&page=2` et `#annonce-12?cat=…&tri=…&page=…` (`#page-N` de US-01 reste valide).

## 2. Écran Liste (ajouts)
Bloc « Filtrer » sous le chapeau : `select` « Catégorie » (« Toutes les catégories » + 10 catégories) et `select` « Trier par » (« Plus récentes » / « Prix croissant (dons en premier) »), vrais `label`, éléments natifs, cibles ≥ 44 px, sans bouton de validation (changement = application, focus conservé sur le champ). `h2` `role="status"` annonce le résultat : « 4 annonces en Mathématiques · page 1 sur 1 ». Pagination et lien « Retour aux annonces » conservent filtre, tri et page.
**État vide** : « Aucune annonce en ligne dans la catégorie « X » pour le moment. » + « Revenez plus tard, ou consultez les autres catégories. » + bouton « Afficher toutes les catégories ».

## 3. Critère Gherkin → élément
| Scénario | Élément vérifiable |
|---|---|
| « Mathématiques » : seules les annonces de maths s'affichent | `select` Catégorie → `GET …?categorie=Mathématiques` → cartes toutes « Mathématiques », `h2` annonce le nombre |
| Aucun résultat (brief : état vide) | message vide + bouton de réinitialisation |
| Prix le plus bas (énoncé) | `select` Trier → dons puis prix croissant |
| Retour du détail | lien « Retour aux annonces » → même filtre, tri, page |

## 4. Poids
+ ≈ 1,5 Ko JS, + ≈ 0,3 Ko CSS ; réponse filtrée ≈ 1 à 3 Ko gzip. Total page ≈ 8 Ko.
