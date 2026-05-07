// 진행 중 trip sticky 배너 — data/04 phase-2 driver.md 가이드 매칭.
// 좌측 stripe + 우측 blur 원 + 펄스 링 + "이동 →" 강조 텍스트.

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Feather, Ionicons } from "../../components/Icon";
import { colors, radii, shadows } from "../../lib/theme";

export function ActiveTripBanner({
  routeName,
  onPress,
}: {
  routeName: string;
  onPress: () => void;
}) {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.6,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ringScale, ringOpacity]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        pressed && { opacity: 0.92 },
      ]}
    >
      {/* 좌측 stripe */}
      <View style={styles.stripe} />
      {/* 우측 상단 blur 원 (장식) */}
      <View style={styles.blurOrb} />

      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
          <View style={styles.iconCircle}>
            <Ionicons name="bus" size={16} color={colors.busForeground} />
          </View>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>진행 중</Text>
          <Text style={styles.routeName} numberOfLines={1}>
            {routeName} 운행 중
          </Text>
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>이동</Text>
        <Feather name="arrow-right" size={16} color={colors.busForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bus,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: "hidden",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(58, 47, 16, 0.1)",
    ...shadows.md,
  },
  stripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "rgba(58, 47, 16, 0.4)",
  },
  blurOrb: {
    position: "absolute",
    top: -32,
    right: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(58, 47, 16, 0.1)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: "rgba(58, 47, 16, 0.3)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: "rgba(58, 47, 16, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(58, 47, 16, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.busForeground,
    opacity: 0.75,
    letterSpacing: 1.2,
  },
  routeName: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.busForeground,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.busForeground,
    letterSpacing: 0.3,
  },
});
