-- StaffInvite·GuardianInvite에 loginId 컬럼 추가.
-- 학원장이 초대 발급 시 정한 로그인 아이디. 토큰 수락 시 본인이 그대로 사용.
-- unique constraint는 두지 않음 — 일시적이라 만료된 같은 loginId 다른 invite 허용.
-- 실제 충돌은 Staff/Guardian.loginId @unique에서 검증.

ALTER TABLE "StaffInvite" ADD COLUMN "loginId" TEXT;
ALTER TABLE "GuardianInvite" ADD COLUMN "loginId" TEXT;
