-- Update cmalzat's role from admin to super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'cmalzat@dynabuy.fr')
  AND role = 'admin';

-- Update the handle_new_user trigger to assign super_admin to cmalzat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  IF NEW.email = 'cmalzat@dynabuy.fr' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update has_role so super_admin passes admin checks too
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND (role = _role OR (role = 'super_admin' AND _role = 'admin'))
  )
$$;