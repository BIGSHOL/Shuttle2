import Link from "next/link";

const ABSENCE_TYPE_SHORT = {
  ABSENT_BOTH: "등·하원",
  ABSENT_PICKUP: "등원",
  ABSENT_DROPOFF: "하원",
} as const;

type Item = {
  id: string;
  studentName: string;
  dateISO: string; // YYYY-MM-DD
  type: "ABSENT_BOTH" | "ABSENT_PICKUP" | "ABSENT_DROPOFF";
  status: "PENDING" | "NOTIFIED_DRIVER" | "ACKNOWLEDGED" | "REJECTED";
};

// 다가오는 결석 신청 미리보기. /my-absences로 이어짐.
export function AbsencesPreview({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2 px-4 pt-1">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold tracking-wide uppercase text-muted-foreground">
          예정된 결석
        </h3>
        <Link
          href="/my-absences"
          className="text-primary text-xs font-semibold hover:underline"
        >
          전체 보기 →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li
            key={a.id}
            className="bg-card flex items-center justify-between gap-2 rounded-md border px-3.5 py-2.5 text-sm shadow-sm"
          >
            <span>
              <span className="font-bold">{a.studentName}</span>
              <span className="text-muted-foreground ml-2 text-xs font-medium">
                {a.dateISO} · {ABSENCE_TYPE_SHORT[a.type]}
              </span>
            </span>
            <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 text-[11px] font-bold">
              {a.status === "PENDING" ? "대기" : "전달됨"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
