// RN 앱 root component.
// 세션 + screen 상태로 단순 navigation. Day 7 또는 그 이후 react-navigation
// 도입 검토 — 베타에는 useState 기반 간단 stack으로 충분.
//
// 화면 흐름:
//   loading → login (미인증) → run-list → trip → run-list (종료 후)
//   run-list ↔ notifications

import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  onFcmForegroundMessage,
  onFcmTokenRefresh,
  registerFcmToken,
  unregisterFcmToken,
} from "./src/lib/push";
import { isSupabaseConfigured, supabase } from "./src/lib/supabase";
import { checkAppVersion } from "./src/lib/version-check";
import { LoginScreen } from "./src/screens/LoginScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { RunListScreen } from "./src/screens/RunListScreen";
import { TripScreen } from "./src/screens/TripScreen";

type Screen =
  | { kind: "loading" }
  | { kind: "config-error"; message: string }
  | { kind: "login" }
  | { kind: "run-list" }
  | { kind: "trip"; tripId: string }
  | { kind: "notifications" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const fcmRegistered = useRef(false);

  useEffect(() => {
    // ENV 미설정 시 즉시 에러 화면. 흰 화면 대신 사용자가 원인을 보게.
    if (!isSupabaseConfigured) {
      setScreen({
        kind: "config-error",
        message:
          "앱 환경 설정이 누락되었습니다. APK를 새로 받아 설치해 주세요. (담당자: EAS 빌드의 EXPO_PUBLIC_SUPABASE_URL / ANON_KEY 확인)",
      });
      return;
    }

    // 앱 시작 시 version check (실패는 무시 — fire-and-forget)
    void checkAppVersion();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setScreen(data.session ? { kind: "run-list" } : { kind: "login" });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "세션 확인 실패";
        setScreen({
          kind: "config-error",
          message: `로그인 서버에 연결할 수 없습니다.\n\n${msg}`,
        });
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setScreen((current) => {
        if (!session) return { kind: "login" };
        if (current.kind === "trip" || current.kind === "notifications")
          return current;
        return { kind: "run-list" };
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // FCM 토큰 등록 — 로그인 후 1회 (앱이 살아있는 동안)
  useEffect(() => {
    const isAuthed =
      screen.kind === "run-list" ||
      screen.kind === "trip" ||
      screen.kind === "notifications";
    if (!isAuthed || fcmRegistered.current) return;
    fcmRegistered.current = true;
    void registerFcmToken().catch(() => {});

    const unsubRefresh = onFcmTokenRefresh(() => {
      void registerFcmToken().catch(() => {});
    });
    const unsubMsg = onFcmForegroundMessage((msg) => {
      if (msg.title) {
        Alert.alert(msg.title, msg.body);
      }
    });

    return () => {
      unsubRefresh();
      unsubMsg();
    };
  }, [screen.kind]);

  async function handleLogout() {
    await unregisterFcmToken().catch(() => {});
    fcmRegistered.current = false;
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {screen.kind === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      ) : screen.kind === "config-error" ? (
        <View style={styles.configError}>
          <Text style={styles.configErrorTitle}>앱을 시작할 수 없습니다</Text>
          <Text style={styles.configErrorBody}>{screen.message}</Text>
        </View>
      ) : screen.kind === "login" ? (
        <LoginScreen />
      ) : screen.kind === "run-list" ? (
        <RunListScreen
          onTripStarted={(tripId) => setScreen({ kind: "trip", tripId })}
          onNotifications={() => setScreen({ kind: "notifications" })}
          onLogout={handleLogout}
        />
      ) : screen.kind === "trip" ? (
        <TripScreen
          tripId={screen.tripId}
          onEnd={() => setScreen({ kind: "run-list" })}
        />
      ) : (
        <NotificationsScreen onClose={() => setScreen({ kind: "run-list" })} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  configError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 32,
  },
  configErrorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
    textAlign: "center",
  },
  configErrorBody: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
  },
});
