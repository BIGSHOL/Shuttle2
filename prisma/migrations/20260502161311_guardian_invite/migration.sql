-- CreateTable
CREATE TABLE "GuardianInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByGuardianId" TEXT,

    CONSTRAINT "GuardianInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianInviteStudent" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "GuardianInviteStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianInvite_token_key" ON "GuardianInvite"("token");

-- CreateIndex
CREATE INDEX "GuardianInvite_orgId_idx" ON "GuardianInvite"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianInviteStudent_inviteId_studentId_key" ON "GuardianInviteStudent"("inviteId", "studentId");

-- AddForeignKey
ALTER TABLE "GuardianInvite" ADD CONSTRAINT "GuardianInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianInviteStudent" ADD CONSTRAINT "GuardianInviteStudent_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "GuardianInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianInviteStudent" ADD CONSTRAINT "GuardianInviteStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
