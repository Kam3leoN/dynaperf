-- Étape 1/2 : nouvelles valeurs d’enum uniquement.
-- PostgreSQL interdit d’utiliser une valeur d’enum nouvellement ajoutée dans la même transaction (55P04).
-- Les UPDATE / contraintes / handle_new_user sont dans 20260412120001_staff_roles_data_rank.sql

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bot';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
