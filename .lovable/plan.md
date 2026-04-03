

## Plan: Remplacer `auto_no_show` par un champ "Statistique %" générique

### Problème
Le champ `auto_no_show` fait une soustraction fixe (invités - participants). L'utilisateur veut un champ **statistique avec pourcentage** calculé automatiquement à partir de 2 champs number au choix, avec un libellé personnalisable.

Formule : `(source_1 / source_2) * 100` affichée en `%`

Exemple : invités=10, participants=8 → `(8/10)*100 = 80%`

### Modifications

**1. AuditFormBuilder.tsx**
- Remplacer `auto_no_show` par `stat_percent` dans `FIELD_TYPES_SMART` avec le label "📊 Statistique % (calcul auto)"
- Renommer les states `sourceInvites`/`sourceParticipants` → `sourceField1`/`sourceField2` avec des labels génériques "Champ numérateur" et "Champ dénominateur"
- Stocker dans `field_options` : `{ source_numerator: fieldId, source_denominator: fieldId }`
- Le libellé du champ est libre (ex: "Taux de participation", "Taux de no-show", etc.)

**2. StepZeroForm.tsx**
- Supprimer le `useEffect` et le rendu `auto_no_show`
- Ajouter le cas `stat_percent` :
  - `useEffect` qui surveille les 2 champs sources et calcule `(numerator / denominator) * 100`
  - Affichage en lecture seule avec le résultat formaté en `XX.X %`
  - Si le dénominateur est 0, afficher `—`
- Retirer le mapping `auto_no_show` de `FIELD_TYPE_TO_DATA_KEY`

### Fichiers modifiés
- `src/components/AuditFormBuilder.tsx`
- `src/components/audit-stepper/StepZeroForm.tsx`

