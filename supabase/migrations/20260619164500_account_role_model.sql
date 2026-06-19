CREATE TABLE IF NOT EXISTS public.hoa_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hoa_id uuid NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('hoa_admin','arc_reviewer')),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hoa_id, role)
);

GRANT SELECT ON public.hoa_roles TO authenticated;
GRANT ALL ON public.hoa_roles TO service_role;

ALTER TABLE public.hoa_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'global_admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_hoa(_user_id uuid, _hoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_global_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.hoa_roles
      WHERE user_id = _user_id
        AND hoa_id = _hoa_id
        AND role = 'hoa_admin'
    )
$$;

CREATE OR REPLACE FUNCTION public.can_review_hoa(_user_id uuid, _hoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_hoa(_user_id, _hoa_id)
    OR EXISTS (
      SELECT 1
      FROM public.hoa_roles
      WHERE user_id = _user_id
        AND hoa_id = _hoa_id
        AND role = 'arc_reviewer'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_global_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'reviewer'
    )
    OR EXISTS (
      SELECT 1
      FROM public.hoa_roles
      WHERE user_id = _user_id
        AND role IN ('hoa_admin','arc_reviewer')
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_hoa(_user_id uuid, _hoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_review_hoa(_user_id, _hoa_id)
    OR public.has_approved_membership(_user_id, _hoa_id)
$$;

DROP POLICY IF EXISTS "hoa_roles_select_self_or_admin" ON public.hoa_roles;
CREATE POLICY "hoa_roles_select_self_or_admin" ON public.hoa_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_global_admin(auth.uid())
    OR public.can_manage_hoa(auth.uid(), hoa_id)
  );

DROP POLICY IF EXISTS "hoa_roles_global_or_hoa_admin_manage" ON public.hoa_roles;
CREATE POLICY "hoa_roles_global_or_hoa_admin_manage" ON public.hoa_roles
  FOR ALL TO authenticated
  USING (
    public.has_global_admin(auth.uid())
    OR (
      public.can_manage_hoa(auth.uid(), hoa_id)
      AND role = 'arc_reviewer'
    )
  )
  WITH CHECK (
    public.has_global_admin(auth.uid())
    OR (
      public.can_manage_hoa(auth.uid(), hoa_id)
      AND role = 'arc_reviewer'
    )
  );

DROP POLICY IF EXISTS "guidelines_admin_write" ON public.hoa_guidelines;
CREATE POLICY "guidelines_admin_write" ON public.hoa_guidelines
  FOR ALL TO authenticated
  USING (public.can_manage_hoa(auth.uid(), hoa_id))
  WITH CHECK (public.can_manage_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "forms_admin_write" ON public.hoa_forms;
CREATE POLICY "forms_admin_write" ON public.hoa_forms
  FOR ALL TO authenticated
  USING (public.can_manage_hoa(auth.uid(), hoa_id))
  WITH CHECK (public.can_manage_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "Admins update any membership" ON public.hoa_memberships;
CREATE POLICY "HOA admins update HOA memberships" ON public.hoa_memberships
  FOR UPDATE TO authenticated
  USING (public.can_manage_hoa(auth.uid(), hoa_id))
  WITH CHECK (public.can_manage_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "Staff view all memberships" ON public.hoa_memberships;
CREATE POLICY "HOA staff view scoped memberships" ON public.hoa_memberships
  FOR SELECT TO authenticated
  USING (public.can_review_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "Staff view all HOA requests" ON public.hoa_requests;
CREATE POLICY "Global admins view HOA requests" ON public.hoa_requests
  FOR SELECT TO authenticated
  USING (public.has_global_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update HOA requests" ON public.hoa_requests;
CREATE POLICY "Global admins update HOA requests" ON public.hoa_requests
  FOR UPDATE TO authenticated
  USING (public.has_global_admin(auth.uid()))
  WITH CHECK (public.has_global_admin(auth.uid()));

DROP POLICY IF EXISTS "applications_owner_select" ON public.applications;
CREATE POLICY "applications_owner_select" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = homeowner_id OR public.can_review_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "applications_owner_update" ON public.applications;
CREATE POLICY "applications_owner_update" ON public.applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = homeowner_id OR public.can_review_hoa(auth.uid(), hoa_id))
  WITH CHECK (auth.uid() = homeowner_id OR public.can_review_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "applications_staff_delete" ON public.applications;
CREATE POLICY "applications_staff_delete" ON public.applications
  FOR DELETE TO authenticated
  USING (public.can_review_hoa(auth.uid(), hoa_id));

DROP POLICY IF EXISTS "reviews_select" ON public.arc_reviews;
CREATE POLICY "reviews_select" ON public.arc_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR (a.homeowner_id = auth.uid() AND arc_reviews.is_final = true)
        )
    )
  );

DROP POLICY IF EXISTS "reviews_staff_write" ON public.arc_reviews;
CREATE POLICY "reviews_staff_write" ON public.arc_reviews
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND public.can_review_hoa(auth.uid(), a.hoa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND public.can_review_hoa(auth.uid(), a.hoa_id)
    )
  );

DROP POLICY IF EXISTS "appfiles_select" ON public.application_files;
CREATE POLICY "appfiles_select" ON public.application_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR a.homeowner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "appfiles_insert" ON public.application_files;
CREATE POLICY "appfiles_insert" ON public.application_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR a.homeowner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "appfiles_delete" ON public.application_files;
CREATE POLICY "appfiles_delete" ON public.application_files
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR a.homeowner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR a.homeowner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
        AND (
          public.can_review_hoa(auth.uid(), a.hoa_id)
          OR a.homeowner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "arc_docs_staff_all" ON storage.objects;
CREATE POLICY "arc_docs_hoa_staff_write" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'arc-documents'
  AND (
    public.has_global_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IN ('guidelines','arc-forms')
      AND CASE
        WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.can_manage_hoa(auth.uid(), (storage.foldername(name))[2]::uuid)
        ELSE false
      END
    )
    OR (
      (storage.foldername(name))[1] = 'applications'
      AND CASE
        WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.can_review_hoa(auth.uid(), (storage.foldername(name))[2]::uuid)
        ELSE false
      END
    )
  )
)
WITH CHECK (
  bucket_id = 'arc-documents'
  AND (
    public.has_global_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IN ('guidelines','arc-forms')
      AND CASE
        WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.can_manage_hoa(auth.uid(), (storage.foldername(name))[2]::uuid)
        ELSE false
      END
    )
    OR (
      (storage.foldername(name))[1] = 'applications'
      AND CASE
        WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.can_review_hoa(auth.uid(), (storage.foldername(name))[2]::uuid)
        ELSE false
      END
    )
  )
);

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
  IF NOT public.can_manage_hoa(auth.uid(), _hoa_id) THEN
    RAISE EXCEPTION 'HOA admin access required';
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
  IF NOT public.can_manage_hoa(auth.uid(), _hoa_id) THEN
    RAISE EXCEPTION 'HOA admin access required';
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
  _hoa_id uuid;
BEGIN
  SELECT hoa_id INTO _hoa_id
  FROM public.applications
  WHERE id = _application_id;

  IF _hoa_id IS NULL OR NOT public.can_review_hoa(auth.uid(), _hoa_id) THEN
    RAISE EXCEPTION 'ARC reviewer access required';
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

  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role IN ('admin'::public.app_role, 'global_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'An admin already exists.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'global_admin')
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_global_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_hoa(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_hoa(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_global_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_hoa(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_review_hoa(uuid, uuid) FROM anon;
