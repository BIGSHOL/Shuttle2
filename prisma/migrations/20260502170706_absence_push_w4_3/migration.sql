-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_guardianId_idx" ON "PushSubscription"("guardianId");

-- CreateIndex
CREATE INDEX "AbsenceRequest_studentId_date_idx" ON "AbsenceRequest"("studentId", "date");

-- CreateIndex
CREATE INDEX "AbsenceRequest_createdBy_idx" ON "AbsenceRequest"("createdBy");

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
