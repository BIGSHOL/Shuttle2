"use client";

import { NotificationToggle } from "@/components/notification-toggle";

import {
  removeDriverPushSubscriptionAction,
  saveDriverPushSubscriptionAction,
} from "./actions";

export function DriverNotificationToggle({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  return (
    <NotificationToggle
      vapidPublicKey={vapidPublicKey}
      saveAction={saveDriverPushSubscriptionAction}
      removeAction={removeDriverPushSubscriptionAction}
      label="결석·운영 알림 받기"
      helpText="학원장·원장이 결석 신청을 확인하면 즉시 알림을 받습니다."
    />
  );
}
