# Palette — RGAA 4.1 niveau AA (critère 3.2 texte ≥ 4,5:1, critère 3.3 composants ≥ 3:1)

Cible : lycéens et étudiants. Indigo vif et franc pour l'identité, ambre chaleureux pour les dons, fond lavande très clair (brief : « fond blanc ou très clair, une couleur d'accent contrastée »). Mode clair uniquement. Aucune information ne passe par la couleur seule (« Don », « En ligne », « Clôturée », ⚠ et ✓ restent écrits).

| Rôle | Couleur | Usage | Contraste |
|---|---|---|---|
| Fond | `#F6F7FF` | page | encre `#1B1B35` : 15,7:1 |
| Surface | `#FFFFFF` | cartes, champs | encre : 16,7:1 |
| Accent | `#4338CA` | en-tête, boutons, prix, liens de navigation | blanc dessus : 7,9:1 ; sur blanc : 7,9:1 |
| Accent foncé | `#312E81` | survols, texte du badge « En ligne » | blanc dessus : 11,4:1 |
| Lien | `#3730A3` | liens dans le texte | 9,9:1 sur blanc |
| Texte secondaire | `#4B4D6E` | dates, aides, notes | 7,6:1 sur le fond |
| Accroche d'en-tête | `#E4E6FF` | sous-titre, session | 6,4:1 sur l'accent |
| Don (ambre) | `#FFF0C2` / `#5C3D00` / bord `#B26A00` | badge « Don » | texte 8,7:1 ; bord 4,2:1 |
| Succès (vert) | `#E3F5EC` / `#0B4F3A` / bord `#0F6B4F` | bandeau de confirmation | texte 8,5:1 |
| Erreur | `#B3261E` (lien `#8C1D18`) | messages, champs invalides | 6,5:1 / 9,1:1 sur blanc |
| Bordure de champ | `#62668F` | champs, cases | 5,5:1 sur blanc (≥ 3:1) |
| Bordure de carte | `#7478A0` | cartes | 4,3:1 sur blanc |
| Focus | `#B45309` (blanc dans l'en-tête) | contour 3 px | 5,0:1 sur blanc, 4,7:1 sur le fond |
| Désactivé | `#EEEFF8` / `#55587A` | boutons et champs inactifs | 6,0:1 |

Vérifié : calcul WCAG des couples ci-dessus + axe-core dans Chrome (règle `color-contrast`) sur 15 écrans à 390 et 1024 px : 0 anomalie de contraste. Les valeurs sont les seules à modifier dans `site/style.css`, `site/index.html` (`theme-color`), `site/icon.svg` et `site/manifest.webmanifest`.
