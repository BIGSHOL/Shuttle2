-- W26-A: SafetyCheck schema 확장 — refac Driver Run.html 9개 항목 모두 영구 저장.
-- pre-trip 4개 (seatbelt + emergencyLight + doorLock + capacity)
-- post-trip 4개 (allAlighted + cabinLock + keyReturned + recordReviewed)
-- + helperPresent (helper 배정 시 자동 mark)
--
-- 기존 client useState 4개(emergencyLightOk·doorLockOk·capacityOk·cabinLockOk·
-- keyReturnedOk·recordReviewedOk)는 reload 시 0/4 리셋 — 베타 차단 이슈.
-- 도교법 §53 의무라 영구 저장 필수.
--
-- 모든 신규 컬럼 NOT NULL DEFAULT false — 기존 row 안전.
-- RLS는 W7 baseline(20260503111858_enable_rls_baseline)에서 이미 enable됨.

ALTER TABLE "SafetyCheck"
  ADD COLUMN "emergencyLightOk" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "doorLockOk"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "capacityOk"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cabinLockOk"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "keyReturnedOk"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recordReviewedOk" BOOLEAN NOT NULL DEFAULT false;
