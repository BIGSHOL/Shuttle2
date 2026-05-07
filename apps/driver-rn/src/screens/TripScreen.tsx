// 운행 진행 화면 — Day 7 풀세트.
// useTripKeepAwake + Trip detail fetch + Background GPS tracker + 정류장별
// BoardingRow + KIDS SafetyCheckCard.
// 지도(TripMap)는 베타 후 polish 단계에서 추가 예정 — 정류장 리스트만으로
// 운행 진행은 충분.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  TripDetailPayload,
  TripPingPayload,
} from "@shuttlee/shared-contracts";

import { apiFetch } from "../lib/api-client";
import { startGps, stopGps, type GpsStop } from "../lib/gps";
import { useTripKeepAwake } from "../lib/keep-awake";
import { useTripBroadcast } from "../lib/trip-realtime";
import { BoardingRow } from "./_trip/BoardingRow";
import { SafetyCheckCard } from "./_trip/SafetyCheckCard";

type Props = {
  tripId: string;
  onEnd: () => void;
};

export function TripScreen({ tripId, onEnd }: Props) {
  useTripKeepAwake();

  const [detail, setDetail] = useState<TripDetailPayload | null>(null);
  const [ending, setEnding] = useState(false);
  const [gpsStarted, setGpsStarted] = useState(false);
  const [latestSelfPing, setLatestSelfPing] = useState<TripPingPayload | null>(
    null,
  );
  const [passedStops, setPassedStops] = useState<Set<string>>(new Set());
  const [stopPassPending, setStopPassPending] = useState<Set<string>>(
    new Set(),
  );
  const [gpsError, setGpsError] = useState<string | null>(null);

  // W23+: 정류장 수기 "도착" 마킹 — GPS 자동 감지 안 됐을 때.
  const handleMarkStopPassed = useCallback(
    async (routeStopId: string) => {
      setStopPassPending((p) => new Set(p).add(routeStopId));
      setPassedStops((p) => new Set(p).add(routeStopId));
      try {
        // routeStopId는 RouteStop.id이지만 server는 stopId(Stop.id)를 받음.
        // detail에서 매핑.
        const stop = detail?.stops.find((s) => s.routeStopId === routeStopId);
        if (!stop) throw new Error("정류장을 찾을 수 없습니다");
        await apiFetch(`/api/driver/trip/${tripId}/manual-stop-pass`, {
          method: "POST",
          body: { stopId: stop.stopId },
        });
      } catch (e) {
        setPassedStops((p) => {
          const n = new Set(p);
          n.delete(routeStopId);
          return n;
        });
        Alert.alert(
          "도착 마킹 실패",
          e instanceof Error ? e.message : "",
        );
      } finally {
        setStopPassPending((p) => {
          const n = new Set(p);
          n.delete(routeStopId);
          return n;
        });
      }
    },
    [detail, tripId],
  );

  const { latestPing: receivedPing, lastUpdate, status } =
    useTripBroadcast(tripId);
  const insets = useSafeAreaInsets();

  const refetchDetail = useCallback(async () => {
    try {
      const data = await apiFetch<TripDetailPayload>(
        `/api/driver/trip/${tripId}`,
      );
      setDetail(data);
    } catch (e) {
      Alert.alert("불러오기 실패", e instanceof Error ? e.message : "");
    }
  }, [tripId]);

  // 첫 진입 시 detail fetch
  useEffect(() => {
    void refetchDetail();
  }, [refetchDetail]);

  // GPS tracker 시작/종료 (detail 로드 후)
  useEffect(() => {
    if (!detail || detail.trip.endedAt) return;

    const stops: GpsStop[] = detail.stops.map((s) => ({
      id: s.routeStopId,
      lat: s.lat,
      lng: s.lng,
      radiusM: s.radiusM,
    }));

    let cancelled = false;
    void startGps({
      tripId,
      stops,
      onStopPassed: (stopId) => {
        setPassedStops((prev) => {
          const next = new Set(prev);
          next.add(stopId);
          return next;
        });
      },
      onLocation: (loc) => setLatestSelfPing(loc),
      onError: (msg) => {
        if (!cancelled) setGpsError(msg);
      },
    })
      .then(() => {
        if (!cancelled) setGpsStarted(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setGpsError(e instanceof Error ? e.message : "GPS 시작 실패");
        }
      });

    return () => {
      cancelled = true;
      void stopGps();
    };
  }, [tripId, detail]);

  // update 이벤트 수신 시 detail 다시 fetch (boarding/safety 변경 반영)
  useEffect(() => {
    if (!lastUpdate) return;
    void refetchDetail();
  }, [lastUpdate, refetchDetail]);

  const handleEnd = useCallback(() => {
    if (ending) return;
    Alert.alert("운행 종료", "정말 종료하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "종료",
        style: "destructive",
        onPress: async () => {
          setEnding(true);
          try {
            await stopGps();
            await apiFetch(`/api/driver/trip/${tripId}/end`, {
              method: "POST",
            });
            onEnd();
          } catch (e) {
            Alert.alert("실패", e instanceof Error ? e.message : "");
            setEnding(false);
          }
        },
      },
    ]);
  }, [ending, onEnd, tripId]);

  if (!detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const displayPing = latestSelfPing ?? receivedPing;
  const isKids = detail.vehicle.mode === "KIDS";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{detail.route.name}</Text>
          <Text style={styles.subtitle}>
            {detail.route.direction === "PICKUP" ? "등원" : "하원"} ·{" "}
            {detail.vehicle.plate} · {isKids ? "어린이용" : "일반용"}
          </Text>
        </View>

        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusDot,
              gpsStarted && styles.statusDotOk,
              gpsError && styles.statusDotError,
            ]}
          />
          <Text style={styles.statusText} numberOfLines={1}>
            {gpsError
              ? `GPS 오류: ${gpsError}`
              : gpsStarted
                ? "GPS 송신 중"
                : "GPS 시작 중…"}
          </Text>
          <Text style={styles.statusMeta}>
            채널 {status === "ok" ? "✓" : status === "error" ? "✗" : "…"}
          </Text>
        </View>

        {displayPing ? (
          <View style={styles.pingCard}>
            <Text style={styles.pingValue}>
              {displayPing.lat.toFixed(5)}, {displayPing.lng.toFixed(5)}
              {displayPing.accuracy != null
                ? `  ±${displayPing.accuracy.toFixed(0)}m`
                : ""}
            </Text>
            <Text style={styles.pingMeta}>
              {new Date(displayPing.recordedAt).toLocaleTimeString("ko-KR")}
            </Text>
          </View>
        ) : null}

        {isKids ? (
          <SafetyCheckCard
            tripId={tripId}
            vehicleMode={detail.vehicle.mode}
            safetyCheck={detail.safetyCheck}
            onChange={refetchDetail}
          />
        ) : null}

        {/* 정류장별 학생 list */}
        {detail.stops.map((stop) => {
          const passed = passedStops.has(stop.routeStopId);
          const stopPending = stopPassPending.has(stop.routeStopId);
          const canMark = !passed && !detail.trip.endedAt;
          return (
            <View key={stop.routeStopId} style={styles.stopBlock}>
              <View style={styles.stopHeader}>
                <Text style={styles.stopOrder}>{stop.order}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName}>
                    {passed ? "✓ " : ""}
                    {stop.name}
                  </Text>
                  <Text style={styles.stopMeta}>
                    {stop.scheduledAt} · 학생 {stop.students.length}명 · 반경{" "}
                    {stop.radiusM}m
                  </Text>
                </View>
                {canMark ? (
                  <Pressable
                    style={[
                      styles.markPassedButton,
                      stopPending && styles.markPassedDisabled,
                    ]}
                    onPress={() => void handleMarkStopPassed(stop.routeStopId)}
                    disabled={stopPending}
                  >
                    <Text style={styles.markPassedText}>
                      {stopPending ? "처리 중" : "도착"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {stop.students.length === 0 ? (
                <Text style={styles.emptyStudents}>
                  이 정류장에는 학생이 없어요.
                </Text>
              ) : (
                <View style={styles.studentList}>
                  {stop.students.map((student) => (
                    <BoardingRow
                      key={student.id}
                      tripId={tripId}
                      student={student}
                      direction={detail.route.direction}
                      events={detail.events}
                      onChange={refetchDetail}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.endButton, ending && styles.endButtonDisabled]}
          onPress={handleEnd}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.endButtonText}>운행 종료</Text>
          )}
        </Pressable>
      </View>
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
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 13, color: "#666" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#facc15",
  },
  statusDotOk: { backgroundColor: "#22c55e" },
  statusDotError: { backgroundColor: "#ef4444" },
  statusText: { fontSize: 12, color: "#374151", flex: 1 },
  statusMeta: { fontSize: 11, color: "#9ca3af" },
  pingCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  pingValue: { fontSize: 12, fontFamily: "monospace", color: "#111" },
  pingMeta: { fontSize: 10, color: "#666", marginTop: 2 },
  stopBlock: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  stopOrder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#facc15",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },
  stopName: { fontSize: 14, fontWeight: "800", color: "#111" },
  stopMeta: { fontSize: 11, color: "#666", marginTop: 2 },
  markPassedButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#facc15",
    backgroundColor: "#fff",
  },
  markPassedDisabled: { opacity: 0.5 },
  markPassedText: { fontSize: 12, fontWeight: "800", color: "#92400e" },
  emptyStudents: {
    padding: 12,
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  studentList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  endButton: {
    height: 48,
    backgroundColor: "#dc2626",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonDisabled: { opacity: 0.5 },
  endButtonText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
