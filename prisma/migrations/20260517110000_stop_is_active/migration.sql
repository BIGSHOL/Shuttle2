-- W26-E: Stop.isActive 토글 추가.
-- 미사용 정류장은 신규 노선·학생 배정 picker에서 제외 (RouteStop·RouteStudent
-- 매핑은 그대로 유지되어 재활성화 시 즉시 복귀 — 계절·임시 폐쇄·공사 시나리오).
-- 기존 row는 모두 활성으로 채워짐 (DEFAULT true).
-- RLS는 W7 baseline 그대로.

ALTER TABLE "Stop"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Stop_orgId_isActive_idx" ON "Stop"("orgId", "isActive");
