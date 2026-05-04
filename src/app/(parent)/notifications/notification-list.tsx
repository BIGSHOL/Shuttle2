"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Bell,
  Bus,
  Calendar,
  Check,
  Clock,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  respondNoShowOnWayAction,
} from "./notification-actions";

type NotifyCategory =
  | "TRIP_STARTED"
  | "STUDENT_BOARDED"
  | "STUDENT_DROPPED_OFF"
  | "STUDENT_NO_SHOW"
  | "STUDENT_NO_DROPOFF"
  | "TRIP_DELAYED"
  | "TRIP_ENDED"
  | "ABSENCE_REQUESTED"
  | "ABSENCE_APPROVED"
  | "ABSENCE_REJECTED"
  | "STOP_CHANGE_REQUESTED"
  | "STOP_CHANGE_APPROVED"
  | "STOP_CHANGE_REJECTED"
  | "ANNOUNCEMENT"
  | "EMERGENCY"
  | "SHUTTLE_NEAR_CHILD";

type Item = {
  id: string;
  category: NotifyCategory;
  title: string;
  body: string;
  url: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const ICON_BY_CAT: Record<
  NotifyCategory,
  React.ComponentType<{ className?: string }>
> = {
  TRIP_STARTED: Bus,
  STUDENT_BOARDED: Bus,
  STUDENT_DROPPED_OFF: Check,
  STUDENT_NO_SHOW: AlertTriangle,
  STUDENT_NO_DROPOFF: AlertTriangle,
  TRIP_DELAYED: Clock,
  TRIP_ENDED: Check,
  ABSENCE_REQUESTED: Calendar,
  ABSENCE_APPROVED: Check,
  ABSENCE_REJECTED: AlertTriangle,
  STOP_CHANGE_REQUESTED: MapPin,
  STOP_CHANGE_APPROVED: MapPin,
  STOP_CHANGE_REJECTED: AlertTriangle,
  ANNOUNCEMENT: Bell,
  EMERGENCY: AlertTriangle,
  SHUTTLE_NEAR_CHILD: Bus,
};

const URGENT_CATS = new Set<NotifyCategory>([
  "STUDENT_NO_SHOW",
  "STUDENT_NO_DROPOFF",
  "EMERGENCY",
]);

function formatRelative(d: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  const days = Math.floor(sec / 86400);
  if (days < 30) return `${days}일 전`;
  return d.toISOString().slice(0, 10);
}

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // M2: 학부모 빠른 응답 — NO_SHOW 알림에 "지금 데려다 드릴게요" 버튼.
  // 응답 후 client에서 disabled 처리 (재시도 막기).
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [respondError, setRespondError] = useState<string | null>(null);

  async function handleRespondNoShow(notifId: string) {
    setRespondingId(notifId);
    setRespondError(null);
    try {
      const res = await respondNoShowOnWayAction();
      if ("ok" in res) {
        setRespondedIds((prev) => {
          const next = new Set(prev);
          next.add(notifId);
          return next;
        });
        // 알림도 읽음 처리
        await markNotificationReadAction(notifId).catch(() => {});
        router.refresh();
      } else {
        setRespondError(res.error);
      }
    } catch (e) {
      setRespondError(e instanceof Error ? e.message : "응답 실패");
    } finally {
      setRespondingId(null);
    }
  }

  const unreadCount = items.filter((i) => i.readAt === null).length;

  function handleClick(item: Item) {
    startTransition(async () => {
      try {
        if (item.readAt === null) {
          await markNotificationReadAction(item.id);
        }
        if (item.url) {
          router.push(item.url);
        }
      } catch (e) {
        console.error("mark read failed:", e);
      }
    });
  }

  function handleAllRead() {
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
      } catch (e) {
        console.error("mark all failed:", e);
      }
    });
  }

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">알림</h2>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
            최근 50건. 안 읽은 알림 {unreadCount}건.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleAllRead}
          >
            모두 읽음
          </Button>
        ) : null}
      </div>

      {respondError ? (
        <div
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-2.5 text-xs font-medium"
          role="alert"
        >
          {respondError}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="bg-card rounded-lg border p-6 text-center">
          <Bell className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-base font-bold">아직 알림이 없어요</p>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
            셔틀 운행이 시작되면 여기에 알림이 쌓여요.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = ICON_BY_CAT[item.category] ?? Bell;
            const urgent = URGENT_CATS.has(item.category);
            const unread = item.readAt === null;
            const baseClass = `bg-card relative flex w-full items-start gap-3 rounded-lg border p-3.5 text-left shadow-sm transition-colors ${
              urgent
                ? "border-l-destructive border-l-4"
                : unread
                  ? "border-bus/40"
                  : ""
            }`;
            const body = (
              <ItemBody
                Icon={Icon}
                urgent={urgent}
                unread={unread}
                item={item}
              />
            );
            const showRespondButton =
              item.category === "STUDENT_NO_SHOW" &&
              unread &&
              !respondedIds.has(item.id);
            const wasResponded = respondedIds.has(item.id);
            return (
              <li key={item.id} className="space-y-1.5">
                {item.url ? (
                  <button
                    type="button"
                    onClick={() => handleClick(item)}
                    disabled={pending}
                    className={`${baseClass} hover:bg-muted/40 active:bg-muted/60 disabled:opacity-60`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={baseClass}>{body}</div>
                )}
                {showRespondButton ? (
                  <div className="flex items-center justify-end gap-2 pr-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={respondingId === item.id}
                      onClick={() => handleRespondNoShow(item.id)}
                    >
                      {respondingId === item.id
                        ? "보내는 중..."
                        : "지금 데려다 드릴게요"}
                    </Button>
                  </div>
                ) : null}
                {wasResponded ? (
                  <p className="text-success pr-1 text-right text-[11px] font-bold">
                    ✓ 기사·학원장에게 알렸어요
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/home">홈으로</Link>
        </Button>
      </div>
    </>
  );
}

function ItemBody({
  Icon,
  urgent,
  unread,
  item,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  urgent: boolean;
  unread: boolean;
  item: Item;
}) {
  return (
    <>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          urgent
            ? "bg-destructive/10 text-destructive"
            : unread
              ? "bg-bus-soft text-bus-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`flex-1 truncate text-sm tracking-tight ${
              unread ? "font-extrabold" : "text-muted-foreground font-bold"
            }`}
          >
            {item.title}
          </p>
          {unread ? (
            <span className="bg-bus h-2 w-2 shrink-0 rounded-full" />
          ) : null}
        </div>
        <p
          className={`mt-0.5 text-xs ${
            unread
              ? "text-foreground font-medium"
              : "text-muted-foreground font-medium"
          }`}
        >
          {item.body}
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] font-medium">
          {formatRelative(item.createdAt)}
        </p>
      </div>
    </>
  );
}
