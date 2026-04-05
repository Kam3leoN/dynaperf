-- Contenu fusionné dans 20260411103000_conversation_salons_admin_crud.sql
-- (is_member_of_conversation_group avec row_security off, politiques « Members can read groups » / « Members can read group members »).
-- Ce fichier reste pour l’ordre des versions ; un second DROP/CREATE sur conversation_groups provoquait des deadlocks avec le pooler / clients actifs.

SELECT 1;
