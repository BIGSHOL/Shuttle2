-- W24: DriverAppRelease에 SHA256·파일 크기 컬럼 추가.
-- 베타 운영자가 APK 무결성을 확인하고, 다운로드 전에 파일 크기를 학원장에게
-- 안내할 수 있도록. 둘 다 NULL 허용 (기존 release row 호환 + 점진 도입).

ALTER TABLE "DriverAppRelease"
  ADD COLUMN "sha256" TEXT,
  ADD COLUMN "fileSizeBytes" INTEGER;
