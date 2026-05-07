// GET /api/driver-app/version — 기사 RN 앱이 시작 시 호출하는 버전 체크.
// 새 APK 있으면 강제 업데이트 prompt 띄움 (apps/driver-rn/src/lib/version-check.ts).
//
// W24: DriverAppRelease 모델의 isActive=true row가 있으면 그 값을 우선,
// 없으면 ENV fallback. 매니저 UI(/admin/apk)에서 row 추가·flip.

import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  // DB 우선
  try {
    const active = await db.driverAppRelease.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (active) {
      return NextResponse.json({
        latestVersion: active.version,
        downloadUrl: active.apkUrl,
        minRequiredVersion: active.version,
        releaseNotes: active.releaseNotes ?? "",
      });
    }
  } catch (err) {
    console.error("[driver-app/version] DB lookup failed", err);
    // ENV fallback으로 계속.
  }
  // ENV fallback (베타 동안 점진 이행)
  return NextResponse.json({
    latestVersion: process.env.DRIVER_APP_LATEST_VERSION ?? "1.0.0",
    downloadUrl: process.env.DRIVER_APP_LATEST_APK_URL ?? "",
    minRequiredVersion:
      process.env.DRIVER_APP_MIN_REQUIRED_VERSION ?? "1.0.0",
    releaseNotes: process.env.DRIVER_APP_RELEASE_NOTES ?? "",
  });
}
