# Hébergement — fiche et justificatifs RGESN (critères 2.8 et 8.1 à 8.7)

Référentiel : RGESN, version 2024 (ecoresponsable.numerique.gouv.fr). Libellés, seuils et moyens de contrôle repris du référentiel. Valeurs OVHcloud relevées le **12/11/2026** sur les pages et documents listés en fin de fiche. Statuts : **Validé** (seuil du référentiel atteint, preuve citée) · **Partiel** (preuve incomplète, pièce à obtenir) · **À faire**.

## 1. Fiche d'identité

| | |
|---|---|
| **Hébergeur** | OVHcloud (OVH SAS), France — ovhcloud.com |
| **Datacenter** | **Gravelines (GRA), Nord, France** |
| **Utilisateurs** | élèves et personnel d'un lycée en France |
| **Déclaré dans le site** | `/carbon.txt` (`site/carbon.txt`), standard carbon.txt de la Green Web Foundation |
| **Statut « vert »** | `ovhcloud.com`, `ovh.com`, `ovh.net` référencés « verts » par la Green Web Foundation (vérifié le 12/11/2026 : `npm run hosting:check -- ovhcloud.com`) |
| **Effet dans l'application** | `GREEN_HOSTING=1` : le calcul CO2.js (`/api/impact`, écran « Impact environnemental ») applique l'intensité d'un hébergement vert |
| **Architecture** | un conteneur Docker (Node.js + SQLite), port 8080 (jamais 80/443), HTTPS par un reverse proxy devant ; aucun CDN, aucune police ni script tiers |
| **À renseigner** | offre souscrite et taille de la machine : ______ · nom de domaine : ______ |

## 2. Synthèse

| Critère | Exigence RGESN | Valeur / preuve (Gravelines, exercice 2025) | Statut |
|---|---|---|---|
| **2.8** Fournisseurs | exigences environnementales dans la politique d'achat, documentées | politique d'achat du projet (§ 3) ; hébergeur choisi sur critères 8.1–8.7 | Partiel : politique à faire adopter |
| **8.1** Démarche de réduction de l'empreinte | hébergeur transparent, engagements fondés sur des cadres reconnus | Code de conduite européen, ISO 50001, bilan carbone publié depuis 2017, objectifs 2030, WUE/PUE/REF publiés | Partiel : ISO 14001, GES location/market-based, ressources abiotiques à obtenir |
| **8.2** Gestion durable des équipements | plan de gestion (durée de vie, achat, fin d'usage) référencé | 100 % des serveurs démontés, composants testés pour une seconde vie ; durée de vie prolongée de 4,5 ans en moyenne (jusqu'à 9) ; 17 composants réutilisés sur 100 (2025) | Partiel : durée de vie totale à obtenir |
| **8.3** PUE | PUE réel < 1,5 | **1,21** (catégorie 2, ISO/IEC 30134-2) ; 1,22 en 2024 et 2023 | **Validé** |
| **8.4** WUE | démarche de réduction, objectif ≤ 0,4 L/kWh | **0,20 L/kWh** (catégorie 1, ISO/IEC 30134-9) | **Validé** |
| **8.5** Origine de l'électricité | origine documentée et majoritairement renouvelable | REF (Renewable Energy Factor) **100 %** | Partiel : modalités (PPA ou garanties d'origine) et volumes à obtenir |
| **8.6** Localisation | pays à moins de 100 gCO₂e/kWh, proche des utilisateurs, ville et pays documentés | Gravelines, **France** ; intensité moyenne ≈ **44 gCO₂e/kWh** (CO2.js 0.19, données Ember) ; utilisateurs en France | **Validé** |
| **8.7** Chaleur des serveurs | récupération de chaleur fatale, ou à défaut PUE réel < 1,3 | refroidissement par eau (watercooling propriétaire depuis 2003, sans climatisation) ; PUE **1,21 < 1,3** | **Validé** (voie alternative par le PUE) |

## 3. Détail

### 2.8 — Le service numérique impose-t-il à ses fournisseurs de garantir une démarche de réduction de leurs impacts environnementaux ?
**Fournisseurs identifiés**

