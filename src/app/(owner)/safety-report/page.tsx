import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  currentKstQuarter,
  quarterMonthsLabel,
  type Quarter,
} from "@/lib/pdf/quarter";

import { ReportDownloadForm } from "./report-download-form";

export default async function SafetyReportPage() {
  const me = await requireOwner();
  const orgId = await getOrgId();
  const cur = currentKstQuarter();

  // KIDS 차량 수 (없으면 안내 카드)
  const kidsVehicleCount = await db.vehicle.count({
    where: { orgId, mode: "KIDS" },
  });

  // 분기 옵션: 올해 4분기 + 작년 4분기. (운영 시작 후 점차 늘어남)
  const years = [cur.year, cur.year - 1];
  const quarters: { value: { year: number; quarter: Quarter }; label: string }[] =
    [];
  for (const y of years) {
    for (const q of [1, 2, 3, 4] as Quarter[]) {
      // 미래 분기는 제외
      if (y > cur.year || (y === cur.year && q > cur.quarter)) continue;
      quarters.push({
        value: { year: y, quarter: q },
        label: `${y}년 ${q}분기 (${quarterMonthsLabel(y, q).split(" ").slice(1).join(" ")})`,
      });
    }
  }
  // 최근 분기가 위로 오게
  quarters.reverse();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">분기 안전운행기록</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          도로교통법 §53⑦에 따라 어린이통학버스 운영자가 분기마다 작성·제출해야
          하는 안전운행기록을 자동 생성합니다. {me.org.name}의 KIDS 모드 차량
          운행 + 안전점검 데이터를 분기별로 PDF로 묶어 다운로드할 수 있어요.
        </p>
      </div>

      {kidsVehicleCount === 0 ? (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="text-amber-900">
              KIDS 모드 차량이 없어요
            </CardTitle>
            <CardDescription>
              차량 등록 시 모드를 KIDS로 설정해야 안전운행기록 누적 대상이
              됩니다. /vehicles 화면에서 차량을 KIDS로 변경해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>분기 선택</CardTitle>
            <CardDescription>
              현재 분기는 {cur.year}년 {cur.quarter}분기입니다. 분기 종료 후
              제출 시 그 분기를 선택해 다운로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportDownloadForm options={quarters} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF에 포함되는 항목</CardTitle>
          <CardDescription>
            차량별로 운행 일자·시각·노선·운전자·동승보호자, 그리고 출발 전
            안전띠 점검 / 동승보호자 동승 / 운행 종료 후 전원 하차 확인
            결과(✓/✗/-)가 표로 들어갑니다. 점검 항목이 비어 있으면 -로 표시.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
