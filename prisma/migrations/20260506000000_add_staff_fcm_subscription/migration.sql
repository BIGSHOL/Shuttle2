-- W23: 기사용 RN 앱(안드로이드 사이드로드 APK) FCM 토큰 저장 테이블.
-- StaffPushSubscription(Web Push)과 별도 — 페이로드 형식·SDK가 다름.
-- src/lib/push/server.ts의 sendToStaff/sendToOwnersOfOrg가 양쪽 테이블 fan-out.

-- CreateTable
CREATE TABLE "StaffFcmSubscription" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffFcmSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffFcmSubscription_fcmToken_key" ON "StaffFcmSubscription"("fcmToken");

-- CreateIndex
CREATE INDEX "StaffFcmSubscription_staffId_idx" ON "StaffFcmSubscription"("staffId");

-- AddForeignKey
ALTER TABLE "StaffFcmSubscription" ADD CONSTRAINT "StaffFcmSubscription_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
