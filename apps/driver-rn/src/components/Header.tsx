// 기사용 sticky 헤더 — PWA의 DriverHeader equivalent.
// 좌: 학원명 + 역할·이름 / 우: 도움말·알림 벨(미독 뱃지)·계정 menu(로그아웃).
//
// 모바일이라 dropdown menu는 단순 Pressable + Modal/Alert로 단순화.

import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "../lib/theme";
import { Feather } from "./Icon";

const ROLE_LABEL = {
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

export type HeaderProps = {
  orgName: string;
  role: "DRIVER" | "HELPER";
  staffName: string;
  unreadCount: number;
  onNotificationsPress: () => void;
  onAccountPress: () => void;
};

export function Header({
  orgName,
  role,
  staffName,
  unreadCount,
  onNotificationsPress,
  onAccountPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.orgName}>
            {orgName}
          </Text>
          <Text style={styles.subtitle}>
            {ROLE_LABEL[role]} · {staffName}
          </Text>
        </View>
        <View style={styles.actions}>
          <IconButton
            label="도움말"
            onPress={() => {
              void Linking.openURL(
                "https://shuttle2-nine.vercel.app/help?role=driver",
              ).catch(() => {});
            }}
          >
            <Feather name="help-circle" size={18} color={colors.foreground} />
          </IconButton>
          <IconButton
            label={`알림 ${unreadCount}건`}
            onPress={onNotificationsPress}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </IconButton>
          <Pressable
            onPress={onAccountPress}
            style={({ pressed }) => [
              styles.accountChip,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.accountText} numberOfLines={1}>
              {staffName} ▾
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function IconButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: colors.muted },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  orgName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: colors.destructive,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.destructiveForeground,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 14,
  },
  accountChip: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: colors.card,
    maxWidth: 110,
  },
  accountText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
});
