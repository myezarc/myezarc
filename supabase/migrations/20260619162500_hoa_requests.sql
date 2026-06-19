CREATE TABLE IF NOT EXISTS public.hoa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_hoa_name text NOT NULL,
  community_address text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  contact_name text,
  phone text NOT NULL,
  email text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.hoa_requests TO authenticated;
GRANT ALL ON public.hoa_requests TO service_role;

ALTER TABLE public.hoa_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own HOA requests" ON public.hoa_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Staff view all HOA requests" ON public.hoa_requests
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Users insert own pending HOA requests" ON public.hoa_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins update HOA requests" ON public.hoa_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS hoa_requests_updated_at ON public.hoa_requests;
CREATE TRIGGER hoa_requests_updated_at BEFORE UPDATE ON public.hoa_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
