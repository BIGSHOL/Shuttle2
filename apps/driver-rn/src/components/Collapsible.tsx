// Collapsible 카드 — PWA의 RunChecklistCard·DriverPermissionsCard 패턴 매칭.
// controlled state로 toggle. ChevronDown(열림) / ChevronRight(닫힘) 표시.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows } from "../lib/theme";
import { Feather } from "./Icon";

type Tone = "default" | "success" | "warning";

export function Collapsible({
  title,
  subtitle,
  tone = "default",
  defaultOpen = false,
  leadingIcon,
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: Tone;
  defaultOpen?: boolean;
  leadingIcon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toneStyle = TONE_STYLES[tone];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: toneStyle.bg,
          borderColor: toneStyle.border,
        },
      ]}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.header,
          pressed && { opacity: 0.85 },
        ]}
      >
        {leadingIcon ? (
          <View style={styles.leading}>{leadingIcon}</View>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: toneStyle.fg }]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: toneStyle.subtitleFg },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Feather
          name={open ? "chevron-down" : "chevron-right"}
          size={18}
          color={toneStyle.fg}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const TONE_STYLES = {
  default: {
    bg: colors.card,
    border: colors.border,
    fg: colors.foreground,
    subtitleFg: colors.mutedForeground,
  },
  success: {
    bg: colors.successSoft,
    border: colors.success + "40",
    fg: colors.success,
    subtitleFg: colors.success,
  },
  warning: {
    bg: colors.warningSoft,
    border: colors.warning + "60",
    fg: colors.warning,
    subtitleFg: colors.warning,
  },
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  leading: {
    width: 24,
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
  },
});
