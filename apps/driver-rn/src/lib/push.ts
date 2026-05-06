// FCM 토큰 등록·해제·메시지 listener.
// @react-native-firebase/messaging 기반. google-services.json은 사용자가
// Firebase Console에서 다운로드 후 apps/driver-rn/ 루트에 위치 (Day 8 사용자 작업).
// app.json plugin이 빌드 시점에 자동 복사.

import messaging from "@react-native-firebase/messaging";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { apiFetch } from "./api-client";

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  // Android 13+는 POST_NOTIFICATIONS runtime permission. messaging이 자동 처리.
  // app.json android.permissions에 POST_NOTIFICATIONS 명시되어 있음.
  return true;
}

export async function registerFcmToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn("FCM 권한 거부됨");
      return null;
    }
    const token = await messaging().getToken();
    if (!token) return null;

    await apiFetch("/api/driver/fcm-subscription", {
      method: "POST",
      body: {
        fcmToken: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        appVersion: Constants.expoConfig?.version ?? undefined,
      },
    });
    return token;
  } catch (e) {
    console.warn("FCM register failed:", e);
    return null;
  }
}

export async function unregisterFcmToken(): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (!token) return;
    await apiFetch("/api/driver/fcm-subscription", {
      method: "DELETE",
      body: { fcmToken: token },
    }).catch(() => {});
    await messaging().deleteToken();
  } catch (e) {
    console.warn("FCM unregister failed:", e);
  }
}

export function onFcmTokenRefresh(
  handler: (token: string) => void,
): () => void {
  return messaging().onTokenRefresh(handler);
}

// 앱이 foreground일 때 메시지 수신 (background는 시스템이 자동 알림 표시).
export function onFcmForegroundMessage(
  handler: (msg: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  }) => void,
): () => void {
  return messaging().onMessage((remoteMessage) => {
    handler({
      title: remoteMessage.notification?.title ?? undefined,
      body: remoteMessage.notification?.body ?? undefined,
      data: remoteMessage.data,
    });
  });
}
