-- HOAs
CREATE TABLE public.hoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hoas TO authenticated;
GRANT ALL ON public.hoas TO service_role;
ALTER TABLE public.hoas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view HOAs" ON public.hoas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage HOAs" ON public.hoas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER hoas_updated_at BEFORE UPDATE ON public.hoas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hoas (name, slug, description)
VALUES ('Park Avenue HOA','park-avenue','Park Avenue Homeowners Association');

-- Membership status enum
CREATE TYPE public.membership_status AS ENUM ('pending','approved','rejected');

-- Memberships
CREATE TABLE public.hoa_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hoa_id uuid NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  status public.membership_status NOT NULL DEFAULT 'pending',
  street_address text NOT NULL,
  unit text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  note text,
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hoa_id)
);
GRANT SELECT, INSERT, UPDATE ON public.hoa_memberships TO authenticated;
GRANT ALL ON public.hoa_memberships TO service_role;
ALTER TABLE public.hoa_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own membership" ON public.hoa_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all memberships" ON public.hoa_memberships
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users insert own pending membership" ON public.hoa_memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Users update own rejected membership" ON public.hoa_memberships
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'rejected')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins update any membership" ON public.hoa_memberships
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER hoa_memberships_updated_at BEFORE UPDATE ON public.hoa_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hoa_memberships
    WHERE user_id = _user_id AND status = 'approved'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;

-- Applications: scope to HOA
ALTER TABLE public.applications ADD COLUMN hoa_id uuid REFERENCES public.hoas(id);