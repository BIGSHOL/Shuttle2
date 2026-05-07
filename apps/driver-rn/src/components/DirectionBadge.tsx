// PICKUP(등원) / DROPOFF(하원) 방향 배지.
// PWA의 `dirClass` 인라인 패턴과 동등 — `bg-success-soft text-success` (등원)
// vs `bg-info-soft text-info` (하원).

import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../lib/theme";

type Direction = "PICKUP" | "DROPOFF";

export function DirectionBadge({ direction }: { direction: Direction }) {
  const isPickup = direction === "PICKUP";
  return (
    <View
      style={[styles.badge, isPickup ? styles.pickup : styles.dropoff]}
    >
      <Text
        style={[
          styles.text,
          isPickup ? styles.pickupText : styles.dropoffText,
        ]}
      >
        {isPickup ? "등원" : "하원"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.md,
  },
  pickup: { backgroundColor: colors.successSoft },
  dropoff: { backgroundColor: colors.infoSoft },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pickupText: { color: colors.success },
  dropoffText: { color: colors.info },
});
