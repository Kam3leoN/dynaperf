# Assets SVG pour les QR codes

Les fichiers sont **optionnels** : si un fichier manque, une forme intégrée équivalente est utilisée.

Le rendu et les vignettes du sélecteur utilisent les **fichiers numérotés** (voir `src/lib/qrShapeAssetIds.ts` pour le mapping `square` → `0.svg`, `classy` → `3.svg`, etc.).

| Dossier | Fichiers | Rôle |
|--------|----------|------|
| `dots/` | `0.svg` … `15.svg` | Module de données. ViewBox **`0 0 6 6`** recommandé ; `fill="currentColor"` ou remplissage noir. |
| `corners/` | `0.svg` … `14.svg` | Repère extérieur (cadre des « yeux »). ViewBox **`0 0 14 14`** ; le code ramène à l’échelle 7×7 modules. |
| `corners/` | `inner-<cornersDotType>.svg` (ex. `inner-dot.svg`) | Œil central 3×3. ViewBox `0 0 3 3`, `currentColor`. |
| `covers/` | `default.svg` | Texture / fond léger sous le QR (opacité ~7 % en image de fond). Optionnel. |

Après modification des SVG, vider le cache du navigateur si l’aperçu ne se met pas à jour.
