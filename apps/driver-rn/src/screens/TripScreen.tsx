// 운행 진행 화면 — 디자인 토큰 통일 (1.0.5).
// PWA 풀 디자인 매칭(dark gradient header 등)은 1.0.6에 미루고, 색상·라운드·
// LivePulseDot 적용으로 일관성 확보.
//
// useTripKeepAwake + Trip detail fetch + Background GPS tracker + 정류장별
// BoardingRow + KIDS SafetyCheckCard.

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
import { translateError } from "@shuttlee/shared-contracts/auth-errors";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Feather } from "../components/Icon";
import { LivePulseDot } from "../components/LivePulseDot";
import { ModeBadge } from "../components/ModeBadge";
import { DirectionBadge } from "../components/DirectionBadge";
import { apiFetch } from "../lib/api-client";
import { startGps, stopGps, type GpsStop } from "../lib/gps";
import { useTripKeepAwake } from "../lib/keep-awake";
import { colors, radii, radiiExt, shadows } from "../lib/theme";
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

  const handleMarkStopPassed = useCallback(
    async (routeStopId: string) => {
      setStopPassPending((p) => new Set(p).add(routeStopId));
      setPassedStops((p) => new Set(p).add(routeStopId));
      try {
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
        Alert.alert("도착 마킹 실패", translateError(e));
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
      Alert.alert("불러오기 실패", translateError(e));
    }
  }, [tripId]);

  useEffect(() => {
    void refetchDetail();
  }, [refetchDetail]);

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
          setGpsError(translateError(e));
        }
      });

    return () => {
      cancelled = true;
      void stopGps();
    };
  }, [tripId, detail]);

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
            Alert.alert("운행 종료 실패", translateError(e));
            setEnding(false);
          }
        },
      },
    ]);
  }, [ending, onEnd, tripId]);

  if (!detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.bus} />
      </View>
    );
  }

  const displayPing = latestSelfPing ?? receivedPing;
  const isKids = detail.vehicle.mode === "KIDS";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <DirectionBadge direction={detail.route.direction} />
            <ModeBadge mode={detail.vehicle.mode} />
          </View>
          <Text style={styles.title}>{detail.route.name}</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.plate}>{detail.vehicle.plate}</Text>
          </Text>
        </View>

        {/* GPS 상태 표시 */}
        <Card style={styles.statusCard}>
          <View style={styles.statusLeft}>
            {gpsStarted && !gpsError ? (
              <LivePulseDot size={10} />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  gpsError ? styles.statusDotError : styles.statusDotIdle,
                ]}
              />
            )}
            <Text style={styles.statusText} numberOfLines={1}>
              {gpsError
                ? "GPS 오류"
                : gpsStarted
                  ? "운행 중 · 위치 송신 중"
                  : "위치 시작 중…"}
            </Text>
          </View>
          <Text style={styles.statusMeta}>
            채널 {status === "ok" ? "✓" : status === "error" ? "✗" : "…"}
          </Text>
        </Card>

        {gpsError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color={colors.warning} />
            <Text style={styles.errorBannerText}>{gpsError}</Text>
          </View>
        ) : null}

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
            <Card key={stop.routeStopId} style={styles.stopBlock}>
              <View style={styles.stopHeader}>
                <View
                  style={[
                    styles.stopOrderBox,
                    passed && styles.stopOrderBoxPassed,
                  ]}
                >
                  <Text
                    style={[
                      styles.stopOrderText,
                      passed && styles.stopOrderTextPassed,
                    ]}
                  >
                    {passed ? "✓" : stop.order}
                  </Text>
                </View>
                <View style={styles.stopMain}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopMeta}>
                    {stop.scheduledAt} · 학생 {stop.students.length}명 · 반경{" "}
                    {stop.radiusM}m
                  </Text>
                </View>
                {canMark ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.markPassedButton,
                      stopPending && styles.disabled,
                      pressed && { opacity: 0.85 },
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
            </Card>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          variant="destructive"
          size="lg"
          onPress={handleEnd}
          disabled={ending}
          loading={ending}
          leadingIcon={
            <Feather
              name="square"
              size={14}
              color={colors.destructiveForeground}
            />
          }
        >
          {ending ? "종료 중..." : "운행 종료"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  container: { flex: 1, backgroundColor: colors.muted },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { gap: 6, marginBottom: 4 },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  plate: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.foreground,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  statusDotIdle: { backgroundColor: colors.warning },
  statusDotError: { backgroundColor: colors.destructive },
  statusText: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "700",
    flex: 1,
  },
  statusMeta: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning + "60",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: "600",
    flex: 1,
  },
  pingCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.muted,
    borderRadius: radii.md,
  },
  pingValue: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.foreground,
  },
  pingMeta: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  stopBlock: {
    overflow: "hidden",
    padding: 0,
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.muted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stopOrderBox: {
    width: 28,
    height: 28,
    borderRadius: radiiExt.xl,
    backgroundColor: colors.bus,
    alignItems: "center",
    justifyContent: "center",
  },
  stopOrderBoxPassed: {
    backgroundColor: colors.success,
  },
  stopOrderText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.busForeground,
  },
  stopOrderTextPassed: {
    color: colors.successForeground,
  },
  stopMain: {
    flex: 1,
    minWidth: 0,
  },
  stopName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
  },
  stopMeta: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
    fontWeight: "500",
  },
  markPassedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bus,
    backgroundColor: colors.busSoft,
  },
  disabled: { opacity: 0.5 },
  markPassedText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.busForeground,
  },
  emptyStudents: {
    padding: 14,
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  studentList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
});
