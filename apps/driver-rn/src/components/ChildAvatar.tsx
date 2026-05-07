// 학생 초성 avatar — PWA의 ChildAvatar equivalent.
// boarding row에서 학생 이름 옆 원형 표시.
// active(탑승 완료) 시 노란 bus 색, idle 시 muted.

import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../lib/theme";

export function ChildAvatar({
  name,
  active = false,
  size = 36,
}: {
  name: string;
  active?: boolean;
  size?: number;
}) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          backgroundColor: active ? colors.bus : colors.muted,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            color: active ? colors.busForeground : colors.mutedForeground,
            fontSize: size * 0.4,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "800",
  },
});
