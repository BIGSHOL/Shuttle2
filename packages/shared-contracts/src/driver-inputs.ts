// 기사용 mutation 입력 zod 스키마 모음.
// SA wrapper(`src/app/(driver)/run/actions.ts` 등)와 Route Handler
// (`src/app/api/driver/.../route.ts`)와 RN 앱(`apps/driver-rn`) 모두에서 import.
//
// 명명 규칙:
// - 스키마 변수: PascalCase + Schema 접미사 (PingInputSchema)
// - 추론 타입:   PascalCase 그대로     (PingInput)
//
// W23: 원래 src/server/driver/types.ts에 있던 코드 — monorepo 전환으로
// shared-contracts에 옮김.

import { z } from "zod";

export const StartTripInputSchema = z.object({
  routeId: z.string().min(1),
  vehicleId: z.string().min(1),
  // W23+: 운행 시작 시 동승자 같이 지정 (KIDS 모드는 필수, 일반은 optional/null).
  helperId: z.string().min(1).nullable().optional(),
});
export type StartTripInput = z.infer<typeof StartTripInputSchema>;

export const PingInputSchema = z.object({
  tripId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  speed: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  source: z.enum(["INTERVAL", "STOP_PASS", "START", "END"]),
});
export type PingInput = z.infer<typeof PingInputSchema>;

export const SafetyFieldsInputSchema = z.object({
  seatbeltAllOk: z.boolean().optional(),
  helperPresent: z.boolean().optional(),
  allAlightedOk: z.boolean().optional(),
  // W26-A: pre-trip 추가 3개 (refac Driver Run.html 01)
  emergencyLightOk: z.boolean().optional(),
  doorLockOk: z.boolean().optional(),
  capacityOk: z.boolean().optional(),
  // W26-A: post-trip 추가 3개 (refac Driver Run.html 03)
  cabinLockOk: z.boolean().optional(),
  keyReturnedOk: z.boolean().optional(),
  recordReviewedOk: z.boolean().optional(),
});
export type SafetyFieldsInput = z.infer<typeof SafetyFieldsInputSchema>;

export const BoardingInputSchema = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  type: z.enum(["BOARD", "ALIGHT"]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  notes: z.string().max(200).optional(),
});
export type BoardingInput = z.infer<typeof BoardingInputSchema>;

export const MarkIssueInputSchema = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  type: z.enum(["NO_SHOW", "NO_DROPOFF"]),
  reason: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type MarkIssueInput = z.infer<typeof MarkIssueInputSchema>;

export const UnmarkIssueInputSchema = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  type: z.enum(["NO_SHOW", "NO_DROPOFF"]),
});
export type UnmarkIssueInput = z.infer<typeof UnmarkIssueInputSchema>;

export const AssignHelperInputSchema = z.object({
  tripId: z.string().min(1),
  helperId: z.string().min(1).nullable(),
});
export type AssignHelperInput = z.infer<typeof AssignHelperInputSchema>;

export const PushSubscribeInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});
export type PushSubscribeInput = z.infer<typeof PushSubscribeInputSchema>;

// W23: 기사용 RN 앱 FCM 토큰 등록.
export const FcmSubscribeInputSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(["android", "ios"]),
  appVersion: z.string().max(50).optional(),
  userAgent: z.string().max(500).optional(),
});
export type FcmSubscribeInput = z.infer<typeof FcmSubscribeInputSchema>;
