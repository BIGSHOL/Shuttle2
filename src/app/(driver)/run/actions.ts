"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireDriver, requireDriverOrHelper } from "@/lib/auth/session";
import { assignHelper } from "@/server/driver/assign-helper";
import { endTrip } from "@/server/driver/end-trip";
import { markBoardingIssue } from "@/server/driver/mark-boarding-issue";
import { recordPing } from "@/server/driver/record-ping";
import { startTrip } from "@/server/driver/start-trip";
import { toggleBoardingEvent } from "@/server/driver/toggle-boarding-event";
import {
  AssignHelperInputSchema,
  BoardingInputSchema,
  MarkIssueInputSchema,
  PingInputSchema,
  SafetyFieldsInputSchema,
  StartTripInputSchema,
  UnmarkIssueInputSchema,
  type BoardingInput,
  type MarkIssueInput,
  type PingInput,
  type SafetyFieldsInput,
} from "@/server/driver/types";
import { unmarkBoardingIssue } from "@/server/driver/unmark-boarding-issue";
import { upsertSafetyCheck } from "@/server/driver/upsert-safety-check";

// W3-3b: 기사 폰이 직접 좌표를 send. start/end 시 위치는 첫/마지막 ping에서 채워짐.
// W23: 비즈니스 로직은 `src/server/driver/*`로 추출. 이 파일은 SA wrapper만 —
// 검증(requireDriver/Helper) → zod parse → 비즈니스 함수 호출 → revalidatePath/redirect.
// Route Handler(Day 2)도 동일 비즈니스 함수를 호출.

// "use server" 파일은 모든 export가 async function — type re-export 금지
// (turbopack module evaluation에서 ReferenceError → driver SA 전체 fail).
// underlying type은 @/server/driver/types에서 직접 import.

// NextJS production은 server action throw의 message를 redact (영문 generic으로
// 변환). 비즈니스 한국어 message가 사용자에게 도달하려면 throw 대신 discriminated
// union return — try/catch로 wrap하고 redirect는 catch 밖에 둠.

export async function startTripAction(
  routeId: string,
  vehicleId: string,
): Promise<{ error: string } | undefined> {
  const me = await requireDriver();
  const parsed = StartTripInputSchema.parse({ routeId, vehicleId });
  let tripId: string;
  try {
    const result = await startTrip(me, parsed);
    tripId = result.tripId;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "운행 시작에 실패했어요",
    };
  }
  revalidatePath("/run");
  revalidatePath("/dashboard");
  redirect(`/trip/${tripId}`);
}

export async function endTripAction(
  tripId: string,
): Promise<{ error: string } | undefined> {
  const me = await requireDriver();
  try {
    await endTrip(me, tripId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "운행 종료에 실패했어요",
    };
  }
  revalidatePath("/run");
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/dashboard");
  redirect("/run");
}

export async function recordPingAction(input: PingInput): Promise<void> {
  const me = await requireDriver();
  const parsed = PingInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("잘못된 좌표 데이터");
  await recordPing(me, parsed.data);
}

export async function upsertSafetyCheckAction(
  tripId: string,
  fields: SafetyFieldsInput,
): Promise<void> {
  const me = await requireDriverOrHelper();
  const parsed = SafetyFieldsInputSchema.safeParse(fields);
  if (!parsed.success) throw new Error("잘못된 안전점검 데이터");
  await upsertSafetyCheck(me, tripId, parsed.data);
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/dashboard");
}

export async function toggleBoardingEventAction(
  input: BoardingInput,
): Promise<void> {
  const me = await requireDriverOrHelper();
  const parsed = BoardingInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("잘못된 탑승·하차 데이터");
  await toggleBoardingEvent(me, parsed.data);
  revalidatePath(`/trip/${parsed.data.tripId}`);
  revalidatePath(`/dashboard/trip/${parsed.data.tripId}`);
  revalidatePath("/dashboard");
}

export async function markBoardingIssueAction(
  input: MarkIssueInput,
): Promise<void> {
  const me = await requireDriverOrHelper();
  const parsed = MarkIssueInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("잘못된 입력 데이터");
  await markBoardingIssue(me, parsed.data);
  revalidatePath(`/trip/${parsed.data.tripId}`);
  revalidatePath(`/dashboard/trip/${parsed.data.tripId}`);
  revalidatePath("/dashboard");
}

export async function unmarkBoardingIssueAction(
  tripId: string,
  studentId: string,
  type: "NO_SHOW" | "NO_DROPOFF",
): Promise<void> {
  const me = await requireDriverOrHelper();
  const parsed = UnmarkIssueInputSchema.parse({ tripId, studentId, type });
  await unmarkBoardingIssue(me, parsed);
  revalidatePath(`/trip/${tripId}`);
  revalidatePath(`/dashboard/trip/${tripId}`);
  revalidatePath("/dashboard");
}

export async function assignHelperAction(
  tripId: string,
  helperId: string | null,
): Promise<void> {
  const me = await requireDriver();
  const parsed = AssignHelperInputSchema.parse({ tripId, helperId });
  await assignHelper(me, parsed);
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/dashboard");
}
