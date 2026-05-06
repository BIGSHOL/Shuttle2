// W23: 기사용 RN 앱(안드로이드 사이드로드 APK)으로 FCM 푸시.
// firebase-admin SDK는 Node.js 서버 전용. lazy singleton 패턴으로 첫 호출 시
// 초기화. VAPID 키 미설정 시 web-push가 no-op 되는 것과 동일.
//
// 환경변수:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY  ("\n"이 escape된 형태로도 OK — 자동 unescape)

import "server-only";

import admin from "firebase-admin";

import type { NotificationCategory } from "@/generated/prisma/enums";

let app: admin.app.App | null = null;
let configured = false;

function ensureFirebase(): admin.app.App | null {
  if (configured) return app;
  configured = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.warn(
      "FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY 미설정 — FCM 발송 no-op.",
    );
    return null;
  }

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // PEM 줄바꿈이 escape된 경우 자동 복원 (Vercel 환경변수에서 흔한 케이스)
        privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
      }),
    });
    return app;
  } catch (e) {
    console.warn("Firebase Admin 초기화 실패:", e);
    return null;
  }
}

export type FcmPayload = {
  title: string;
  body: string;
  url?: string;
  category: NotificationCategory;
};

export async function sendOneFcm(
  token: string,
  payload: FcmPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  const fbApp = ensureFirebase();
  if (!fbApp) return { ok: false, gone: false };

  try {
    await fbApp.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: {
        url: payload.url ?? "",
        category: payload.category,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          priority: "max",
          sound: "default",
        },
      },
    });
    return { ok: true, gone: false };
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      return { ok: false, gone: true };
    }
    console.warn("FCM send failed:", code || err);
    return { ok: false, gone: false };
  }
}
