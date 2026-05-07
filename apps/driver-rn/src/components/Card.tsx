// 기본 카드 wrapper — PWA의 `bg-card rounded-lg border shadow-sm` equivalent.

import { View, StyleSheet, type ViewProps } from "react-native";

import { colors, radii, shadows } from "../lib/theme";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
});
