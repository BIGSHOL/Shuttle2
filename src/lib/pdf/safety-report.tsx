import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { quarterLabel, quarterMonthsLabel } from "./quarter";
import type { SafetyReportData, SafetyReportRow } from "./safety-report-data";

// 한글 폰트 등록 — Spoqa Han Sans Neo ttf jsDelivr CDN.
// 2026-05 시점에 Pretendard repo에서 ttf 파일이 사라져(.css·.otf만 남음) jsdelivr
// 404 발생 → PDF 렌더링 실패. Spoqa Han Sans는 한글 통학버스 운영 문서에 적합한
// 대체 ttf 보유. react-pdf는 woff2/otf 안정성 떨어져 ttf 권장.
// cold start 시 한 번 다운로드 후 react-pdf가 메모리 캐시.
// 디자인 토큰은 Pretendard family 이름을 그대로 유지 (다른 PDF 위치도 같이 사용).
Font.register({
  family: "Pretendard",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

const ORG_TYPE_LABEL = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 9,
    padding: 28,
    color: "#0f172a",
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#475569" },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    fontSize: 8.5,
    color: "#475569",
  },
  preface: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f1f5f9",
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.4,
  },
  vehicleSection: { marginBottom: 12 },
  vehicleHead: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: 6,
    fontSize: 10,
    fontWeight: 700,
  },
  vehicleMeta: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#f8fafc",
    padding: 6,
    fontSize: 8.5,
    color: "#475569",
  },
  table: { display: "flex", flexDirection: "column", marginTop: 4 },
  th: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    fontWeight: 700,
    fontSize: 8.5,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  trAlt: { backgroundColor: "#f8fafc" },
  td: {
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
    overflow: "hidden",
  },
  // column widths sum 100
  colDate: { width: "12%" },
  colTime: { width: "12%" },
  colRoute: { width: "18%" },
  colDriver: { width: "12%" },
  colHelper: { width: "12%" },
  colCheck: { width: "8%", textAlign: "center" },
  colNotes: { width: "18%" },
  emptyRow: {
    padding: 12,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    backgroundColor: "#f8fafc",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
});

function check(v: boolean | null): string {
  if (v === null) return "-";
  return v ? "✓" : "✗";
}

function VehicleSection({
  vehicle,
}: {
  vehicle: SafetyReportData["vehicles"][number];
}) {
  return (
    <View style={styles.vehicleSection} wrap={true}>
      <Text style={styles.vehicleHead}>차량 {vehicle.plate}</Text>
      <View style={styles.vehicleMeta}>
        <Text>신고증명서 번호: {vehicle.reportNo ?? "—"}</Text>
        <Text>보험 만료: {vehicle.insuranceUntil ?? "—"}</Text>
        <Text>운행 {vehicle.rows.length}건</Text>
        <Text>누적 운행거리 {vehicle.totalDistanceKm.toFixed(1)} km (GPS)</Text>
      </View>

      {vehicle.rows.length === 0 ? (
        <Text style={styles.emptyRow}>이 분기 운행 기록이 없습니다.</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.td, styles.colDate]}>일자</Text>
            <Text style={[styles.td, styles.colTime]}>시작·종료</Text>
            <Text style={[styles.td, styles.colRoute]}>노선·방향</Text>
            <Text style={[styles.td, styles.colDriver]}>운전자</Text>
            <Text style={[styles.td, styles.colHelper]}>동승자</Text>
            <Text style={[styles.td, styles.colCheck]}>안전띠</Text>
            <Text style={[styles.td, styles.colCheck]}>동승</Text>
            <Text style={[styles.td, styles.colCheck]}>하차</Text>
            <Text style={[styles.td, styles.colNotes]}>비고</Text>
          </View>
          {vehicle.rows.map((row, i) => (
            <Row key={`${row.date}-${i}`} row={row} alt={i % 2 === 1} />
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ row, alt }: { row: SafetyReportRow; alt: boolean }) {
  return (
    <View style={[styles.tr, ...(alt ? [styles.trAlt] : [])]} wrap={false}>
      <Text style={[styles.td, styles.colDate]}>{row.date}</Text>
      <Text style={[styles.td, styles.colTime]}>
        {row.startedAt ?? "—"} ~ {row.endedAt ?? "—"}
      </Text>
      <Text style={[styles.td, styles.colRoute]}>
        {row.routeName} ({DIRECTION_LABEL[row.routeDirection]})
      </Text>
      <Text style={[styles.td, styles.colDriver]}>{row.driverName}</Text>
      <Text style={[styles.td, styles.colHelper]}>{row.helperName ?? "—"}</Text>
      <Text style={[styles.td, styles.colCheck]}>
        {check(row.seatbeltAllOk)}
      </Text>
      <Text style={[styles.td, styles.colCheck]}>
        {check(row.helperPresent)}
      </Text>
      <Text style={[styles.td, styles.colCheck]}>
        {check(row.allAlightedOk)}
      </Text>
      <Text style={[styles.td, styles.colNotes]}>
        {row.gpsDistanceKm !== null && row.gpsPingCount !== null
          ? `${row.gpsDistanceKm.toFixed(1)}km · ${row.gpsPingCount}회 ping`
          : (row.notes ?? "")}
      </Text>
    </View>
  );
}

export function SafetyReportPdf({ data }: { data: SafetyReportData }) {
  const issuedKst = new Date(
    new Date(data.generatedAt).getTime() + 9 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  return (
    <Document
      title={`${data.org.name} ${quarterLabel(data.year, data.quarter)} 안전운행기록`}
      author={data.org.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.title}>
            {quarterLabel(data.year, data.quarter)} 안전운행기록
          </Text>
          <Text style={styles.subtitle}>
            {data.org.name} · {ORG_TYPE_LABEL[data.org.type]} · 어린이통학버스
            (어린이용 모드)
          </Text>
          <View style={styles.meta}>
            <Text>
              대상 기간: {quarterMonthsLabel(data.year, data.quarter)}
            </Text>
            <Text>발행: {issuedKst} (KST)</Text>
          </View>
        </View>

        <View style={styles.preface}>
          <Text>
            도로교통법 §53⑦에 따라 어린이통학버스 운영자는 안전운행기록을
            분기별로 작성·보관하고 관할 경찰서장에게 제출해야 합니다. 본 문서는
            셔틀이 시스템이 자동 누적한 운행·안전점검 기록을 분기 단위로 정리한
            것입니다.
          </Text>
        </View>

        {data.vehicles.length === 0 ? (
          <Text style={styles.emptyRow}>
            등록된 어린이용 모드 차량이 없습니다. 차량 모드를 어린이용으로
            설정하면 운행 기록이 이 문서에 누적됩니다.
          </Text>
        ) : (
          data.vehicles.map((v) => <VehicleSection key={v.plate} vehicle={v} />)
        )}

        <View style={styles.footer} fixed>
          <Text>{data.org.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
