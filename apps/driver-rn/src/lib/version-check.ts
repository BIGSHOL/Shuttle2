// 앱 시작 시 새 APK 버전 확인.
// /api/driver-app/version GET → latestVersion < currentVersion이면 prompt
// (사용자에게 "지금 업데이트" 띄움 → APK URL을 Linking.openURL).

import * as Application from "expo-application";
import { Alert, Linking } from "react-native";

import { apiFetch } from "./api-client";

type VersionResponse = {
  latestVersion: string;
  downloadUrl: string;
  minRequiredVersion: string;
  releaseNotes: string;
};

// "1.2.3" → [1, 2, 3]
function parseVersion(v: string): number[] {
  return v.split(".").map((p) => parseInt(p, 10) || 0);
}

// a < b ? -1 : a > b ? 1 : 0
function compareVersion(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export async function checkAppVersion(): Promise<void> {
  const currentVersion =
    Application.nativeApplicationVersion ?? "1.0.0";
  let info: VersionResponse;
  try {
    info = await apiFetch<VersionResponse>("/api/driver-app/version");
  } catch (e) {
    console.warn("version check failed:", e);
    return;
  }

  if (!info.downloadUrl) return;

  const isMinRequired =
    compareVersion(currentVersion, info.minRequiredVersion) < 0;
  const isOlder = compareVersion(currentVersion, info.latestVersion) < 0;

  if (!isOlder) return;

  const title = isMinRequired
    ? "필수 업데이트"
    : "새 버전이 있습니다";
  const body = `현재: ${currentVersion} → 최신: ${info.latestVersion}\n\n${info.releaseNotes || "새 APK를 받아 설치해 주세요."}`;

  Alert.alert(
    title,
    body,
    isMinRequired
      ? [
          {
            text: "지금 업데이트",
            onPress: () => {
              void Linking.openURL(info.downloadUrl).catch(() => {});
            },
          },
        ]
      : [
          { text: "나중에", style: "cancel" },
          {
            text: "지금 업데이트",
            onPress: () => {
              void Linking.openURL(info.downloadUrl).catch(() => {});
            },
          },
        ],
    { cancelable: !isMinRequired },
  );
}
