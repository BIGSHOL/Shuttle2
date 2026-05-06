// GET /api/driver-app/version — 기사 RN 앱이 시작 시 호출하는 버전 체크.
// 새 APK 있으면 강제 업데이트 prompt 띄움 (apps/driver-rn/src/lib/version-check.ts).
//
// 환경변수 (Vercel):
//   DRIVER_APP_LATEST_VERSION         — 예: "1.0.5"
//   DRIVER_APP_LATEST_APK_URL         — Supabase Storage public URL
//   DRIVER_APP_MIN_REQUIRED_VERSION   — 이 미만이면 강제 업데이트
//   DRIVER_APP_RELEASE_NOTES          — 새 버전 변경사항 (선택)

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    latestVersion: process.env.DRIVER_APP_LATEST_VERSION ?? "1.0.0",
    downloadUrl: process.env.DRIVER_APP_LATEST_APK_URL ?? "",
    minRequiredVersion:
      process.env.DRIVER_APP_MIN_REQUIRED_VERSION ?? "1.0.0",
    releaseNotes: process.env.DRIVER_APP_RELEASE_NOTES ?? "",
  });
}
