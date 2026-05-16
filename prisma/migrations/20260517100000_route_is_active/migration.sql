-- W26-B: Route.isActive 토글 추가.
-- 미사용 노선은 오늘 운행 후보·KPI에서 제외. RouteStudent 매핑은 그대로 유지되어
-- 활성화 시 즉시 복귀 (시즌·방학중 차량 전환에 활용).
-- 기존 row는 모두 활성으로 채워짐 (DEFAULT true).
-- RLS는 W7 baseline 그대로.

ALTER TABLE "Route"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Route_isActive_idx" ON "Route"("isActive");
