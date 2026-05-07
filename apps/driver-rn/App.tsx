// RN 앱 root component.
// 세션 + screen 상태로 단순 navigation. Day 7 또는 그 이후 react-navigation
// 도입 검토 — 베타에는 useState 기반 간단 stack으로 충분.
//
// 화면 흐름:
//   loading → login (미인증) → run-list → trip → run-list (종료 후)
//   run-list ↔ notifications
//
// W23-E 1.0.2 수술:
// - <ErrorBoundary>로 모든 render·setState throw를 잡아 흰 화면 대신 한국어 에러 메시지로.
// - FCM useEffect 본문도 try/catch — onTokenRefresh/onMessage가 native 미초기화 상태에서 throw 가능.

import { StatusBar } from "expo-status-bar";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

// React Error Boundary — render·setState 단계의 어떤 throw든 잡아서
// 흰 화면 대신 명확한 한국어 에러 메시지(스택 포함)를 노출.
// JS 모듈 로드 시점 throw는 못 잡지만, 그 이후 발생 에러는 모두 캡처.
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[AppErrorBoundary]", error);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.boundary}>
          <Text style={styles.boundaryTitle}>앱 오류</Text>
          <Text style={styles.boundaryMessage}>
            {this.state.error.message ?? String(this.state.error)}
          </Text>
          {this.state.error.stack ? (
            <ScrollView style={styles.boundaryStackBox}>
              <Text style={styles.boundaryStack} selectable>
                {this.state.error.stack}
              </Text>
            </ScrollView>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

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

  // FCM 토큰 등록 — 로그인 후 1회 (앱이 살아있는 동안).
  // native messaging() 호출이 동기 throw할 가능성 있어 try/catch로 보호.
  useEffect(() => {
    const isAuthed =
      screen.kind === "run-list" ||
      screen.kind === "trip" ||
      screen.kind === "notifications";
    if (!isAuthed || fcmRegistered.current) return;
    fcmRegistered.current = true;
    void registerFcmToken().catch(() => {});

    let unsubRefresh: (() => void) | null = null;
    let unsubMsg: (() => void) | null = null;
    try {
      unsubRefresh = onFcmTokenRefresh(() => {
        void registerFcmToken().catch(() => {});
      });
      unsubMsg = onFcmForegroundMessage((msg) => {
        if (msg.title) {
          Alert.alert(msg.title, msg.body);
        }
      });
    } catch (e) {
      console.warn("FCM listeners failed:", e);
    }

    return () => {
      try {
        unsubRefresh?.();
      } catch {
        /* ignore */
      }
      try {
        unsubMsg?.();
      } catch {
        /* ignore */
      }
    };
  }, [screen.kind]);

  async function handleLogout() {
    await unregisterFcmToken().catch(() => {});
    fcmRegistered.current = false;
    await supabase.auth.signOut();
  }

  return (
    <AppErrorBoundary>
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
          <NotificationsScreen
            onClose={() => setScreen({ kind: "run-list" })}
          />
        )}
      </SafeAreaProvider>
    </AppErrorBoundary>
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
  boundary: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 64,
  },
  boundaryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#b91c1c",
    marginBottom: 12,
  },
  boundaryMessage: {
    fontSize: 14,
    color: "#111",
    marginBottom: 16,
  },
  boundaryStackBox: {
    flex: 1,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  boundaryStack: {
    fontSize: 11,
    color: "#374151",
    fontFamily: "monospace",
  },
});
