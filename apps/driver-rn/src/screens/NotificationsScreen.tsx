// 인앱 알림 목록 — DB Notification 테이블의 미러본.
// FCM 푸시 도달 여부와 무관하게 항상 인앱에서 확인 가능 (PWA의 동일 패턴).

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

import { apiFetch } from "../lib/api-client";

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
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.backText}>← 닫기</Text>
        </Pressable>
        <Text style={styles.title}>
          알림{unreadCount > 0 ? ` (${unreadCount})` : ""}
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
          <ActivityIndicator size="large" />
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
              <Text style={styles.emptyText}>알림이 없어요</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, item.readAt && styles.itemRead]}
              onPress={() => !item.readAt && void markRead(item.id)}
            >
              {!item.readAt ? <View style={styles.unreadDot} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
                <Text style={styles.itemMeta}>
                  {new Date(item.createdAt).toLocaleString("ko-KR")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backText: { fontSize: 14, color: "#374151" },
  title: { fontSize: 18, fontWeight: "800", color: "#111" },
  allReadText: { fontSize: 13, color: "#dc2626", fontWeight: "700" },
  headerSpacer: { width: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemRead: { opacity: 0.6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc2626",
    marginTop: 6,
  },
  itemTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  itemBody: { fontSize: 13, color: "#374151", marginTop: 4 },
  itemMeta: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
});
