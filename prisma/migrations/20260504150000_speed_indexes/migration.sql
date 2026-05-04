-- 자주 쓰이는 외래키·orgId·userId·tripId 컬럼에 누락된 인덱스 추가.
-- 베타 데이터량은 작아 일반 CREATE INDEX(짧은 lock) 사용. IF NOT EXISTS로 idempotent.

-- 인증 lookup (모든 페이지 진입에서 호출)
CREATE INDEX IF NOT EXISTS "Staff_userId_idx" ON "Staff"("userId");
CREATE INDEX IF NOT EXISTS "Guardian_userId_idx" ON "Guardian"("userId");

-- 멀티테넌시 필터 (dashboard 카운트 + 도메인 CRUD)
CREATE INDEX IF NOT EXISTS "Vehicle_orgId_idx" ON "Vehicle"("orgId");
CREATE INDEX IF NOT EXISTS "Staff_orgId_idx" ON "Staff"("orgId");
CREATE INDEX IF NOT EXISTS "Stop_orgId_idx" ON "Stop"("orgId");
CREATE INDEX IF NOT EXISTS "Student_orgId_idx" ON "Student"("orgId");

-- 운행 화면·학부모 home에서 join용
CREATE INDEX IF NOT EXISTS "Route_vehicleId_idx" ON "Route"("vehicleId");
CREATE INDEX IF NOT EXISTS "RouteStudent_studentId_idx" ON "RouteStudent"("studentId");

-- driver run 진입 시 활성 trip 조회 + dashboard·trip 상세에서 boarding 집계
CREATE INDEX IF NOT EXISTS "Trip_driverId_date_idx" ON "Trip"("driverId", "date");
CREATE INDEX IF NOT EXISTS "BoardingEvent_tripId_type_idx" ON "BoardingEvent"("tripId", "type");
