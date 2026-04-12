# Sauvegardes DynaPerf (Edge Functions)

## `backup-all` (JSON vers Storage)

- **Auth** : JWT d’un utilisateur `super_admin`, **ou** en-tête `Authorization: Bearer <BACKUP_CRON_SECRET>`.
- **Secret** : définir `BACKUP_CRON_SECRET` dans **Supabase → Edge Functions → Secrets** (valeur aléatoire longue). Utiliser la **même** valeur pour le planificateur (cron GitHub Actions, n8n, etc.) qui appelle `POST /functions/v1/backup-all`.
- **Sortie** : fichier JSON sous `avatars/backups/backup_<timestamp>.json` (service role ; pas de RLS bloquant).

## `sql-backup` (dump INSERT)

- **Auth** : idem `backup-all` (super admin ou `BACKUP_CRON_SECRET`).
- **Obligatoire** : `SUPABASE_DB_URL` **ou** `DATABASE_URL` = chaîne **Postgres directe** (port **5432**, *Session mode* dans le dashboard Supabase). Le pooler transactionnel (port 6543) peut faire échouer `postgresjs`.
- **Sortie** : `avatars/backups/sql/dump_<timestamp>.sql`.

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

## GitHub Actions (`.github/workflows/supabase-backups-cron.yml`)

Planification quotidienne : le workflow appelle `backup-all` puis `sql-backup`.

**Secrets du dépôt** (Settings → Secrets and variables → Actions) :

| Secret | Obligatoire | Rôle |
|--------|-------------|------|
| `SUPABASE_ANON_KEY` | oui | Même clé anon que l’app (`apikey` pour les Edge Functions). |
| `BACKUP_CRON_SECRET` | oui | Identique au secret Edge `BACKUP_CRON_SECRET` sur Supabase. |
| `SUPABASE_URL` | non | Surcharge de l’URL ; sinon `https://<project_id>.supabase.co` est déduit de `supabase/config.toml`. |

L’URL du projet n’a plus besoin d’être dupliquée en secret : elle suit le `project_id` versionné dans le dépôt.

**Secret `BACKUP_CRON_SECRET` :** à créer à la fois dans **Supabase → Edge Functions → Secrets** et dans **GitHub → Actions secrets** (même valeur). Voir [`docs/SUPABASE_SECURITY.md`](SUPABASE_SECURITY.md).
