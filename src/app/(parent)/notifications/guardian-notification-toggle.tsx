"use client";

import { NotificationToggle } from "@/components/notification-toggle";

import {
  removeGuardianPushSubscriptionAction,
  saveGuardianPushSubscriptionAction,
} from "./actions";

// 학부모용 wrapper — server actions 바인딩.
export function GuardianNotificationToggle({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  return (
    <NotificationToggle
      vapidPublicKey={vapidPublicKey}
      saveAction={saveGuardianPushSubscriptionAction}
      removeAction={removeGuardianPushSubscriptionAction}
      label="자녀 셔틀 알림 받기"
      helpText="자녀가 정류장에 도착하기 전 알림을 받아볼 수 있어요."
    />
  );
}
