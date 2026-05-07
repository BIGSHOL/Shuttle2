// 운행 진행 화면 dark gradient 헤더 — PWA trip-running-view.tsx 매칭.
// 좌측: 방향·모드 배지 + 노선명 + 차량번호 / 우측: 경과 시간 (mono).
// 하단 상태 칩 줄: 화면잠금·위치·기사·동승.
// 노란 accent stripe (top 3px, bg-bus).

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { Feather } from "../../components/Icon";
import { colors, radii, shadows } from "../../lib/theme";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export function TripHeader({
  routeName,
  direction,
  vehiclePlate,
  vehicleMode,
  driverName,
  helperName,
  elapsed,
  gpsState,
}: {
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  vehiclePlate: string;
  vehicleMode: "KIDS" | "GENERAL";
  driverName: string;
  helperName: string | null;
  elapsed: string;
  gpsState: "ok" | "error" | "idle";
}) {
  const isPickup = direction === "PICKUP";
  const isKids = vehicleMode === "KIDS";

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#1a1c22", "#0f1014"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* 노란 accent stripe (top) */}
        <View style={styles.stripe} />

        <View style={styles.row}>
          <View style={styles.leftCol}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.dirBadge,
                  isPickup ? styles.dirPickup : styles.dirDropoff,
                ]}
              >
                <Text
                  style={[
                    styles.dirText,
                    {
                      color: isPickup ? colors.success : colors.info,
                    },
                  ]}
                >
                  {DIRECTION_LABEL[direction]}
                </Text>
              </View>
              {isKids ? (
                <View style={styles.kidsBadge}>
                  <View style={styles.kidsDot} />
                  <Text style={styles.kidsText}>어린이용</Text>
                </View>
              ) : (
                <View style={styles.generalBadge}>
                  <Text style={styles.generalText}>일반용</Text>
                </View>
              )}
            </View>
            <Text style={styles.routeName} numberOfLines={1}>
              {routeName}
            </Text>
            <Text style={styles.plate}>{vehiclePlate}</Text>
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.elapsedLabel}>경과</Text>
            <Text style={styles.elapsedValue}>{elapsed}</Text>
          </View>
        </View>

        {/* 상태 칩 */}
        <View style={styles.chips}>
          <Chip tone="success" icon="lock" label="화면잠금 켜짐" />
          <Chip
            tone={
              gpsState === "ok"
                ? "success"
                : gpsState === "error"
                  ? "destructive"
                  : "neutral"
            }
            icon="map-pin"
            label={
              gpsState === "ok"
                ? "위치 송신"
                : gpsState === "error"
                  ? "위치 오류"
                  : "위치 수신중"
            }
          />
          <Chip tone="neutral" icon="user" label={`기사 · ${driverName}`} />
          {helperName ? (
            <Chip tone="neutral" icon="users" label={`동승 · ${helperName}`} />
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

function Chip({
  tone,
  icon,
  label,
}: {
  tone: "success" | "destructive" | "neutral";
  icon: string;
  label: string;
}) {
  const palette = CHIP_PALETTE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Feather name={icon} size={11} color={palette.fg} />
      <Text style={[styles.chipText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const CHIP_PALETTE = {
  success: { bg: "rgba(58, 164, 104, 0.2)", fg: "#5dd498" },
  destructive: { bg: "rgba(220, 68, 68, 0.2)", fg: "#ff7a7a" },
  neutral: { bg: "rgba(255, 255, 255, 0.1)", fg: "rgba(255, 255, 255, 0.85)" },
} as const;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  gradient: {
    padding: 16,
    position: "relative",
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: colors.bus,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  dirBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.md,
  },
  dirPickup: { backgroundColor: colors.successSoft },
  dirDropoff: { backgroundColor: colors.infoSoft },
  dirText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  kidsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.md,
    backgroundColor: colors.bus,
  },
  kidsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.busForeground,
  },
  kidsText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: colors.busForeground,
  },
  generalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.md,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  generalText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: "#fff",
  },
  routeName: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: "#fff",
    marginTop: 6,
  },
  plate: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  rightCol: {
    alignItems: "flex-end",
  },
  elapsedLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
  },
  elapsedValue: {
    fontFamily: "monospace",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#fff",
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
