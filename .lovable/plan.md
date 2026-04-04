

## Plan: Historique des améliorations

### Champ stat_diff (Différence A − B)
- Nouveau type intelligent "📊 Différence (A − B, valeur absolue)" dans le Form Builder
- Calcul automatique sans signe +/− contrairement à stat_sum
- Utilisable comme champ source pour le scoring automatique des items

### Migration PWA vers Serwist
- Remplacement de vite-plugin-pwa par @serwist/vite + serwist + @serwist/window
- Service worker personnalisé (src/sw.ts) avec runtime caching optimisé
- Manifest déplacé vers public/manifest.json
- Registration conditionnelle (pas en iframe/preview)

### Optimisations performances
- Lazy-loading de toutes les routes (sauf Welcome/Auth)
- QueryClient configuré avec staleTime 5min, gcTime 30min, refetchOnWindowFocus:false
- Suspense wrappers dans ProtectedRoute/AdminRoute
