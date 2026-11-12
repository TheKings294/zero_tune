# SPEC — Repasse V1 · US-05 « Clôturer une annonce »

Complète `SPEC.md` (mêmes budgets : ≤ 500 Ko, ≤ 15 requêtes). Brief : US5 (Must), écran `mes-annonces`. Critère : l'annonce passe « clôturée », n'apparaît plus dans la liste publique, le cache de la liste est invalidé.

## 1. Architecture
- Aucune nouvelle table : `annonces.statut` passe de `active` à `closed`.
- `GET /api/mes-annonces` (connexion requise, `no-store`, hors Service Worker) : annonces du compte, actives **et** clôturées, avec statut (100 max).
- `POST /api/annonces/:id/cloture` (connexion requise, corps JSON `{}`) : seul le propriétaire peut clôturer ; annonce d'un autre compte ou inexistante → `404` (même réponse) ; déjà clôturée → `409` ; sans JSON → `415`.
- **Invalidation du cache** : cache mémoire serveur vidé ; côté navigateur, les listes `localStorage` sont purgées. Les autres appareils voient le changement à l'expiration de leur cache (≤ 5 min). Une annonce clôturée devient `404` (détail et contact).
- Service Worker : liste blanche stricte (`/api/annonces` et `/api/annonces/N` seulement) ; compte, contact et « Mes annonces » ne sont jamais mis en cache.

## 2. Écran « Mes annonces » (`<title>` « Mes annonces — Repasse », lien dans l'en-tête)
Liste des annonces du compte : titre, prix ou « Don », catégorie, date, statut en **texte** (« En ligne » / « Clôturée »). Bouton « Clôturer » (nom accessible : « Clôturer l'annonce « titre » ») sur les annonces en ligne uniquement.
**Boîte de dialogue** (`role="dialog"`, `aria-modal`, titre et description reliés ; sans `<dialog>`, absent des anciens iOS) : « L'échange a été effectué ? » — « L'annonce « … » passera en statut « Clôturée » et disparaîtra de la liste publique. » — [Oui, clôturer l'annonce] [Non, la garder en ligne]. Focus dans la boîte, Tab bouclé, Échap ferme, focus rendu au bouton d'origine, reste de la page masqué aux lecteurs d'écran.
**Après confirmation** : statut « Clôturée », bouton retiré, message `role="status"` « Annonce clôturée — cache de la liste mis à jour. » (focus dessus).
**États** — *Aucune annonce* : « Vous n'avez publié aucune annonce pour le moment. » + « Publier une annonce » · *Non connecté* : renvoi vers la connexion puis retour ici · *Hors connexion / erreur serveur / annonce déjà clôturée* : message clair, rien n'est modifié.

## 3. Critère Gherkin → élément
| Scénario | Élément vérifiable |
|---|---|
| Clôture d'une annonce | bouton « Clôturer » → confirmation → `POST …/cloture` `200` → statut « Clôturée » |
| Annonce clôturée non consultable | absente de `GET /api/annonces` ; détail et contact `404` |
| Allègement de l'accueil | `WHERE statut='active'` ; total de la liste −1 |
| Cache invalidé | cache serveur vidé + purge `localStorage` ; message affiché |

## 4. Poids
+ ≈ 4 Ko JS brut (≈ 1,3 Ko gzip), + ≈ 0,5 Ko CSS. Accueil inchangé (5 requêtes) ; « Mes annonces » : 5 requêtes.
