

## Plan: Champs intelligents enrichis + Stats automatiques

### Problèmes identifiés
1. Pas de champ intelligent "Heure" (seul le type standard `time` existe, sans liaison DB)
2. "Qualité lieu" est figé — impossible de personnaliser le libellé (ex: "Qualité de l'outil visio")
3. Les anciennes cases calculées automatiquement (no-show = invités − participants) ont disparu

### Modifications

**1. AuditFormBuilder.tsx — Nouveaux champs intelligents**
- Ajouter `heure_picker` dans `FIELD_TYPES_SMART` : "🔗 Heure (saisie)"
- Renommer `qualite_lieu_rating` → `qualite_rating` avec libellé personnalisable (le label du champ dans le Form Builder servira d'intitulé affiché, ex: "Qualité de l'outil visio")
- Ajouter `auto_no_show` : "🔗 No-show (calcul auto)" — champ en lecture seule qui se calcule automatiquement à partir de deux autres champs number configurés comme "source invités" et "source participants"
- Ajouter dans le dialog de création : quand le type est `auto_no_show`, afficher deux sélecteurs pour choisir le champ source "Invités" et le champ source "Participants" parmi les champs number existants. Ces références sont stockées dans `field_options` : `{ source_invites: fieldId, source_participants: fieldId }`

**2. StepZeroForm.tsx — Rendu des nouveaux types**
- `heure_picker` : `<Input type="time" />` avec liaison vers `heureEvenement` dans `FIELD_TYPE_TO_DATA_KEY`
- `qualite_rating` : identique à l'ancien `qualite_lieu_rating` mais le label affiché est celui configuré dans le Form Builder (déjà le cas via `field.field_label`). Conserver le mapping DB vers `qualiteLieu` pour compatibilité
- `auto_no_show` : champ numérique en lecture seule. Un `useEffect` surveille les valeurs des champs sources (`source_invites` et `source_participants` depuis `field_options`) et calcule automatiquement `invités - participants`. La valeur est stockée dans `customFieldValues` et aussi mappée vers `nbNoShow` dans StepZeroData pour la sauvegarde DB
- Mettre à jour `FIELD_TYPE_TO_DATA_KEY` avec les nouveaux mappings

**3. Rétrocompatibilité**
- L'ancien type `qualite_lieu_rating` reste supporté dans le rendu (fallback) pour les audits existants
- Les champs `nbInvites`, `nbParticipants`, `nbNoShow` dans `audit_details` continuent d'être alimentés via les `customFieldValues` mappés

### Fichiers modifiés
- `src/components/AuditFormBuilder.tsx` — nouveaux types smart + UI source selector pour auto_no_show
- `src/components/audit-stepper/StepZeroForm.tsx` — rendu des nouveaux types + calcul auto no-show
- `src/pages/AuditForm.tsx` — mapping des nouvelles clés vers le payload `audit_details`

