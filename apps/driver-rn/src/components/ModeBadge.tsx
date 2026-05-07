// KIDS / GENERAL 차량 모드 배지 — PWA의 ModeBadge equivalent.

import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../lib/theme";

type Mode = "KIDS" | "GENERAL";

export function ModeBadge({ mode }: { mode: Mode }) {
  const isKids = mode === "KIDS";
  return (
    <View style={[styles.badge, isKids ? styles.kids : styles.general]}>
      <Text style={[styles.text, isKids ? styles.kidsText : styles.generalText]}>
        {isKids ? "어린이용" : "일반용"}
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
  kids: { backgroundColor: colors.bus },
  general: { backgroundColor: colors.muted },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  kidsText: { color: colors.busForeground },
  generalText: { color: colors.mutedForeground },
});
