-- Staff·Guardian에 loginId 컬럼 추가. 이메일 대신 사용하는 로그인 식별자.
-- 영문·숫자·_ 4~20자. 학원장 발급 또는 본인 선택.
-- 기존 row는 NULL — 사용자가 다음 로그인 시점에 추가 발급 가능.

ALTER TABLE "Staff" ADD COLUMN "loginId" TEXT;
ALTER TABLE "Guardian" ADD COLUMN "loginId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Staff_loginId_key" ON "Staff"("loginId");
CREATE UNIQUE INDEX IF NOT EXISTS "Guardian_loginId_key" ON "Guardian"("loginId");
