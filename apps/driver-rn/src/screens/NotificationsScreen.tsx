// 인앱 알림 목록 — DB Notification 테이블의 미러본.
// FCM 푸시 도달 여부와 무관하게 항상 인앱에서 확인 가능.
// 1.0.5: 색상 통일 + 카테고리 아이콘 + 읽지 않음 강조.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather, Ionicons } from "../components/Icon";
import { apiFetch } from "../lib/api-client";
import { colors, radii } from "../lib/theme";

type Notification = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

type Props = {
  onClose: () => void;
};

// 카테고리별 아이콘 매핑 — PWA 패턴.
function categoryIcon(category: string): {
  set: "feather" | "ionicons";
  name: string;
} {
  if (category.startsWith("ABSENCE")) return { set: "feather", name: "user-x" };
  if (category.startsWith("STOP_CHANGE"))
    return { set: "feather", name: "map-pin" };
  if (category.startsWith("NEW_STUDENT"))
    return { set: "feather", name: "user-plus" };
  if (category.startsWith("SHUTTLE_NEAR"))
    return { set: "ionicons", name: "bus" };
  if (category.startsWith("TRIP")) return { set: "ionicons", name: "bus" };
  return { set: "feather", name: "bell" };
}

export function NotificationsScreen({ onClose }: Props) {
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ notifications: Notification[] }>(
        "/api/driver/notifications",
      );
      setList(res.notifications);
    } catch (e) {
      console.warn("notifications fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/driver/notifications/${id}/read`, {
        method: "POST",
      });
      setList((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/api/driver/notifications/read-all", {
        method: "POST",
      });
      const now = new Date().toISOString();
      setList((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? now })),
      );
    } catch {
      // ignore
    }
  }

  const unreadCount = list.filter((n) => !n.readAt).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.headerLeft}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>
          알림
          {unreadCount > 0 ? (
            <Text style={styles.unreadBadge}> {unreadCount}</Text>
          ) : null}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={12}>
            <Text style={styles.allReadText}>모두 읽음</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.bus} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell" size={28} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>알림이 없어요</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            const icon = categoryIcon(item.category);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  isUnread && styles.itemUnread,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => isUnread && void markRead(item.id)}
              >
                <View
                  style={[
                    styles.iconWrap,
                    isUnread && styles.iconWrapUnread,
                  ]}
                >
                  {icon.set === "ionicons" ? (
                    <Ionicons
                      name={icon.name}
                      size={16}
                      color={
                        isUnread ? colors.busForeground : colors.mutedForeground
                      }
                    />
                  ) : (
                    <Feather
                      name={icon.name}
                      size={16}
                      color={
                        isUnread ? colors.busForeground : colors.mutedForeground
                      }
                    />
                  )}
                </View>
                <View style={styles.body}>
                  <Text
                    style={[styles.itemTitle, !isUnread && styles.dim]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.itemBody, !isUnread && styles.dim]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {new Date(item.createdAt).toLocaleString("ko-KR")}
                  </Text>
                </View>
                {isUnread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  unreadBadge: {
    color: colors.bus,
    fontWeight: "900",
  },
  allReadText: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: "700",
    width: 60,
    textAlign: "right",
  },
  headerSpacer: { width: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    padding: 64,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
  },
  itemUnread: {
    backgroundColor: colors.busSoft,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  iconWrapUnread: {
    backgroundColor: colors.bus,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  itemBody: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 17,
  },
  itemMeta: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 6,
    fontWeight: "500",
  },
  dim: {
    opacity: 0.6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bus,
    marginTop: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
