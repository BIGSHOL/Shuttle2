// KIDS 모드 안전점검 카드 (도로교통법 §53⑦ 안전운행기록 원천).
// PWA의 trip-running-view.tsx SafetyCheckCard 포팅.
//
// 3가지 항목 토글:
// - seatbeltAllOk (출발 전)
// - helperPresent (출발 전)
// - allAlightedOk (운행 종료 후)

import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  TripDetailPayload,
  VehicleMode,
} from "@shuttlee/shared-contracts";

import { apiFetch } from "../../lib/api-client";

type SafetyField = "seatbeltAllOk" | "helperPresent" | "allAlightedOk";

type Props = {
  tripId: string;
  vehicleMode: VehicleMode;
  safetyCheck: TripDetailPayload["safetyCheck"];
  onChange: () => void;
};

export function SafetyCheckCard({
  tripId,
  vehicleMode,
  safetyCheck,
  onChange,
}: Props) {
  const [submittingField, setSubmittingField] = useState<SafetyField | null>(
    null,
  );

  if (vehicleMode !== "KIDS") return null;

  const sc = safetyCheck ?? {
    seatbeltAllOk: false,
    helperPresent: false,
    allAlightedOk: false,
    seatbeltCheckedAt: null,
    alightCheckedAt: null,
  };

  async function toggle(field: SafetyField, value: boolean) {
    if (submittingField) return;
    setSubmittingField(field);
    try {
      await apiFetch(`/api/driver/trip/${tripId}/safety`, {
        method: "POST",
        body: { [field]: value },
      });
      onChange();
    } catch (e) {
      Alert.alert("실패", e instanceof Error ? e.message : "");
    } finally {
      setSubmittingField(null);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>안전점검 (KIDS)</Text>
      <CheckRow
        label="출발 전 — 전원 안전띠 확인"
        value={sc.seatbeltAllOk}
        disabled={submittingField === "seatbeltAllOk"}
        onChange={(v) => toggle("seatbeltAllOk", v)}
      />
      <CheckRow
        label="동승보호자 동승"
        value={sc.helperPresent}
        disabled={submittingField === "helperPresent"}
        onChange={(v) => toggle("helperPresent", v)}
      />
      <CheckRow
        label="종료 후 — 전원 하차 확인"
        value={sc.allAlightedOk}
        disabled={submittingField === "allAlightedOk"}
        onChange={(v) => toggle("allAlightedOk", v)}
      />
    </View>
  );
}

type CheckRowProps = {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
};

function CheckRow({ label, value, disabled, onChange }: CheckRowProps) {
  return (
    <Pressable
      style={[styles.checkRow, disabled && styles.disabled]}
      onPress={() => onChange(!value)}
      disabled={disabled}
    >
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: "#fef9c3",
    borderRadius: 8,
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  disabled: { opacity: 0.5 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#92400e",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#92400e" },
  checkmark: { color: "#fff", fontWeight: "800", fontSize: 14 },
  checkLabel: { fontSize: 13, color: "#111", flex: 1, fontWeight: "600" },
});
