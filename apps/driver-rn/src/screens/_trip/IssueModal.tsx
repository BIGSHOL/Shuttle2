// 미탑승·미하차 보고 모달.
// PWA의 trip-running-view.tsx 651-660 IssueModal과 동일 흐름.

import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { BoardingType } from "@shuttlee/shared-contracts";

type Props = {
  studentName: string;
  issueType: BoardingType;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function IssueModal({
  studentName,
  issueType,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isNoShow = issueType === "NO_SHOW";
  const title = isNoShow
    ? `${studentName} 미탑승 보고`
    : `${studentName} 미하차 보고`;
  const desc = isNoShow
    ? "정류장에 학생이 보이지 않았어요. 사유를 적어 주세요."
    : "학생이 정류장에서 내리지 못했어요. 사유를 적어 주세요.";

  async function handleSubmit() {
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{desc}</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder="예: 정류장에 학생이 보이지 않음"
            value={reason}
            onChangeText={setReason}
            editable={!submitting}
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                (!reason.trim() || submitting) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>보고</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111" },
  desc: { fontSize: 13, color: "#666" },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
