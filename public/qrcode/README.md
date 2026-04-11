# Assets SVG pour les QR codes

Les fichiers sont **optionnels** : si un fichier manque, une forme intégrée équivalente est utilisée.

| Dossier | Fichiers | Rôle |
|--------|----------|------|
| `dots/` | `<dotsType>.svg` | Module de données (même noms que le sélecteur : `square`, `rounded`, `extra-rounded`, etc.). ViewBox libre ; utiliser `fill="currentColor"`. |
| `corners/` | `outer-<cornersSquareType>.svg` | Repère 7×7 (cadre des « yeux »). ViewBox `0 0 7 7`, `currentColor`. |
| `corners/` | `inner-<cornersDotType>.svg` | Œil central 3×3. ViewBox `0 0 3 3`, `currentColor`. |
| `covers/` | `default.svg` | Texture / fond léger sous le QR (opacité ~7 % en image de fond). Optionnel. |

Après modification des SVG, vider le cache du navigateur si l’aperçu ne se met pas à jour.
