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
      helpText="자녀 정류장 도착 전 푸시가 옵니다."
    />
  );
}
