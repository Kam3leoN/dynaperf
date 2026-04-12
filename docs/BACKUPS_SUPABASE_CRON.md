# Cron sauvegardes **sans GitHub Actions** (Supabase natif)

Tu peux déclencher `backup-all` et `sql-backup` **depuis Postgres** avec :

- **`pg_cron`** — planification (tu l’as déjà sous *Integrations → Cron* / extension installée) ;
- **`pg_net`** — requêtes HTTP `POST` vers les Edge Functions.

Documentation officielle : [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) et [pg_net](https://supabase.com/docs/guides/database/extensions/pgnet).

## Prérequis

1. Extensions activées (souvent déjà sur le projet) :

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

2. Même auth que le `curl` / GitHub : en-têtes  
   `Authorization: Bearer <BACKUP_CRON_SECRET>`  
   et `apikey: <clé anon ou publishable>`.

3. Secrets sensibles : idéalement **[Vault](https://supabase.com/docs/guides/database/vault)** (ou variables stockées en base chiffrées), **pas** la clé en clair dans un fichier versionné.

## Exemple (à adapter : `PROJECT_REF`, secrets Vault)

Après avoir créé les secrets dans Vault (noms d’exemple : `project_url`, `anon_key`, `backup_cron_secret`) :

```sql
-- Déclenchement quotidien ~04h15 UTC : JSON puis SQL (1 min d’écart pour éviter la surcharge)
select cron.schedule(
  'dynaperf-backup-all-daily',
  '15 4 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/backup-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_cron_secret'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'dynaperf-sql-backup-daily',
  '16 4 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sql-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'backup_cron_secret'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Lister les jobs : `select * from cron.job;`  
Supprimer un job : `select cron.unschedule('dynaperf-backup-all-daily');` (selon la version, voir [doc pg_cron](https://github.com/citusdata/pg_cron)).

## Comparaison rapide

| Approche | Avantage |
|----------|----------|
| **pg_cron + pg_net** | Tout dans Supabase, pas de dépendance au dépôt GitHub / secrets Actions. |
| **GitHub Actions** | Historique des runs dans GitHub, pas besoin d’activer `pg_net`, secrets déjà sur le repo. |

Les deux appellent les **mêmes** Edge Functions ; côté Supabase Edge, il faut toujours `BACKUP_CRON_SECRET`, `SUPABASE_DB_URL` (pour `sql-backup`), etc.
