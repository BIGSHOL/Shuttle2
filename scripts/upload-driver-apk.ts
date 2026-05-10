// Driver RN APK를 Supabase Storage(driver-apks public bucket)에 업로드.
// 새 EAS preview 빌드 끝낼 때마다 사용. 결과 public URL을 Vercel env
// DRIVER_APP_LATEST_APK_URL에 등록하면 RN 앱이 시작 시 version-check로
// 자동 다운로드 prompt 띄움.
//
// 사용:
//   pnpm dotenv -e .env.local -- tsx scripts/upload-driver-apk.ts <apk-path> [<storage-name>]
// 예:
//   pnpm dotenv -e .env.local -- tsx scripts/upload-driver-apk.ts data/build.apk v1.0.0.apk

import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

async function main() {
  const apkPath = process.argv[2];
  const storageName = process.argv[3] ?? "v1.0.0.apk";

  if (!apkPath) {
    console.error(
      "usage: tsx scripts/upload-driver-apk.ts <apk-path> [<storage-name>]",
    );
    process.exit(1);
  }
  if (!fs.existsSync(apkPath)) {
    console.error(`apk not found: ${apkPath}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const apkBuffer = fs.readFileSync(apkPath);
  const sizeMb = (apkBuffer.byteLength / 1024 / 1024).toFixed(1);

  // RN APK는 native deps 포함 100MB 가까울 수 있음 — bucket default 50MB
  // 초과 가능. 업로드 전 limit을 200MB로 보장.
  const { error: bucketError } = await supabase.storage.updateBucket(
    "driver-apks",
    {
      public: true,
      fileSizeLimit: 200 * 1024 * 1024,
    },
  );
  if (bucketError) {
    console.warn(
      "updateBucket warning (계속 시도):",
      bucketError.message ?? bucketError,
    );
  }

  console.log(`Uploading ${path.basename(apkPath)} (${sizeMb} MB) → driver-apks/${storageName}`);

  const { error: uploadError } = await supabase.storage
    .from("driver-apks")
    .upload(storageName, apkBuffer, {
      contentType: "application/vnd.android.package-archive",
      upsert: true,
    });

  if (uploadError) {
    console.error("upload failed:", uploadError);
    process.exit(1);
  }

  const { data } = supabase.storage.from("driver-apks").getPublicUrl(storageName);
  console.log("✅ uploaded.");
  console.log(`PUBLIC_URL=${data.publicUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
