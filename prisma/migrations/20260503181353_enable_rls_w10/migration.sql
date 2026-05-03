-- W10 RLS baseline — W7-1 패턴 미러.
-- Notification + StopChangeRequest 모두 service_role bypass라 코드 영향 0.
-- anon 키 deny by default.

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StopChangeRequest" ENABLE ROW LEVEL SECURITY;
