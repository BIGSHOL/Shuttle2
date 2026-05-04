-- 안전교육 이수증 파일 첨부 기능. Supabase Storage object key 저장.
-- 기존 certificateUrl(외부 링크)는 그대로 두고, 사용자는 form에서 (a) 파일 또는 (b) URL 중 선택.
ALTER TABLE "TrainingRecord" ADD COLUMN "certificateFile" TEXT;
