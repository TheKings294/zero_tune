# SPEC — Repasse V1 · US-06 « Publication instantanée, sans validation »

Persona : Carole (BDE) — « un outil officiel qui tourne tout seul ». Critère du brief : clic sur « Ajouter », formulaire rempli entièrement, clic sur « Créer l'annonce » → l'annonce est en ligne immédiatement. Complète `SPEC-US4.md` : **le mécanisme est celui d'US4** ; US6 en fixe les garanties et les libellés.

## 1. Garanties
- Aucun statut « en attente », aucune file de modération, aucune route d'approbation (la modération/suppression par l'administratrice est exclue, V3). `statut='active'` dès l'insertion.
- Le serveur seul fixe `statut`, `user_id` (compte connecté) et `created_at` : tout champ de ce type envoyé par le client est ignoré.
- Visible par tous dès la réponse `201` : cache serveur vidé avant de répondre ; pour l'auteur, cache `localStorage` purgé et annonce en tête de l'accueil. Autres appareils : ≤ 5 min (cache de liste).
- Aucun coût supplémentaire : 1 requête `POST` de ≈ 150 octets.

## 2. Libellés (alignés sur le critère)
Lien d'en-tête et titre de l'écran : « Ajouter une annonce » · bouton d'envoi : « Créer l'annonce » (« Création… » pendant l'envoi) · confirmation : « Votre annonce est en ligne : elle apparaît en tête de la liste. »
*Écart du brief* : l'écran `publier` parle de « Publier », le critère US6 de « Ajouter » / « Créer l'annonce » ; le critère testable l'emporte.

## 3. Critère → élément
| Critère | Élément vérifiable |
|---|---|
| Clic sur « Ajouter » | lien d'en-tête (connecté) → formulaire |
| Formulaire rempli, clic « Créer l'annonce » | `POST /api/annonces` → `201` |
| En ligne immédiatement | 1re carte de l'accueil + bandeau ; anonyme : présente dans `GET /api/annonces` sans délai |
| Sans validation manuelle | aucun statut intermédiaire, aucune route de modération |
