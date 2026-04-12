# Sécurité Supabase (Advisors & secrets)

## 1. Protection des mots de passe compromis (Have I Been Pwned)

**Avertissement Security Advisor :** *Leaked password protection disabled*

À corriger **dans le dashboard** (pas par migration SQL) :

1. [Supabase Dashboard](https://supabase.com/dashboard) → ton projet → **Authentication**
2. **Providers** → **Email** (ou la méthode concernée)
3. Activer **« Prevent use of leaked passwords »** / protection des mots de passe compromis (Have I Been Pwned)

Cela renforce l’inscription et les changements de mot de passe.

---

## 2. `BACKUP_CRON_SECRET` (sauvegardes CRON / Edge Functions)

Ce secret **n’est pas créé automatiquement**. Il doit exister **aux deux endroits** avec **la même valeur**.

### A) Supabase — Edge Functions → Secrets

1. Dashboard → **Edge Functions** → **Secrets**
2. **Add secret** : nom `BACKUP_CRON_SECRET`, valeur = une chaîne longue aléatoire (ex. 64 caractères hex).

Génération locale (PowerShell / bash) :

```bash
openssl rand -hex 32
```

### B) GitHub — Actions secrets

1. Dépôt GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** : `BACKUP_CRON_SECRET` = **exactement la même valeur** qu’en (A).
3. **New repository secret** : `SUPABASE_ANON_KEY` = la clé **anon** du projet (Dashboard → **Settings** → **API** → *anon public*) — même valeur que dans le `.env` de l’app.

Sans ces deux secrets, le workflow CRON échoue immédiatement (les logs affichent des variables vides si elles ne sont pas configurées sur le dépôt).

Les workflows `.github/workflows/supabase-backups-cron.yml` et les fonctions `backup-all` / `sql-backup` utilisent `BACKUP_CRON_SECRET` pour l’en-tête `Authorization: Bearer …` sans JWT utilisateur.

### C) Variables déjà présentes sur Edge

Tu dois toujours avoir au minimum sur Edge : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, et pour `sql-backup` une URL Postgres directe (`SUPABASE_DB_URL` ou `DATABASE_URL`, port **5432**).

---

## 3. Politiques RLS et fonctions (migrations)

Les correctifs *Function Search Path Mutable* et *RLS Policy Always True* ciblés par Security Advisor sont appliqués via les migrations sous `supabase/migrations/` (voir par ex. `20260428130000_security_advisor_rls_and_functions.sql`).

Après `db push` / migration : relancer un scan dans **Advisors → Security Advisor**.
