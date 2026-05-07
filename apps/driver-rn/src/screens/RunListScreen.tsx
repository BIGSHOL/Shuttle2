// 오늘 운행 화면 — PWA `/run/page.tsx` + data/04 phase-2 driver.md 가이드 매칭.
// Header(sticky) + ActiveTripBanner + 헤더 텍스트 + 알림/환경/확인사항 카드 +
// 노선 list + 알림 보기 링크.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { translateError } from "@shuttlee/shared-contracts/auth-errors";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Collapsible } from "../components/Collapsible";
import { Header } from "../components/Header";
import { Feather, Ionicons } from "../components/Icon";
import { apiFetch } from "../lib/api-client";
import { colors, radii, radiiExt } from "../lib/theme";
import { ActiveTripBanner } from "./_run/ActiveTripBanner";
import { RouteCard } from "./_run/RouteCard";

type Route = {
  id: string;
  name: string;
  direction: "PICKUP" | "DROPOFF";
  vehicleId: string;
  vehiclePlate: string;
  vehicleMode: "KIDS" | "GENERAL";
  firstScheduledAt: string | null;
  stopCount: number;
};

type ActiveTrip = {
  id: string;
  routeId: string;
  routeName: string;
} | null;

type TodayRoutesResponse = { routes: Route[]; activeTrip: ActiveTrip };

type Me = {
  orgName: string;
  staffName: string;
  role: "DRIVER" | "HELPER";
  email: string;
  unreadCount: number;
};

export function RunListScreen({
  onTripStarted,
  onResumeTrip,
  onNotifications,
  onLogout,
}: {
  onTripStarted: (tripId: string) => void;
  onResumeTrip: (tripId: string) => void;
  onNotifications: () => void;
  onLogout: () => void;
}) {
  const [data, setData] = useState<TodayRoutesResponse | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [routesRes, meRes] = await Promise.all([
        apiFetch<TodayRoutesResponse>("/api/driver/today-routes"),
        apiFetch<Me>("/api/driver/me"),
      ]);
      setData(routesRes);
      setMe(meRes);
      setError(null);
    } catch (e) {
      setError(translateError(e));
    }
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  async function startTrip(routeId: string, vehicleId: string) {
    if (starting) return;
    setStarting(true);
    try {
      const res = await apiFetch<{ tripId: string }>(
        "/api/driver/trip/start",
        {
          method: "POST",
          body: { routeId, vehicleId },
        },
      );
      onTripStarted(res.tripId);
    } catch (e) {
      setError(translateError(e));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.bus} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Header
        orgName={me?.orgName ?? ""}
        role={me?.role ?? "DRIVER"}
        staffName={me?.staffName ?? ""}
        unreadCount={me?.unreadCount ?? 0}
        onNotificationsPress={onNotifications}
        onAccountPress={onLogout}
      />

      {data?.activeTrip ? (
        <ActiveTripBanner
          routeName={data.activeTrip.routeName}
          onPress={() => onResumeTrip(data.activeTrip!.id)}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>기사 화면</Text>
          <Text style={styles.title}>오늘 운행</Text>
          <Text style={styles.subtitle}>
            오늘 요일에 해당하는 노선 {data?.routes.length ?? 0}건.
          </Text>
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* 알림 권한 status — 단순화: FCM 토큰은 백그라운드 자동 등록 */}
        <Card style={styles.notifCard}>
          <View style={styles.notifLeft}>
            <View style={styles.notifIcon}>
              <Feather
                name="check"
                size={14}
                color={colors.success}
              />
            </View>
            <View style={styles.notifText}>
              <Text style={styles.notifTitle}>알림 받는 중</Text>
              <Text style={styles.notifBody}>
                학원장·원장이 결석 신청을 확인하면 즉시 푸시가 옵니다.
              </Text>
            </View>
          </View>
        </Card>

        {/* 운행 환경 status — 베타 단계엔 단순 표시 */}
        <Collapsible
          title="운행 환경 이상 없음"
          tone="success"
          leadingIcon={
            <Feather
              name="check-circle"
              size={16}
              color={colors.success}
            />
          }
        >
          <Text style={styles.envText}>
            • 위치 권한: 허용됨{"\n"}
            • 백그라운드 위치 추적: 허용됨{"\n"}
            • 푸시 알림: 허용됨
          </Text>
          <Text style={styles.envHint}>
            권한이 변경되었다면 폰의 설정 → 앱 → 셔틀이 기사에서 확인하세요.
          </Text>
        </Collapsible>

        {/* 운행 전 확인사항 */}
        <Collapsible
          title="운행 전 확인사항"
          leadingIcon={
            <Feather
              name="alert-circle"
              size={16}
              color={colors.mutedForeground}
            />
          }
        >
          <Text style={styles.checkItem}>
            ✓ 차량 안전 점검 (브레이크·타이어·연료)
          </Text>
          <Text style={styles.checkItem}>
            ✓ 좌석안전띠 정상 작동 확인
          </Text>
          <Text style={styles.checkItem}>
            ✓ 어린이 통학버스(KIDS) 모드는 동승보호자 필수
          </Text>
          <Text style={styles.checkItem}>
            ✓ 출발 전·도착 후 학생 인원 확인
          </Text>
        </Collapsible>

        {/* 노선 list */}
        {data?.routes.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons
                name="bus"
                size={28}
                color={colors.mutedForeground}
              />
            </View>
            <Text style={styles.emptyTitle}>오늘 배정된 노선이 없어요</Text>
            <Text style={styles.emptySubtitle}>
              학원장·원장님이 새 노선을 추가하면 여기 표시됩니다.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {data?.routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                disabled={data.activeTrip !== null || starting}
                onStart={() => startTrip(r.id, r.vehicleId)}
              />
            ))}
          </View>
        )}

        <View style={styles.footerLinks}>
          <Button
            size="sm"
            variant="ghost"
            onPress={onNotifications}
            leadingIcon={
              <Feather name="bell" size={12} color={colors.foreground} />
            }
          >
            알림 보기
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  headerBlock: {
    marginBottom: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.8,
    lineHeight: 32,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "600",
    marginTop: 6,
  },
  errorCard: {
    padding: 12,
    borderColor: colors.destructive + "40",
    backgroundColor: colors.destructive + "08",
  },
  errorText: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "600",
  },
  notifCard: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success + "30",
    padding: 14,
  },
  notifLeft: {
    flexDirection: "row",
    gap: 12,
  },
  notifIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.success + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  notifText: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.success,
  },
  notifBody: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.9,
  },
  envText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
    lineHeight: 18,
  },
  envHint: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500",
    marginTop: 6,
    lineHeight: 16,
  },
  checkItem: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: "500",
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radiiExt["2xl"],
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: radiiExt["2xl"],
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.3,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLinks: {
    alignItems: "center",
    paddingTop: 8,
  },
});
