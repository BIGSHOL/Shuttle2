-- training-certificates 버킷은 anon/authenticated 모두 거부.
-- 모든 read/write는 service_role(서버 액션의 admin client) 통해서만.
-- service_role은 RLS bypass라 이 deny policy 무관하게 동작.
-- 명시적 deny는 감사·보안 명확성을 위함 (default deny 동작에 의존하지 않음).
CREATE POLICY "training_certs_no_anon_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id <> 'training-certificates');

CREATE POLICY "training_certs_no_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id <> 'training-certificates');

CREATE POLICY "training_certs_no_anon_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id <> 'training-certificates');

CREATE POLICY "training_certs_no_anon_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'training-certificates');
