"use client";

import { NotificationToggle } from "@/components/notification-toggle";

import {
  removeStaffPushSubscriptionAction,
  saveStaffPushSubscriptionAction,
} from "./actions";

// OWNER용 wrapper — server actions 바인딩.
export function StaffNotificationToggle({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  return (
    <NotificationToggle
      vapidPublicKey={vapidPublicKey}
      saveAction={saveStaffPushSubscriptionAction}
      removeAction={removeStaffPushSubscriptionAction}
      label="결석·운영 알림 받기"
      helpText="새 결석 신청·미탑승·운행 이상 발생 시 즉시 푸시가 옵니다."
    />
  );
}
