

## Plan : Bottom Nav → Material You 3 Expressive

### Référence M3 Expressive — Navigation Bar specs

La barre de navigation M3 respecte ces dimensions et comportements :
- **Hauteur totale** : 80px (sans safe-area)
- **Active indicator (pill)** : ovale horizontal 64×32px, `border-radius: 16px`, fond `secondaryContainer` (≈ `primary/12`)
- **Icônes** : 24px, centrées dans la pill
- **Label** : 12px, `font-weight: 600`, espacement 4px sous la pill
- **Transition** : la pill apparaît/disparaît avec une animation `scale + opacity` de 200ms ease
- **Pas de border-top** visible : surface tonale `surfaceContainer` avec élévation 2 (shadow-soft)
- **Items inactifs** : icône `onSurfaceVariant`, label `onSurfaceVariant`
- **Item actif** : icône `onSecondaryContainer` (primary), label `onSurface` (foreground)

### Changements sur `BottomNav.tsx`

1. **Container `<nav>`** :
   - Remplacer `bg-card/95 border-t border-border/40` par `bg-[hsl(var(--surface-container))] shadow-soft` (surface tonale M3, pas de bordure)
   - Hauteur explicite `h-20` (80px)
   - Flex `items-center` au lieu de `items-end`

2. **Chaque item (bouton)** :
   - Flex column, `items-center justify-center`, `gap-1`, `flex-1` (répartition égale)
   - Min-width supprimé (flex-1 gère)
   - Touch target via `min-h-[48px]`

3. **Active indicator pill** :
   - Dimensions : `w-16 h-8` (64×32) — déjà en place
   - `rounded-full` (fully rounded, pas `rounded-2xl`)
   - Actif : `bg-primary/12` avec animation `scale-x` de 0→1 via transition CSS
   - Inactif : `bg-transparent`
   - Transition : `transition-all duration-200 ease-out`

4. **Icônes** : taille `h-6 w-6` (24px M3 spec au lieu de 22px)

5. **Labels** : `text-xs` (12px), `font-semibold`, actif → `text-foreground`, inactif → `text-muted-foreground`

6. **Bouton central Accueil (FAB)** : conserver le style actuel (FAB flottant noir avec logo) — c'est un choix de marque compatible M3

7. **Suppression du `scale-105`** sur l'état actif (non M3) — la pill seule suffit comme indicateur

### Fichier touché

- `src/components/BottomNav.tsx` — seul fichier modifié

