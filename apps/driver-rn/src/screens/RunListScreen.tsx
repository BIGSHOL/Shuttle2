// 오늘 운행 노선 리스트 — `/api/driver/today-routes` 호출.
// PWA의 /run/page.tsx와 동일 데이터, 동일 렌더링 흐름.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../lib/api-client";

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

type ActiveTrip = { id: string; routeId: string; routeName: string } | null;

type TodayRoutesResponse = {
  routes: Route[];
  activeTrip: ActiveTrip;
};

type Props = {
  onTripStarted: (tripId: string) => void;
  onNotifications: () => void;
  onLogout: () => void;
};

export function RunListScreen({ onTripStarted, onNotifications, onLogout }: Props) {
  const [data, setData] = useState<TodayRoutesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await apiFetch<TodayRoutesResponse>(
        "/api/driver/today-routes",
      );
      setData(res);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "노선 불러오기 실패");
    }
  }, []);

  useEffect(() => {
    fetchRoutes().finally(() => setLoading(false));
  }, [fetchRoutes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  }, [fetchRoutes]);

  async function startTrip(routeId: string, vehicleId: string) {
    if (starting) return;
    setStarting(true);
    try {
      const res = await apiFetch<{ tripId: string }>("/api/driver/trip/start", {
        method: "POST",
        body: { routeId, vehicleId },
      });
      onTripStarted(res.tripId);
    } catch (e) {
      Alert.alert("운행 시작 실패", e instanceof Error ? e.message : "");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasActiveTrip = data?.activeTrip != null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>오늘 운행</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onNotifications} hitSlop={12}>
            <Text style={styles.headerLink}>알림</Text>
          </Pressable>
          <Pressable onPress={onLogout} hitSlop={12}>
            <Text style={styles.headerLink}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      {hasActiveTrip && data?.activeTrip ? (
        <Pressable
          style={styles.activeBanner}
          onPress={() => onTripStarted(data.activeTrip!.id)}
        >
          <Text style={styles.activeBannerLabel}>진행 중</Text>
          <Text style={styles.activeBannerName}>
            {data.activeTrip.routeName} 이어가기 →
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        data={data?.routes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>오늘 배정된 노선이 없어요</Text>
            <Text style={styles.emptyBody}>
              학원장(원장)이 노선을 추가하면 여기 표시됩니다.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPickup = item.direction === "PICKUP";
          const isKids = item.vehicleMode === "KIDS";
          const disabled =
            item.stopCount === 0 || starting || hasActiveTrip;
          return (
            <View style={styles.card}>
              <View style={styles.tagRow}>
                <View
                  style={[
                    styles.tag,
                    isPickup ? styles.tagPickup : styles.tagDropoff,
                  ]}
                >
                  <Text style={styles.tagText}>
                    {isPickup ? "등원" : "하원"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tag,
                    isKids ? styles.tagKids : styles.tagGeneral,
                  ]}
                >
                  <Text style={styles.tagText}>
                    {isKids ? "어린이용" : "일반용"}
                  </Text>
                </View>
              </View>
              <Text style={styles.routeName}>{item.name}</Text>
              <View style={styles.metaRow}>
                {item.firstScheduledAt ? (
                  <Text style={styles.meta}>{item.firstScheduledAt}</Text>
                ) : null}
                <Text style={styles.meta}>정류장 {item.stopCount}개</Text>
                <Text style={styles.metaPlate}>{item.vehiclePlate}</Text>
              </View>
              <Pressable
                style={[
                  styles.startButton,
                  disabled && styles.startButtonDisabled,
                ]}
                onPress={() => startTrip(item.id, item.vehicleId)}
                disabled={disabled}
              >
                {starting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.startButtonText}>운행 시작</Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111" },
  headerActions: { flexDirection: "row", gap: 16 },
  headerLink: { fontSize: 13, color: "#666" },
  activeBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#facc15",
    borderRadius: 8,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#000",
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  activeBannerName: { fontSize: 16, fontWeight: "800", color: "#000" },
  list: { padding: 16, paddingTop: 0, gap: 10 },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  emptyBody: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  card: {
    padding: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  tagRow: { flexDirection: "row", gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPickup: { backgroundColor: "#dcfce7" },
  tagDropoff: { backgroundColor: "#dbeafe" },
  tagKids: { backgroundColor: "#fef3c7" },
  tagGeneral: { backgroundColor: "#f3f4f6" },
  tagText: { fontSize: 10, fontWeight: "800", color: "#111" },
  routeName: { fontSize: 16, fontWeight: "800", color: "#111" },
  metaRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { fontSize: 12, color: "#666" },
  metaPlate: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  startButton: {
    height: 40,
    backgroundColor: "#facc15",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { fontSize: 14, fontWeight: "800", color: "#000" },
});
