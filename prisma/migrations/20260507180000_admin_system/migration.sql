-- W24: 셔틀이 플랫폼 매니저(어드민) 시스템.
-- Organization.status로 학원 일시정지·트라이얼 만료 표시.
-- AdminAuditLog로 매니저 작업 추적 (impersonation·비번 reset·plan 변경).
-- DriverAppRelease로 기사 RN 앱 APK 버전 관리 (ENV → DB 점진 이행).

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL_EXPIRED');

-- AlterTable: Organization 운영 상태 컬럼
ALTER TABLE "Organization" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendReason" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetOrgId" TEXT,
    "targetUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_actorEmail_createdAt_idx" ON "AdminAuditLog"("actorEmail", "createdAt");
CREATE INDEX "AdminAuditLog_targetOrgId_createdAt_idx" ON "AdminAuditLog"("targetOrgId", "createdAt");

-- CreateTable: DriverAppRelease
CREATE TABLE "DriverAppRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "apkUrl" TEXT NOT NULL,
    "releaseNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverAppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverAppRelease_version_key" ON "DriverAppRelease"("version");
CREATE INDEX "DriverAppRelease_isActive_createdAt_idx" ON "DriverAppRelease"("isActive", "createdAt");

-- RLS — service_role bypass라 코드 영향 0, anon deny by default
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DriverAppRelease" ENABLE ROW LEVEL SECURITY;
