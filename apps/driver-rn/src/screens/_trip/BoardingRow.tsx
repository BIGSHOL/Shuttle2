// 학생 1명의 탑승·하차·미탑승·미하차 토글.
// PWA의 trip-running-view.tsx BoardingRow를 RN으로 1:1 포팅 (~661-986).
//
// direction에 따라 main 액션이 달라짐:
// - PICKUP(등원) → BOARD가 main, NO_SHOW로 표시
// - DROPOFF(하원) → ALIGHT가 main, NO_DROPOFF로 표시

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  BoardingType,
  RouteDirection,
  TripDetailPayload,
} from "@shuttlee/shared-contracts";

import { apiFetch } from "../../lib/api-client";
import { IssueModal } from "./IssueModal";

type Event = TripDetailPayload["events"][number];

type Props = {
  tripId: string;
  student: { id: string; name: string };
  direction: RouteDirection;
  events: Event[];
  onChange: () => void;
};

export function BoardingRow({
  tripId,
  student,
  direction,
  events,
  onChange,
}: Props) {
  const isPickup = direction === "PICKUP";
  const mainType: BoardingType = isPickup ? "BOARD" : "ALIGHT";
  const issueType: BoardingType = isPickup ? "NO_SHOW" : "NO_DROPOFF";

  const myEvents = events.filter((e) => e.studentId === student.id);
  const mainEvent = myEvents.find((e) => e.type === mainType);
  const issueEvent = myEvents.find((e) => e.type === issueType);

  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function toggleMain() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/driver/trip/${tripId}/boarding`, {
        method: "POST",
        body: { studentId: student.id, type: mainType },
      });
      onChange();
    } catch (e) {
      Alert.alert("실패", e instanceof Error ? e.message : "");
    } finally {
      setSubmitting(false);
    }
  }

  async function unmarkIssue() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/driver/trip/${tripId}/issue`, {
        method: "DELETE",
        body: { studentId: student.id, type: issueType },
      });
      onChange();
    } catch (e) {
      Alert.alert("실패", e instanceof Error ? e.message : "");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitIssue(reason: string) {
    try {
      await apiFetch(`/api/driver/trip/${tripId}/issue`, {
        method: "POST",
        body: { studentId: student.id, type: issueType, reason },
      });
      setModalOpen(false);
      onChange();
    } catch (e) {
      Alert.alert("실패", e instanceof Error ? e.message : "");
    }
  }

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{student.name}</Text>
      {issueEvent ? (
        <View style={styles.issueGroup}>
          <View style={styles.issueBadge}>
            <Text style={styles.issueBadgeText}>
              {isPickup ? "미탑승" : "미하차"}
            </Text>
          </View>
          <Pressable
            onPress={unmarkIssue}
            disabled={submitting}
            hitSlop={10}
          >
            <Text style={styles.unmarkText}>해제</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.mainButton,
              mainEvent && styles.mainButtonActive,
              submitting && styles.disabled,
            ]}
            onPress={toggleMain}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={mainEvent ? "#fff" : "#000"} />
            ) : (
              <Text
                style={
                  mainEvent ? styles.mainButtonActiveText : styles.mainButtonText
                }
              >
                {mainEvent ? "✓ " : ""}
                {isPickup ? "탑승" : "하차"}
              </Text>
            )}
          </Pressable>
          {!mainEvent ? (
            <Pressable
              style={styles.issueButton}
              onPress={() => setModalOpen(true)}
              disabled={submitting}
            >
              <Text style={styles.issueButtonText}>
                {isPickup ? "미탑승" : "미하차"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {modalOpen ? (
        <IssueModal
          studentName={student.name}
          issueType={issueType}
          onClose={() => setModalOpen(false)}
          onSubmit={submitIssue}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  actions: { flexDirection: "row", gap: 6 },
  mainButton: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#facc15",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  mainButtonActive: {
    backgroundColor: "#facc15",
    borderColor: "#facc15",
  },
  disabled: { opacity: 0.5 },
  mainButtonText: { fontSize: 13, fontWeight: "800", color: "#92400e" },
  mainButtonActiveText: { fontSize: 13, fontWeight: "800", color: "#000" },
  issueButton: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  issueButtonText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  issueGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  issueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  issueBadgeText: { fontSize: 12, fontWeight: "800", color: "#991b1b" },
  unmarkText: { fontSize: 12, color: "#666", textDecorationLine: "underline" },
});
