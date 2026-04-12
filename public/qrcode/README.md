# Assets SVG pour les QR codes

Les fichiers sont **optionnels** : si un fichier manque, une forme intégrée équivalente est utilisée.

Le rendu et les vignettes du sélecteur utilisent les **fichiers numérotés** (`dotModuleId` / `cornerInnerModuleId` 0–15, `cornerOuterModuleId` 0–14 dans `src/lib/qrCodeStyle.ts` ; les anciens champs `dotsType`, `cornersSquareType`, `cornersDotType` sont migrés au chargement).

| Dossier | Fichiers | Rôle |
|--------|----------|------|
| `dots/` | `0.svg` … `15.svg` | Module de données. ViewBox **`0 0 6 6`** recommandé ; `fill="currentColor"` ou remplissage noir. |
| `corners/` | `0.svg` … `14.svg` | Repère extérieur (cadre des « yeux »). ViewBox **`0 0 14 14`** ; le code ramène à l’échelle 7×7 modules. |
| *(idem `dots/`)* | — | **Centre des repères** : mêmes fichiers que `dots/` (`cornerInnerModuleId`), pavés en grille **3×3** dans la zone œil. |
| `covers/` | `default.svg` | Texture / fond léger sous le QR (opacité ~7 % en image de fond). Optionnel. |

Après modification des SVG, vider le cache du navigateur si l’aperçu ne se met pas à jour.
