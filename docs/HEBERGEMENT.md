# Hébergement — fiche (RGESN)

| | |
|---|---|
| **Hébergeur** | OVHcloud (OVH SAS), France — ovhcloud.com |
| **Déclaré dans le site** | `/carbon.txt` (`site/carbon.txt`), standard carbon.txt de la Green Web Foundation |
| **Statut « vert »** | `ovhcloud.com`, `ovh.com`, `ovh.net` référencés « verts » par la Green Web Foundation — vérifié le 12/11/2026 avec `npm run hosting:check -- <domaine>` (API greencheck) |
| **Effet dans l'application** | `GREEN_HOSTING=1` : le calcul CO2.js (`/api/impact`, écran « Impact environnemental ») applique l'intensité d'un hébergement vert |
| **Architecture déployée** | un seul conteneur Docker (Node.js + SQLite), port publié 8080, jamais 80/443 ; HTTPS par un reverse proxy placé devant |

## À compléter par le référent (ne pas inventer)
- Offre souscrite (VPS, Public Cloud, hébergement web…) et taille de la machine : ______
- Datacenter / pays de l'hébergement des données : ______
- Justificatifs publiés par OVHcloud (énergie renouvelable, PUE, rapport environnemental, certifications) : liens + date de consultation : ______
- Nom de domaine du site (à vérifier avec `npm run hosting:check -- <domaine>` et à déclarer dans le DNS si besoin) : ______
- Sauvegardes : emplacement et durée (voir la conservation dans le README) : ______

## Pourquoi ce n'est pas une preuve à lui seul
Le statut « vert » de la Green Web Foundation concerne le fournisseur et ses déclarations ; il ne mesure pas la consommation réelle de notre conteneur. Les émissions de l'application sont estimées par CO2.js (modèle SWD v4) à partir des octets transférés.

## Révision
Revérifier ce document à chaque changement d'offre, de datacenter ou de domaine, et au moins une fois par an.
