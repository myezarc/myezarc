-- Multi-HOA security hardening and transactional helpers.

ALTER TABLE public.hoa_guidelines
  ADD COLUMN IF NOT EXISTS hoa_id uuid REFERENCES public.hoas(id) ON DELETE CASCADE;

ALTER TABLE public.hoa_forms
  ADD COLUMN IF NOT EXISTS hoa_id uuid REFERENCES public.hoas(id) ON DELETE CASCADE;

UPDATE public.hoa_guidelines
SET hoa_id = (SELECT id FROM public.hoas ORDER BY created_at LIMIT 1)
WHERE hoa_id IS NULL;

UPDATE public.hoa_forms
SET hoa_id = (SELECT id FROM public.hoas ORDER BY created_at LIMIT 1)
WHERE hoa_id IS NULL;

UPDATE public.applications
SET hoa_id = (SELECT id FROM public.hoas ORDER BY created_at LIMIT 1)
WHERE hoa_id IS NULL;

ALTER TABLE public.hoa_guidelines ALTER COLUMN hoa_id SET NOT NULL;
ALTER TABLE public.hoa_forms ALTER COLUMN hoa_id SET NOT NULL;
ALTER TABLE public.applications ALTER COLUMN hoa_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_guideline_per_hoa
  ON public.hoa_guidelines (hoa_id)
  WHERE is_active;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_form_per_hoa
  ON public.hoa_forms (hoa_id)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.has_approved_membership(_user_id uuid, _hoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hoa_memberships
    WHERE user_id = _user_id
      AND hoa_id = _hoa_id
      AND status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_hoa(_user_id uuid, _hoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff(_user_id) OR public.has_approved_membership(_user_id, _hoa_id)
$$;

DROP POLICY IF EXISTS "guidelines_read_authenticated" ON public.hoa_guidelines;
DROP POLICY IF EXISTS "guidelines_admin_write" ON public.hoa_guidelines;
CREATE POLICY "guidelines_read_hoa_members_or_staff" ON public.hoa_guidelines
  FOR SELECT TO authenticated
  USING (public.can_access_hoa(auth.uid(), hoa_id));
CREATE POLICY "guidelines_admin_write" ON public.hoa_guidelines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "forms_read_authenticated" ON public.hoa_forms;
DROP POLICY IF EXISTS "forms_admin_write" ON public.hoa_forms;
CREATE POLICY "forms_read_hoa_members_or_staff" ON public.hoa_forms
  FOR SELECT TO authenticated
  USING (public.can_access_hoa(auth.uid(), hoa_id));
CREATE POLICY "forms_admin_write" ON public.hoa_forms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "applications_owner_insert" ON public.applications;
DROP POLICY IF EXISTS "applications_owner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_owner_update" ON public.applications;
CREATE POLICY "applications_owner_select" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = homeowner_id OR public.is_staff(auth.uid()));
CREATE POLICY "applications_owner_insert" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = homeowner_id
    AND (
      public.is_staff(auth.uid())
      OR public.has_approved_membership(auth.uid(), hoa_id)
    )
  );

DROP POLICY IF EXISTS arc_docs_authenticated_read_member_files ON storage.objects;
DROP POLICY IF EXISTS arc_docs_authenticated_read_guidelines ON storage.objects;
CREATE POLICY arc_docs_read_hoa_resources ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'arc-documents'
  AND (
    public.is_staff(auth.uid())
    OR (
      (storage.foldername(name))[1] IN ('guidelines','arc-forms')
      AND CASE
        WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.can_access_hoa(auth.uid(), (storage.foldername(name))[2]::uuid)
        ELSE false
      END
    )
  )
);
CREATE POLICY "applications_owner_update" ON public.applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = homeowner_id OR public.is_staff(auth.uid()))
  WITH CHECK (
    public.is_staff(auth.uid())
    OR (
      auth.uid() = homeowner_id
      AND public.has_approved_membership(auth.uid(), hoa_id)
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_membership_scope_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change membership user';
  END IF;
  IF NEW.hoa_id IS DISTINCT FROM OLD.hoa_id THEN
    RAISE EXCEPTION 'Cannot change membership HOA';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hoa_memberships_prevent_scope_change ON public.hoa_memberships;
CREATE TRIGGER hoa_memberships_prevent_scope_change
BEFORE UPDATE ON public.hoa_memberships
FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_scope_change();

CREATE OR REPLACE FUNCTION public.activate_hoa_guideline(
  _hoa_id uuid,
  _title text,
  _storage_path text,
  _extracted_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_hoa_id::text || ':guideline'));

  UPDATE public.hoa_guidelines
  SET is_active = false
  WHERE hoa_id = _hoa_id AND is_active = true;

  INSERT INTO public.hoa_guidelines (
    hoa_id,
    title,
    storage_path,
    extracted_text,
    is_active,
    uploaded_by
  )
  VALUES (_hoa_id, _title, _storage_path, _extracted_text, true, auth.uid())
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_hoa_form(
  _hoa_id uuid,
  _title text,
  _storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_hoa_id::text || ':form'));

  UPDATE public.hoa_forms
  SET is_active = false
  WHERE hoa_id = _hoa_id AND is_active = true;

  INSERT INTO public.hoa_forms (
    hoa_id,
    title,
    storage_path,
    is_active,
    uploaded_by
  )
  VALUES (_hoa_id, _title, _storage_path, true, auth.uid())
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_arc_review(
  _application_id uuid,
  _review_id uuid,
  _decision public.review_decision,
  _homeowner_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _review_count integer;
  _app_count integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.arc_reviews
  SET
    decision = _decision,
    homeowner_message = _homeowner_message,
    is_final = true,
    reviewer_id = auth.uid()
  WHERE id = _review_id
    AND application_id = _application_id;

  GET DIAGNOSTICS _review_count = ROW_COUNT;
  IF _review_count <> 1 THEN
    RAISE EXCEPTION 'Review not found for application';
  END IF;

  UPDATE public.applications
  SET status = _decision::text::public.application_status
  WHERE id = _application_id;

  GET DIAGNOSTICS _app_count = ROW_COUNT;
  IF _app_count <> 1 THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  INSERT INTO public.messages (
    application_id,
    sender_id,
    body,
    is_system
  )
  VALUES (_application_id, auth.uid(), _homeowner_message, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('claim_first_admin'));

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'An admin already exists.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_approved_membership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_hoa(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_hoa_guideline(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_hoa_form(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_arc_review(uuid, uuid, public.review_decision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.prevent_membership_scope_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_approved_membership(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_hoa(uuid, uuid) FROM anon;
