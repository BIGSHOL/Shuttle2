-- AlterTable
ALTER TABLE "AbsenceRequest" ADD COLUMN     "decisionReason" TEXT;

-- AlterTable
ALTER TABLE "StopChangeRequest" ADD COLUMN     "decisionReason" TEXT;

-- CreateTable
CREATE TABLE "RouteAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "kind" "RouteDirection" NOT NULL,
    "currentStopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteAssignmentOverride" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE NOT NULL,
    "sourceRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteAssignmentOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopChangeLedger" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromStopId" TEXT,
    "toStopId" TEXT NOT NULL,
    "appliedById" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permanent" BOOLEAN NOT NULL,

    CONSTRAINT "StopChangeLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPolicy" (
    "orgId" TEXT NOT NULL,
    "absenceAutoAck" BOOLEAN NOT NULL DEFAULT true,
    "absenceCutoffMin" INTEGER NOT NULL DEFAULT 15,
    "stopChangeAutoApprove" BOOLEAN NOT NULL DEFAULT false,
    "stopChangeRequiresReason" BOOLEAN NOT NULL DEFAULT false,
    "stopChangeMaxDays" INTEGER NOT NULL DEFAULT 30,
    "notifyParentOnDecision" BOOLEAN NOT NULL DEFAULT true,
    "notifyDriverOnApprove" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPolicy_pkey" PRIMARY KEY ("orgId")
);

-- CreateIndex
CREATE INDEX "RouteAssignment_orgId_idx" ON "RouteAssignment"("orgId");

-- CreateIndex
CREATE INDEX "RouteAssignment_routeId_idx" ON "RouteAssignment"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteAssignment_studentId_routeId_kind_key" ON "RouteAssignment"("studentId", "routeId", "kind");

-- CreateIndex
CREATE INDEX "RouteAssignmentOverride_orgId_assignmentId_effectiveFrom_idx" ON "RouteAssignmentOverride"("orgId", "assignmentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StopChangeLedger_orgId_studentId_idx" ON "StopChangeLedger"("orgId", "studentId");

-- CreateIndex
CREATE INDEX "StopChangeLedger_orgId_appliedAt_idx" ON "StopChangeLedger"("orgId", "appliedAt");

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_currentStopId_fkey" FOREIGN KEY ("currentStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignmentOverride" ADD CONSTRAINT "RouteAssignmentOverride_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignmentOverride" ADD CONSTRAINT "RouteAssignmentOverride_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RouteAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignmentOverride" ADD CONSTRAINT "RouteAssignmentOverride_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignmentOverride" ADD CONSTRAINT "RouteAssignmentOverride_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "StopChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeLedger" ADD CONSTRAINT "StopChangeLedger_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeLedger" ADD CONSTRAINT "StopChangeLedger_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StopChangeRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeLedger" ADD CONSTRAINT "StopChangeLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeLedger" ADD CONSTRAINT "StopChangeLedger_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeLedger" ADD CONSTRAINT "StopChangeLedger_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPolicy" ADD CONSTRAINT "TenantPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- W24-B RLS: 신규 4 테이블 모두 RLS 활성화. baseline 패턴(20260503111858) 따름 —
-- service_role(Prisma DIRECT_URL)은 자동 BYPASS. 다른 role은 정책 부재로 default
-- deny. 학원장·기사·학부모 흐름은 모두 server action에서 service_role 사용.
ALTER TABLE "RouteAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RouteAssignmentOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StopChangeLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantPolicy" ENABLE ROW LEVEL SECURITY;
