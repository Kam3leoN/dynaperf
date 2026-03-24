
-- Messages table for internal messaging
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Activity history table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_log" ON public.activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert activity_log" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers for auto-logging
CREATE OR REPLACE FUNCTION public.log_audit_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details)
    VALUES (auth.uid(), 'create', 'audit', NEW.id, NEW.partenaire, jsonb_build_object('type', NEW.type_evenement, 'date', NEW.date));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details)
    VALUES (auth.uid(), 'update', 'audit', NEW.id, NEW.partenaire, jsonb_build_object('type', NEW.type_evenement, 'note', NEW.note));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details)
    VALUES (auth.uid(), 'delete', 'audit', OLD.id, OLD.partenaire, '{}'::jsonb);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_activity AFTER INSERT OR UPDATE OR DELETE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_activity();

CREATE OR REPLACE FUNCTION public.log_partenaire_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'create', 'partenaire', NEW.id, NEW.prenom || ' ' || NEW.nom);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'update', 'partenaire', NEW.id, NEW.prenom || ' ' || NEW.nom);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'delete', 'partenaire', OLD.id, OLD.prenom || ' ' || OLD.nom);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_partenaire_activity AFTER INSERT OR UPDATE OR DELETE ON public.partenaires
  FOR EACH ROW EXECUTE FUNCTION public.log_partenaire_activity();

CREATE OR REPLACE FUNCTION public.log_club_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'create', 'club', NEW.id, NEW.nom);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'update', 'club', NEW.id, NEW.nom);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'delete', 'club', OLD.id, OLD.nom);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_club_activity AFTER INSERT OR UPDATE OR DELETE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.log_club_activity();

CREATE OR REPLACE FUNCTION public.log_suivi_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details)
    VALUES (auth.uid(), 'create', 'suivi', NEW.id, NEW.agence, jsonb_build_object('date', NEW.date));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details)
    VALUES (auth.uid(), 'update', 'suivi', NEW.id, NEW.agence, jsonb_build_object('date', NEW.date));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label)
    VALUES (auth.uid(), 'delete', 'suivi', OLD.id, OLD.agence);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_suivi_activity AFTER INSERT OR UPDATE OR DELETE ON public.suivi_activite
  FOR EACH ROW EXECUTE FUNCTION public.log_suivi_activity();
