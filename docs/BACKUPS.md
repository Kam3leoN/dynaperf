# Sauvegardes DynaPerf (Edge Functions)

## `backup-all` (JSON vers Storage)

- **Auth** : JWT d’un utilisateur `super_admin`, **ou** en-tête `Authorization: Bearer <BACKUP_CRON_SECRET>`.
- **Secret** : définir `BACKUP_CRON_SECRET` dans **Supabase → Edge Functions → Secrets** (valeur aléatoire longue). Utiliser la **même** valeur pour le planificateur (cron GitHub Actions, n8n, etc.) qui appelle `POST /functions/v1/backup-all`.
- **Sortie** : fichier JSON sous `avatars/backups/backup_<timestamp>.json` (service role ; pas de RLS bloquant).

## `sql-backup` (dump INSERT)

- **Auth** : idem `backup-all` (super admin ou `BACKUP_CRON_SECRET`).
- **Obligatoire** : secret Edge `SUPABASE_DB_URL` **ou** `DATABASE_URL` = chaîne **Postgres directe** (port **5432**, *Session mode* dans le dashboard Supabase). Le pooler transactionnel (port **6543**) fait échouer la connexion : la fonction renvoie une erreur explicite. Après ajout du secret, **redéployer** `sql-backup`.
- **Sortie** : `avatars/backups/sql/dump_<timestamp>.sql` (défaut), **ou** corps du fichier SQL en réponse si le corps JSON contient `{ "output": "inline" }` (téléchargement depuis **Admin → Sauvegardes**).

### « Failed to send a request to the Edge Function » (navigateur)

Ce message vient du **client JS** : la requête **n’atteint pas** l’URL `https://<ref>.supabase.co/functions/v1/...` (pas de réponse HTTP). Ce n’est pas une erreur Postgres ni un 401/500 renvoyé par Deno.

À vérifier : `VITE_SUPABASE_URL` correct au **build** du front, fonctions **`backup-all`** et **`sql-backup`** déployées sur **ce** projet, onglet Réseau (F12), pare-feu / bloqueur, URL en `https`.

### Important : GitHub ≠ Supabase (où mettre `SUPABASE_DB_URL`)

- **`SUPABASE_DB_URL` dans GitHub** (Secrets Actions) **ne sert pas** au code de l’Edge Function. Le workflow CRON n’envoie que des en-têtes HTTP ; il ne transmet pas la chaîne Postgres à Deno.
- Pour que **`sql-backup` fonctionne** (page **Admin → Sauvegardes** pour les super-admins **ou** appel CRON), le secret doit exister dans **Supabase → Project Settings → Edge Functions → Secrets** sous le nom `SUPABASE_DB_URL` ou `DATABASE_URL` — **même valeur** que vous utiliseriez pour une connexion directe (port 5432).
- En résumé : déclarer `SUPABASE_DB_URL` **uniquement** sur GitHub ne suffit pas ; il faut aussi (ou seulement, selon le besoin) la **même variable côté Supabase Edge**.

## Déploiement

```bash
npx supabase functions deploy backup-all
npx supabase functions deploy sql-backup
```

## Test manuel (curl)

Remplace `PROJECT_REF`, `ANON_KEY`, `SECRET`.

```bash
curl -sS -X POST "https://PROJECT_REF.supabase.co/functions/v1/backup-all" \
  -H "Authorization: Bearer SECRET" \
  -H "apikey: ANON_KEY"
```

## Cron **natif Supabase** (alternative à GitHub Actions)

Oui : avec **`pg_cron`** + **`pg_net`**, Postgres envoie un `POST` HTTP vers `/functions/v1/backup-all` et `/functions/v1/sql-backup` — pas besoin de workflow GitHub si tu préfères tout garder côté Supabase.

Guide pas à pas (Vault, SQL, suppression des jobs) : **[`docs/BACKUPS_SUPABASE_CRON.md`](BACKUPS_SUPABASE_CRON.md)** — voir aussi la [doc officielle « Scheduling Edge Functions »](https://supabase.com/docs/guides/functions/schedule-functions).

### Console navigateur : « pas d’erreur »

Si la barre de filtre du DevTools contient du texte (ex. `import.meta.env…`), la console peut **paraître vide** alors que des erreurs existent (compteur rouge en haut). Vide le filtre pour voir les vrais messages / onglet **Réseau** pour l’appel vers `…/functions/v1/backup-all`.

## GitHub Actions (`.github/workflows/supabase-backups-cron.yml`)

Planification quotidienne (**minuit UTC** ; GitHub utilise le fuseau UTC) : le workflow appelle `backup-all` puis `sql-backup`.

**Secrets du dépôt** (Settings → Secrets and variables → Actions) :

| Secret | Obligatoire | Rôle |
|--------|-------------|------|
| `BACKUP_CRON_SECRET` | oui | Identique au secret Edge `BACKUP_CRON_SECRET` sur Supabase. |
| `SUPABASE_ANON_KEY` **ou** `VITE_SUPABASE_PUBLISHABLE_KEY` | oui (l’un des deux) | Même valeur que dans le `.env` / build Vite (`apikey` pour les appels `curl`). |
| `SUPABASE_URL` **ou** `VITE_SUPABASE_URL` | non | Surcharge de l’URL projet ; sinon `https://<project_id>.supabase.co` est déduit de `supabase/config.toml`. |

Tu peux réutiliser **exactement** les mêmes noms que pour le front (`VITE_*`) : le workflow les accepte sans dupliquer les secrets sous d’autres noms.

**Secret `BACKUP_CRON_SECRET` :** à créer à la fois dans **Supabase → Edge Functions → Secrets** et dans **GitHub → Actions secrets** (même valeur). Voir [`docs/SUPABASE_SECURITY.md`](SUPABASE_SECURITY.md).

### Dépannage « Secrets manquants » sur GitHub Actions

1. Les secrets doivent être créés sur **le dépôt qui exécute le workflow** (branche par défaut, ex. `main`), pas seulement en local : **Settings → Secrets and variables → Actions → New repository secret**.
2. Noms **exactes** : `SUPABASE_ANON_KEY` et `BACKUP_CRON_SECRET` (casse, pas d’espace).
3. Un fork sans secrets échouera tant que vous n’y ajoutez pas vos propres valeurs (ou vous utilisez des [environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) avec secrets d’environnement).
4. Après ajout des secrets, relancez manuellement le workflow (**Actions → Supabase backups (CRON) → Run workflow**).
5. **Secrets d’organisation** : si vous utilisez *Organization secrets*, le dépôt doit être **explicitement autorisé** (liste des repos autorisés). Sinon les variables arrivent vides dans le job.
6. **Même projet partout** : la clé `SUPABASE_ANON_KEY` est liée au *project ref* dans le JWT. Elle doit être celle du **même** projet que `project_id` dans `supabase/config.toml` (ou que l’URL si vous surchargez `SUPABASE_URL`). Sinon le workflow échoue avec une erreur « ref incohérent ».
7. **Collage** : un retour à la ligne en trop dans un secret peut casser les en-têtes HTTP ; le workflow **normalise** (trim) les valeurs.
