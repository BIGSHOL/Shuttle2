import { AlertTriangle, Check } from "lucide-react";

// W24-A: 종료 trip 상세에서 정류장별 학생 처리 결과 표시.
// 운행 중 trip-running-view의 BoardingRow 시각 결과를 그대로 보여주는 read-only 컴포넌트.

export type StudentResultStatus =
  | "BOARDED" // BOARD 이벤트 — 등원 노선 탑승 완료
  | "ALIGHTED" // ALIGHT 이벤트 — 하원 노선 하차 완료
  | "NO_SHOW" // 미탑승 보고
  | "NO_DROPOFF" // 미하차 보고
  | "ABSENT" // 결석 (status NOTIFIED_DRIVER/ACKNOWLEDGED 등 — REJECTED 제외)
  | "NONE"; // 처리 없음 — 빈 row(이론상 종료 운행은 모두 처리되어야)

export type StudentResultRow = {
  studentId: string;
  studentName: string;
  status: StudentResultStatus;
  reason: string | null;
};

export type StopResultGroup = {
  stopId: string;
  stopOrder: number;
  stopName: string;
  students: StudentResultRow[];
};

const DIRECTION_VERB = { BOARD: "탑승", ALIGHT: "하차" } as const;

export function StudentResultsCard({
  stops,
  direction,
}: {
  stops: StopResultGroup[];
  direction: "PICKUP" | "DROPOFF";
}) {
  const groups = stops.filter((s) => s.students.length > 0);
  if (groups.length === 0) return null;

  const totalStudents = groups.reduce((acc, g) => acc + g.students.length, 0);
  const totals = groups.reduce(
    (acc, g) => {
      for (const s of g.students) {
        if (s.status === "BOARDED" || s.status === "ALIGHTED") acc.processed++;
        else if (s.status === "NO_SHOW" || s.status === "NO_DROPOFF")
          acc.issue++;
        else if (s.status === "ABSENT") acc.absent++;
        else acc.untouched++;
      }
      return acc;
    },
    { processed: 0, issue: 0, absent: 0, untouched: 0 },
  );

  const verb = DIRECTION_VERB[direction === "PICKUP" ? "BOARD" : "ALIGHT"];

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-extrabold tracking-tight">
          학생 {verb} 결과
        </h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          정류장별 학생 처리 상태. 총 {totalStudents}명 중 {verb}{" "}
          {totals.processed}명, 결석 {totals.absent}명, 미{verb} {totals.issue}
          명{totals.untouched > 0 ? `, 미처리 ${totals.untouched}명` : ""}.
        </p>
      </div>
      <ul className="divide-y">
        {groups.map((g) => (
          <li key={g.stopId} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold tracking-wide">
                {g.stopOrder}
              </span>
              <h4 className="text-sm font-extrabold tracking-tight">
                {g.stopName}
              </h4>
              <span className="text-muted-foreground ml-auto text-[11px] font-bold tabular-nums">
                {g.students.length}명
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {g.students.map((s) => (
                <StudentRow key={s.studentId} row={s} verb={verb} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentRow({
  row,
  verb,
}: {
  row: StudentResultRow;
  verb: "탑승" | "하차";
}) {
  if (row.status === "BOARDED" || row.status === "ALIGHTED") {
    return (
      <li className="border-success bg-success-soft text-success flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="bg-success text-success-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate font-extrabold">
          {row.studentName}
        </span>
        <span className="text-success/80 text-xs font-bold">{verb}</span>
      </li>
    );
  }
  if (row.status === "NO_SHOW" || row.status === "NO_DROPOFF") {
    return (
      <li className="border-destructive bg-destructive/10 rounded-md border px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="text-destructive h-4 w-4 shrink-0" />
          <span className="text-destructive min-w-0 flex-1 truncate font-extrabold">
            {row.studentName}
          </span>
          <span className="text-destructive/80 text-xs font-bold">
            미{verb}
          </span>
        </div>
        {row.reason ? (
          <p className="text-muted-foreground mt-1 pl-6 text-[11px] font-medium">
            사유: {row.reason}
          </p>
        ) : null}
      </li>
    );
  }
  if (row.status === "ABSENT") {
    return (
      <li className="border-warning/40 bg-warning-soft/50 rounded-md border px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-warning text-warning-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold">
            결
          </span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-bold line-through">
            {row.studentName}
          </span>
          <span className="bg-warning text-warning-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
            결석
          </span>
        </div>
        {row.reason ? (
          <p className="text-muted-foreground mt-1 pl-7 text-[11px] font-medium">
            사유: {row.reason}
          </p>
        ) : null}
      </li>
    );
  }
  // NONE — 처리 안 된 학생 (이론상 종료 운행에는 없어야)
  return (
    <li className="border-input bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="border-input bg-background flex h-5 w-5 shrink-0 items-center justify-center rounded-md border" />
      <span className="text-muted-foreground min-w-0 flex-1 truncate font-bold">
        {row.studentName}
      </span>
      <span className="text-muted-foreground text-[10px] font-bold">
        처리 없음
      </span>
    </li>
  );
}
