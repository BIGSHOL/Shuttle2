// 노선 카드 — data/04 phase-2 driver.md 가이드 매칭.
// 16px round + 12×12 방향 box(12 round) + 18px 노선명 + plate chip + 노란 glow button.

import { StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { DirectionBadge } from "../../components/DirectionBadge";
import { Feather, Ionicons } from "../../components/Icon";
import { ModeBadge } from "../../components/ModeBadge";
import { Button } from "../../components/Button";
import { colors, radii, radiiExt, shadows } from "../../lib/theme";

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

export function RouteCard({
  route,
  disabled,
  onStart,
}: {
  route: Route;
  disabled: boolean;
  onStart: () => void;
}) {
  const isPickup = route.direction === "PICKUP";
  const boxBg = isPickup ? colors.successSoft : colors.infoSoft;
  const boxFg = isPickup ? colors.success : colors.info;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: boxBg }]}>
          <Ionicons name="bus" size={22} color={boxFg} />
        </View>
        <View style={styles.body}>
          <View style={styles.badges}>
            <DirectionBadge direction={route.direction} />
            <ModeBadge mode={route.vehicleMode} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {route.name}
          </Text>
          <View style={styles.metaRow}>
            {route.firstScheduledAt ? (
              <View style={styles.meta}>
                <Feather
                  name="clock"
                  size={11}
                  color={colors.mutedForeground}
                />
                <Text style={styles.metaText}>{route.firstScheduledAt}</Text>
              </View>
            ) : null}
            <View style={styles.meta}>
              <Feather
                name="map-pin"
                size={11}
                color={colors.mutedForeground}
              />
              <Text style={styles.metaText}>정류장 {route.stopCount}개</Text>
            </View>
            <View style={styles.plateChip}>
              <Text style={styles.plateText}>{route.vehiclePlate}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <View style={styles.glowWrap}>
          <Button
            size="lg"
            onPress={onStart}
            disabled={disabled || route.stopCount === 0}
            leadingIcon={
              <Feather name="play" size={14} color={colors.busForeground} />
            }
          >
            운행 시작
          </Button>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: radiiExt["2xl"],
    gap: 14,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radiiExt.xl,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.4,
    lineHeight: 22,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  plateChip: {
    backgroundColor: colors.muted,
    borderRadius: radii.md,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateText: {
    fontSize: 11,
    color: colors.foreground,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderStyle: "dashed",
  },
  actionRow: {
    width: "100%",
  },
  glowWrap: {
    ...shadows.live,
    borderRadius: radii.md,
  },
});
