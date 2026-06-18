
CREATE TABLE public.hoa_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hoa_forms TO authenticated;
GRANT ALL ON public.hoa_forms TO service_role;
ALTER TABLE public.hoa_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_read_authenticated" ON public.hoa_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "forms_admin_write" ON public.hoa_forms FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_hoa_forms_updated_at BEFORE UPDATE ON public.hoa_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
