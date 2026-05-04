-- Staff·Guardian에 recoveryEmail 컬럼 추가.
-- 가입 시 사용자가 입력 (선택). 입력 시 Supabase Auth user.email = recoveryEmail로 가입,
-- 본인이 /forgot-password에서 reset 메일 직접 수신 가능. 미입력 시 placeholder 이메일로 가입.
-- @unique는 안 둠 — 한 사람이 학부모·직원 계정 둘 다 가질 수 있고, Supabase Auth user.email
-- 자체의 unique 제약이 충돌은 잡아줌.

ALTER TABLE "Staff" ADD COLUMN "recoveryEmail" TEXT;
ALTER TABLE "Guardian" ADD COLUMN "recoveryEmail" TEXT;
