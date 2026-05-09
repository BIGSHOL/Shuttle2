import {
  AlertOctagon,
  Bell,
  Bus,
  CalendarOff,
  CircleDot,
  Settings,
} from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

import { NotificationList } from "./notification-list";

// W25 P2-D: ground truth Notifications.html §01 — 학원장 데스크톱 알림 인박스.
// KPI strip + 카드 inline 액션. 카테고리별 분류는 NotificationCategory enum.
export default async function OwnerNotificationsPage() {
  const me = await requireOwner();

  const notifications = await db.notification.findMany({
    where: { userId: me.authUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // KPI 5 — 전체·안 읽음·긴급(NO_SHOW/EMERGENCY)·운행·요청
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => n.readAt == null).length;
  const urgentCount = notifications.filter(
    (n) =>
      n.category === "STUDENT_NO_SHOW" ||
      n.category === "STUDENT_NO_DROPOFF" ||
      n.category === "EMERGENCY",
  ).length;
  const tripCount = notifications.filter((n) =>
    [
      "TRIP_STARTED",
      "TRIP_DELAYED",
      "STUDENT_BOARDED",
      "STUDENT_DROPPED_OFF",
      "SHUTTLE_NEAR_CHILD",
    ].includes(n.category),
  ).length;
  const requestCount = notifications.filter((n) =>
    [
      "ABSENCE_REQUESTED",
      "ABSENCE_APPROVED",
      "ABSENCE_REJECTED",
      "STOP_CHANGE_REQUESTED",
      "STOP_CHANGE_APPROVED",
      "STOP_CHANGE_REJECTED",
    ].includes(n.category),
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 헤더 + 액션 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            알림
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            최근 50건 — 운행·결석·정류장 변경·시스템 공지가 한 곳에.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled>
            <CircleDot className="mr-1.5 h-3.5 w-3.5" />
            모두 읽음
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/settings#alerts" className="flex items-center gap-1.5">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              알림 설정
            </a>
          </Button>
        </div>
      </div>

      {/* KPI 5 */}
      <KpiStrip cols={5}>
        <KpiStripCell
          label="전체"
          value={totalCount}
          subtext={`안 읽음 ${unreadCount}건`}
          Icon={Bell}
          tone="info"
        />
        <KpiStripCell
          label="긴급"
          value={urgentCount}
          subtext={urgentCount > 0 ? "미탑승·긴급" : "이상 없음"}
          Icon={AlertOctagon}
          tone={urgentCount > 0 ? "destructive" : "success"}
        />
        <KpiStripCell
          label="운행"
          value={tripCount}
          subtext="출발·도착·지연"
          Icon={Bus}
          tone="bus"
        />
        <KpiStripCell
          label="요청"
          value={requestCount}
          subtext="결석·정류장 변경"
          Icon={CalendarOff}
          tone="warning"
        />
        <KpiStripCell
          label="시스템"
          value={totalCount - urgentCount - tripCount - requestCount}
          subtext="공지·점검·청구"
          Icon={Settings}
          tone="muted"
        />
      </KpiStrip>

      <NotificationList items={notifications} />
    </main>
  );
}