| Fournisseur | Rôle | Exigence / constat | Statut |
|---|---|---|---|
| OVHcloud | hébergement (runtime) | critères 8.1 à 8.7 ci-dessous ; exercice 2025 publié | documenté |
| Green Web Foundation | API de vérification d'hébergeur, **script de développement uniquement** (`npm run hosting:check`), aucun appel en production | association à but non lucratif, hors chaîne de service | sans objet |
| GitHub | dépôt, Dependabot | aucune exigence environnementale vérifiée | **à évaluer** |
| Docker Hub (image `node`) | image de base du conteneur | aucune exigence environnementale vérifiée | **à évaluer** |
| Bibliothèques npm | dépendances open source | aucun service appelé à l'exécution ; 7 dépendances directes, mises à jour suivies | documenté |

En production, le site n'appelle **aucun service tiers** (ni CDN, ni police web, ni statistiques, ni captcha) : tout est servi depuis le même domaine.
**Politique d'achat du projet** *(proposition à valider par le référent)* : tout fournisseur retenu doit, avant signature, (1) publier son empreinte environnementale (GES, énergie, eau), (2) justifier ses engagements par un cadre reconnu (Code de conduite européen, ISO 14001/50001, bilan carbone vérifié), (3) documenter la gestion de ses équipements et l'origine de son électricité, (4) être situé dans l'Union européenne. Référence : Guide pratique pour des achats numériques responsables, ISO 20400.

### 8.1 — Hébergement ayant une démarche de réduction de son empreinte environnementale
- **Code de conduite européen sur les centres de données** : OVHcloud se déclare participant ; la liste JRC est citée dans le document d'indicateurs. *À faire : vérifier que Gravelines y figure.*
- **ISO 50001** (management de l'énergie) : mentionnée sur la page environnement d'OVHcloud.
- **Charte NZI for IT** (Carbone 4, 07/02/2024) ; bilan carbone publié depuis 2017, bilan de l'exercice 2025 et déclaration d'assurance limitée sur les émissions de GES (audit indépendant).
- **Objectifs** : −73,4 % des émissions des scopes 1 et 2 en valeur absolue et −52 % du scope 3 par unité de valeur ajoutée d'ici l'exercice 2030.
- **Refroidissement** minimisant l'énergie : watercooling, sans climatisation (voir 8.7). **Eau** : WUE publié (8.4). **Énergie** : PUE publié (8.3).
- **Non vu sur les pages consultées** (ne pas affirmer avant preuve) : ISO 14001, validation SBTi, émissions market-based et location-based séparées, consommation de ressources abiotiques.

### 8.2 — Hébergement qui fournit une politique de gestion durable des équipements
- 100 % des serveurs sont démontés et leurs composants testés pour une seconde vie, en interne ou par recyclage et valorisation externes ; serveurs conçus pour la remise à neuf.
- Les composants reconditionnés prolongent la durée de vie des serveurs de 4,5 ans en moyenne, jusqu'à 9 ans ; 17 composants réutilisés sur 100 en 2025 ; 27 datacenters sont des bâtiments réhabilités.
- *Manque* : la durée de vie **totale** des équipements (le référentiel cite 8 ans comme repère) et le document de politique d'achat/gestion à référencer (voir la Politique RSE 2026 et la méthodologie de l'Impact Tracker en sources).

### 8.3 — PUE minimisé
Gravelines : **1,21** (exercice 2025), 1,22 (2024), 1,22 (2023) ; groupe OVH : 1,24. Catégorie 2 (ISO/IEC 30134-2), valeur **mesurée** (site en activité depuis plus de deux ans). Seuil du référentiel : < 1,5. Stratégie : refroidissement par eau sans climatisation.

### 8.4 — WUE minimisé
Gravelines : **0,20 L/kWh** (exercice 2025) ; groupe : 0,34. Catégorie 1 (ISO/IEC 30134-9). Objectif du référentiel : ≤ 0,4 L/kWh. *Non documenté* : stress hydrique local.

