-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TRIP_STARTED', 'STUDENT_BOARDED', 'STUDENT_DROPPED_OFF', 'STUDENT_NO_SHOW', 'STUDENT_NO_DROPOFF', 'TRIP_DELAYED', 'TRIP_ENDED', 'ABSENCE_REQUESTED', 'ABSENCE_APPROVED', 'ABSENCE_REJECTED', 'STOP_CHANGE_REQUESTED', 'STOP_CHANGE_APPROVED', 'STOP_CHANGE_REJECTED', 'ANNOUNCEMENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AbsenceStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "AbsenceRequest" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedBy" TEXT,
ADD COLUMN     "rejectReason" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopChangeRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toLat" DOUBLE PRECISION NOT NULL,
    "toLng" DOUBLE PRECISION NOT NULL,
    "toAddress" TEXT,
    "reason" TEXT,
    "effectiveAt" DATE NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "resultStopId" TEXT,

    CONSTRAINT "StopChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "StopChangeRequest_orgId_status_idx" ON "StopChangeRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "StopChangeRequest_studentId_idx" ON "StopChangeRequest"("studentId");

-- CreateIndex
CREATE INDEX "StopChangeRequest_createdBy_idx" ON "StopChangeRequest"("createdBy");

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopChangeRequest" ADD CONSTRAINT "StopChangeRequest_resultStopId_fkey" FOREIGN KEY ("resultStopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
