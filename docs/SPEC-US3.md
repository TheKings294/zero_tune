# SPEC — Repasse V1 · US-03 « Révéler le contact du vendeur »

Complète `SPEC.md` (mêmes budgets : ≤ 500 Ko, ≤ 15 requêtes). Brief : US3 (Must) + écran `detail` (« Afficher le contact » : email ou téléphone en `mailto:` / `tel:`, annoncé aux lecteurs d'écran). Critère : clic sur l'annonce, puis sur le bouton → le contact s'affiche. Éco : traitement simple, compatible 3G.

## 1. Architecture
- Le contact reste dans `users` (`contact_type`, `contact_value`) et **n'est jamais** dans la réponse de la liste ni du détail : il n'est lu qu'à la demande, par `GET /api/annonces/:id/contact` → `{type: "email"|"tel", valeur}` ; `404` si l'annonce est absente ou clôturée.
- Réponse en `Cache-Control: no-store`, **non mise en cache** par le Service Worker ni par `localStorage` : un contact n'est pas conservé sur l'appareil (discrétion, persona Kevin). Revenir sur l'annonce le masque de nouveau.
- Coût : **+1 requête, ≈ 100 octets**, seulement au clic (détail : 5 requêtes, +1 au clic = 6 ≤ 15).
- Pas de compte requis (consultation publique). Pas de limitation de débit en V1 : à prévoir si le scraping devient un sujet.

## 2. Écran Détail (ajouts)
Section « Contacter {prénom} » (`h2`) : « Le contact reste masqué jusqu'à votre demande. Vous échangez directement, sans passer par l'application. » + bouton natif « Afficher le contact de {prénom} ».
**Après clic** : le bouton est remplacé par « Email : » ou « Téléphone : » et un lien `mailto:` (objet « Repasse : {titre} ») ou `tel:+33…` (cible ≥ 44 px, texte du contact visible). Le focus passe sur ce lien ; la zone `role="status"` annonce « Contact de {prénom} affiché : … ».
**États** — *Chargement* : bouton désactivé, « Affichage… » · *Hors connexion* : « Vous êtes hors connexion : le contact ne peut pas être affiché. » (bouton conservé) · *Erreur serveur* : « Impossible d'afficher le contact, réessayez. » · *Annonce clôturée entre-temps* : « Cette annonce n'existe plus ou a été clôturée. »

## 3. Critère Gherkin/acceptation → élément
| Critère | Élément vérifiable |
|---|---|
| Clic sur l'annonce | carte → `#annonce-N` → détail, contact masqué |
| Clic sur le bouton : le contact s'affiche | `GET …/contact` → lien `mailto:`/`tel:` visible |
| Annoncé aux lecteurs d'écran | zone `role="status"` + focus sur le lien |
| Compatible 3G / traitement simple | 1 requête de ≈ 100 o, au clic uniquement |

## 4. Poids
+ ≈ 1 Ko JS, + ≈ 0,1 Ko CSS. Total page détail ≈ 9 Ko.
