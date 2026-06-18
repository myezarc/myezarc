
-- Prevent homeowners from escalating their own application status
CREATE OR REPLACE FUNCTION public.prevent_homeowner_status_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can change application status';
  END IF;
  IF NEW.homeowner_id IS DISTINCT FROM OLD.homeowner_id THEN
    RAISE EXCEPTION 'Cannot change application owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_prevent_status_escalation ON public.applications;
CREATE TRIGGER applications_prevent_status_escalation
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_homeowner_status_escalation();

REVOKE EXECUTE ON FUNCTION public.prevent_homeowner_status_escalation() FROM PUBLIC, anon, authenticated;

-- Limit anon execution of definer helpers (still callable by authenticated for RLS)
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid) FROM anon, PUBLIC;
