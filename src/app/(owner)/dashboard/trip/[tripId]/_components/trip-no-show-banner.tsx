import { MessageCircle, Phone, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";

// W24-B C2: 미탑승·미하차 빨간 배너 — 학원장이 한눈에 알아채야 하는 긴급 상태.
// data/src 패치 spec 기반, 우리 schema(event.type=NO_SHOW|NO_DROPOFF)에 맞춤.

export type NoShowStudent = {
  eventId: string;
  studentId: string;
  studentName: string;
  stopName: string | null;
  type: "NO_SHOW" | "NO_DROPOFF";
};

export function TripNoShowBanner({
  noShows,
}: {
  noShows: NoShowStudent[];
}) {
  if (noShows.length === 0) return null;

  const noShowCount = noShows.filter((n) => n.type === "NO_SHOW").length;
  const noDropoffCount = noShows.filter((n) => n.type === "NO_DROPOFF").length;

  return (
    <div
      className="bg-destructive/10 border-destructive/25 flex items-start gap-3 rounded-lg border p-4"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: "var(--destructive)",
      }}
    >
      <span className="bg-destructive grid h-8 w-8 shrink-0 place-items-center rounded-md text-white">
        <UserX className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-destructive text-sm font-black">
          {noShowCount > 0 ? `미탑승 ${noShowCount}명` : ""}
          {noShowCount > 0 && noDropoffCount > 0 ? " · " : ""}
          {noDropoffCount > 0 ? `미하차 ${noDropoffCount}명` : ""}
        </h3>
        <p className="text-foreground/80 mt-1 text-xs font-semibold leading-relaxed">
          정류장에서 처리되지 않은 학생이 있습니다. 보호자에게 자동 알림이
          발송되었습니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {noShows.map((n) => (
            <span
              key={n.eventId}
              className="border-destructive/30 text-destructive bg-card rounded-md border px-2 py-0.5 text-[11px] font-extrabold"
            >
              {n.studentName}
              {n.stopName ? ` · ${n.stopName}` : ""}
              <span className="text-destructive/70 ml-1 text-[10px] font-bold">
                {n.type === "NO_SHOW" ? "미탑승" : "미하차"}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 gap-2">
        <Button variant="outline" size="sm" className="font-bold">
          <MessageCircle className="mr-1 h-3.5 w-3.5" />
          문자
        </Button>
        <Button variant="outline" size="sm" className="font-bold">
          <Phone className="mr-1 h-3.5 w-3.5" />
          전화
        </Button>
      </div>
    </div>
  );
}
