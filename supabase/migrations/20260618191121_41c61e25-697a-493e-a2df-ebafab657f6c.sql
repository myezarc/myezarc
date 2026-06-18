DROP POLICY IF EXISTS arc_docs_authenticated_read_guidelines ON storage.objects;
CREATE POLICY arc_docs_authenticated_read_member_files ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'arc-documents'
  AND (storage.foldername(name))[1] IN ('guidelines','arc-forms')
);