### 8.5 — Origine de l'électricité documentée et majoritairement renouvelable
REF (Renewable Energy Factor, ISO/IEC 30134-3) de Gravelines : **100 %** (exercice 2025), publié par OVHcloud. *Manque* demandé par le référentiel : la quantité annuelle d'énergie contractualisée et le mode d'approvisionnement (PPA, autoconsommation ou garanties d'origine avec preuve d'additionnalité). Voir l'État de Durabilité (CSRD) en sources, sinon interroger OVHcloud.

### 8.6 — Localisation cohérente et à faible empreinte
Hébergement : **Gravelines, France**. Utilisateurs : lycée en France, donc distance minimale. Intensité carbone de l'électricité française ≈ 44 gCO₂e/kWh en moyenne annuelle (jeu de données intégré à CO2.js 0.19, source Ember), très inférieure au seuil de 100 gCO₂e/kWh (80 à partir de 2030). *À faire* : joindre la valeur Electricity Maps de l'année, source citée par le référentiel.

### 8.7 — Chaleur produite par les serveurs
OVHcloud refroidit ses serveurs par sa technologie propriétaire de watercooling (depuis 2003), sans climatisation. Aucune récupération de chaleur fatale n'est documentée sur les pages consultées pour Gravelines : le critère est validé par la **voie alternative** du référentiel, un PUE réel inférieur à 1,3 (Gravelines : 1,21).

## 4. Pièces à obtenir ou à vérifier pour passer en « Validé »
1. Liste JRC du Code de conduite : présence de Gravelines.
2. Certificat ISO 14001 (ou équivalent) et engagements SBTi, s'ils existent.
3. Émissions de GES en location-based et market-based, consommation d'eau et de ressources abiotiques.
4. Durée de vie totale des équipements et plan de gestion du matériel.
5. Contrats d'électricité renouvelable : volumes annuels et type (PPA, garanties d'origine).
6. Offre souscrite, taille de la machine, nom de domaine, durée et lieu des sauvegardes.
7. Adoption de la politique d'achat par le référent (2.8) et évaluation de GitHub et Docker Hub.

## 5. Sources (consultées le 12/11/2026)
- [Environnement — OVHcloud](https://corporate.ovhcloud.com/fr/sustainability/environment/)
- [Indicateurs PUE, WUE, REF par datacenter, exercice 2025](https://www.ovhcloud.com/sites/default/files/external_files/kpis_fy25.pdf)
- [Politique RSE 2026](https://corporate.ovhcloud.com/sites/default/files/2025-12/politique_rse_fr_fy26.pdf)
- [État de Durabilité (CSRD)](https://corporate.ovhcloud.com/sites/default/files/2025-11/urd_p51-163.pdf)
- [Bilan carbone 2025](https://corporate.ovhcloud.com/sites/default/files/2025-11/carbon_balance_2025_ovhcloud_fr_1.pdf)
- [Méthodologie de l'Impact Tracker environnemental](https://corporate.ovhcloud.com/sites/default/files/2025-10/methodology_-_environmental_impact_tracker_fr.pdf)
- [Charte NZI for IT](https://corporate.ovhcloud.com/sites/default/files/2024-02/carbone_4_nzi4it_charte_engagement.pdf)
- [Déclaration d'assurance sur les émissions de GES](https://corporate.ovhcloud.com/sites/default/files/2025-01/2024-11_-_ovhcloud_-_ghg_emissions_limited_assurance.pdf)
- [RGESN version 2024](https://ecoresponsable.numerique.gouv.fr/docs/2024/rgesn-mai2024/referentiel_general_ecoconception_des_services_numeriques_version_2024.pdf)

## 6. Limites et révision
Le statut « vert » de la Green Web Foundation concerne le fournisseur, pas la consommation réelle de notre conteneur ; les émissions de l'application sont estimées par CO2.js (modèle SWD v4) à partir des octets transférés. Les valeurs ci-dessus sont celles de l'exercice 2025 d'OVHcloud : les mettre à jour à chaque publication annuelle, à chaque changement d'offre, de datacenter ou de domaine, et au moins une fois par an.
