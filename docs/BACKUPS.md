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

### Dépannage « Secrets manquants » sur GitHub Actions

1. Les secrets doivent être créés sur **le dépôt qui exécute le workflow** (branche par défaut, ex. `main`), pas seulement en local : **Settings → Secrets and variables → Actions → New repository secret**.
2. Noms **exactes** : `SUPABASE_ANON_KEY` et `BACKUP_CRON_SECRET` (casse, pas d’espace).
3. Un fork sans secrets échouera tant que vous n’y ajoutez pas vos propres valeurs (ou vous utilisez des [environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) avec secrets d’environnement).
4. Après ajout des secrets, relancez manuellement le workflow (**Actions → Supabase backups (CRON) → Run workflow**).
5. **Secrets d’organisation** : si vous utilisez *Organization secrets*, le dépôt doit être **explicitement autorisé** (liste des repos autorisés). Sinon les variables arrivent vides dans le job.
6. **Même projet partout** : la clé `SUPABASE_ANON_KEY` est liée au *project ref* dans le JWT. Elle doit être celle du **même** projet que `project_id` dans `supabase/config.toml` (ou que l’URL si vous surchargez `SUPABASE_URL`). Sinon le workflow échoue avec une erreur « ref incohérent ».
7. **Collage** : un retour à la ligne en trop dans un secret peut casser les en-têtes HTTP ; le workflow **normalise** (trim) les valeurs.
