# SPEC — Repasse V1 · US-04 « Publier une annonce » (+ US-06 publication immédiate, login/register)

Complète `SPEC.md` (mêmes budgets : ≤ 500 Ko, ≤ 15 requêtes). Brief : US4 (Must), US6 (publication sans validation), écrans `connexion` et `publier`. Comptes sans rôle ; le moyen de contact est porté par le compte (`users`), donc demandé à l'inscription et **non** à chaque annonce.

## 1. Architecture
- **Sessions** : table `sessions(token_hash, user_id, expires_at)` ; jeton aléatoire 256 bits, seul son SHA-256 est stocké ; cookie `rp_session` `HttpOnly`, `SameSite=Lax`, 7 jours, `Secure` si `COOKIE_SECURE=1` (à activer derrière HTTPS). Mots de passe : scrypt + sel.
- **API** : `POST /api/register` · `POST /api/login` · `POST /api/logout` · `GET /api/me` (`no-store`, hors cache du Service Worker) · `POST /api/annonces` (connexion requise → `401`).
- **Requête allégée** : corps JSON de texte seulement, **16 Ko max** (`413` au-delà) ; autre type (formulaire, multipart) → `415`, ce qui bloque aussi les envois venus d'un autre site. Aucune route d'envoi de fichier.
- **Validation serveur (autorité)** : titre ≤ 80 caractères, description ≤ 1 000, prix 0,01–9 999 € **ou** `don`, catégorie parmi les 10 ; erreurs `422 {erreurs:{champ:message}}`. Identifiant unique (`409`). Même message pour identifiant inconnu et mauvais mot de passe ; 10 échecs / 15 min / adresse → `429`.
- **Publication immédiate (US6)** : `statut='active'` à l'insertion, cache mémoire serveur vidé ; côté navigateur, les listes en `localStorage` sont purgées : l'annonce apparaît **en tête** de l'accueil.
- Coût page : +1 requête (`/api/me`) ; accueil = 5, ≤ 15.

## 2. Écrans (RGAA : labels visibles, « (obligatoire) » en texte, `aria-invalid`/`aria-describedby`, récapitulatif d'erreurs avec focus)
**En-tête** : « Se connecter » / « Créer un compte » ; connecté : « Publier une annonce », « Se déconnecter », « Session : {prénom} ».
**Connexion** : identifiant, mot de passe (`autocomplete`), erreur explicite liée au champ et annoncée. Pas d'encart « comptes de démo » (mots de passe publics sur un site réel).
**Inscription** : identifiant, mot de passe (≥ 8), prénom, Email/Téléphone (radios) + champ (format indiqué).
**Publier** (connecté, sinon renvoi vers la connexion puis retour) : titre et description avec compteurs, prix **ou** « C'est un don » (désactive le prix), catégorie, mention « Texte uniquement : pas de photo, pour une application légère », rappel du contact du compte. Champ vide → rien n'est envoyé, récapitulatif en tête (liens vers chaque champ) + message sous chaque champ. Succès → bandeau « Votre annonce est en ligne » sur l'accueil. Hors connexion → champs conservés, message clair.

## 3. Critère Gherkin → élément
| Scénario | Élément vérifiable |
|---|---|
| Publication d'une annonce | `POST /api/annonces` `201` → accueil, annonce en 1re carte, bandeau |
| Refusée si formulaire incomplet | aucun `POST` envoyé, récapitulatif + message par champ ; serveur `422` si contourné |
| Annonce texte uniquement | pas de champ fichier ; `415` sur multipart ; 16 Ko max |
| Requête allégée | corps JSON de 4 champs texte (≈ 150 o) |
| US6 : en ligne immédiatement | `statut='active'`, pas de modération, tête de liste |

## 4. Poids
`app.js` ≈ 31 Ko brut / ≈ 8,7 Ko gzip, `style.css` ≈ 6 Ko / ≈ 1,8 Ko gzip. Page d’accueil ≈ 13 Ko transférés, 5 requêtes.
