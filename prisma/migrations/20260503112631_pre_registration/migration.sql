-- CreateTable
CREATE TABLE "PreRegistration" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "orgType" "OrgType" NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "region" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistration_email_key" ON "PreRegistration"("email");

-- CreateIndex
CREATE INDEX "PreRegistration_createdAt_idx" ON "PreRegistration"("createdAt");
