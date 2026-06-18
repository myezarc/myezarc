
-- ============= updated_at helper =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============= Profiles =============
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= Roles =============
CREATE TYPE public.app_role AS ENUM ('homeowner', 'reviewer', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('reviewer','admin')
  )
$$;

-- Profile RLS
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- user_roles RLS
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto profile + default homeowner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'homeowner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= HOA Guidelines =============
CREATE TABLE public.hoa_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hoa_guidelines TO authenticated;
GRANT ALL ON public.hoa_guidelines TO service_role;
ALTER TABLE public.hoa_guidelines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_guidelines_updated_at BEFORE UPDATE ON public.hoa_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "guidelines_read_authenticated" ON public.hoa_guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "guidelines_admin_write" ON public.hoa_guidelines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= Applications =============
CREATE TYPE public.application_status AS ENUM
  ('submitted','in_review','approved','conditional','rejected','changes_requested');

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  homeowner_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  application_pdf_path TEXT,
  extracted_text TEXT,
  status public.application_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "applications_owner_select" ON public.applications FOR SELECT TO authenticated
  USING (auth.uid() = homeowner_id OR public.is_staff(auth.uid()));
CREATE POLICY "applications_owner_insert" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = homeowner_id);
CREATE POLICY "applications_owner_update" ON public.applications FOR UPDATE TO authenticated
  USING (auth.uid() = homeowner_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = homeowner_id OR public.is_staff(auth.uid()));
CREATE POLICY "applications_staff_delete" ON public.applications FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ============= Application files =============
CREATE TABLE public.application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_files TO authenticated;
GRANT ALL ON public.application_files TO service_role;
ALTER TABLE public.application_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appfiles_select" ON public.application_files FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.homeowner_id = auth.uid()
    )
  );
CREATE POLICY "appfiles_insert" ON public.application_files FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.homeowner_id = auth.uid()
    )
  );
CREATE POLICY "appfiles_delete" ON public.application_files FOR DELETE TO authenticated
  USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.homeowner_id = auth.uid()
    )
  );

-- ============= ARC reviews =============
CREATE TYPE public.review_decision AS ENUM ('approved','conditional','rejected');

CREATE TABLE public.arc_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision public.review_decision NOT NULL,
  summary TEXT,
  findings JSONB,
  homeowner_message TEXT,
  form_section JSONB,
  model TEXT,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arc_reviews TO authenticated;
GRANT ALL ON public.arc_reviews TO service_role;
ALTER TABLE public.arc_reviews ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_arc_reviews_updated_at BEFORE UPDATE ON public.arc_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "reviews_select" ON public.arc_reviews FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id AND a.homeowner_id = auth.uid() AND arc_reviews.is_final = true
    )
  );
CREATE POLICY "reviews_staff_write" ON public.arc_reviews FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ============= Messages =============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.homeowner_id = auth.uid()
    )
  );
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.is_staff(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.homeowner_id = auth.uid()
      )
    )
  );

-- ============= Storage bucket policies (bucket created via tool) =============
-- Storage object policies for arc-documents bucket
CREATE POLICY "arc_docs_staff_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'arc-documents' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'arc-documents' AND public.is_staff(auth.uid()));

CREATE POLICY "arc_docs_owner_app_files" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'arc-documents'
    AND (storage.foldername(name))[1] = 'applications'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'arc-documents'
    AND (storage.foldername(name))[1] = 'applications'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "arc_docs_authenticated_read_guidelines" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'arc-documents' AND (storage.foldername(name))[1] = 'guidelines');
