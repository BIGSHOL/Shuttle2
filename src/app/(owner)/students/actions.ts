"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

// ────────────────────────────────────────────────────────────────────
// Student 본체 CRUD
// ────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const StudentInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요")
    .max(50, "이름이 너무 깁니다"),
  birthYear: z.coerce
    .number()
    .int("출생연도는 정수")
    .min(CURRENT_YEAR - 20, "출생연도가 너무 오래되었습니다")
    .max(CURRENT_YEAR, "출생연도가 미래입니다"),
});

export type StudentFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseStudentForm(formData: FormData) {
  return StudentInput.safeParse({
    name: formData.get("name"),
    birthYear: formData.get("birthYear"),
  });
}

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const created = await db.student.create({
    data: { orgId, ...parsed.data },
  });

  revalidatePath("/dashboard");
  revalidatePath("/students");
  redirect(`/students/${created.id}/edit`);
}

export async function updateStudentAction(
  id: string,
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const result = await db.student.updateMany({
    where: { id, orgId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { error: "해당 학생을 찾을 수 없습니다" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/students/${id}/edit`);
  return {};
}

export async function deleteStudentAction(id: string): Promise<void> {
  const orgId = await getOrgId();

  // RouteStudent / GuardianLink / BoardingEvent / AbsenceRequest가 묶이면 FK 거절.
  const result = await db.student.deleteMany({
    where: { id, orgId },
  });

  if (result.count === 0) {
    throw new Error("해당 학생을 찾을 수 없습니다");
  }

  revalidatePath("/dashboard");
  revalidatePath("/students");
}

// ────────────────────────────────────────────────────────────────────
// RouteStudent — 학생을 노선·정류장에 배정
// ────────────────────────────────────────────────────────────────────

const RouteStudentInput = z.object({
  routeId: z.string().min(1, "노선을 선택해 주세요"),
  stopId: z.string().min(1, "정류장을 선택해 주세요"),
});

export type RouteStudentFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function ensureStudentInOrg(studentId: string, orgId: string) {
  const s = await db.student.findFirst({
    where: { id: studentId, orgId },
    select: { id: true },
  });
  return !!s;
}

export async function addRouteStudentAction(
  studentId: string,
  _prev: RouteStudentFormState,
  formData: FormData,
): Promise<RouteStudentFormState> {
  const parsed = RouteStudentInput.safeParse({
    routeId: formData.get("routeId"),
    stopId: formData.get("stopId"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();

  if (!(await ensureStudentInOrg(studentId, orgId))) {
    return { error: "해당 학생을 찾을 수 없습니다" };
  }

  // 노선·정류장 모두 본 기관 소속인지 검증.
  const [route, stop] = await Promise.all([
    db.route.findFirst({
      where: { id: parsed.data.routeId, vehicle: { orgId } },
      select: { id: true },
    }),
    db.stop.findFirst({
      where: { id: parsed.data.stopId, orgId },
      select: { id: true },
    }),
  ]);

  if (!route) return { error: "선택한 노선이 본 기관 소속이 아닙니다" };
  if (!stop) return { error: "선택한 정류장이 본 기관 소속이 아닙니다" };

  try {
    await db.routeStudent.create({
      data: { studentId, ...parsed.data },
    });
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique")
          ? "이 학생은 이미 해당 노선에 배정되어 있습니다"
          : "노선 배정에 실패했습니다",
    };
  }

  revalidatePath(`/students/${studentId}/edit`);
  return {};
}

export async function deleteRouteStudentAction(
  studentId: string,
  routeStudentId: string,
): Promise<void> {
  const orgId = await getOrgId();

  // 두 단계 가드: studentId가 본 기관 + routeStudent.studentId 일치
  const result = await db.routeStudent.deleteMany({
    where: {
      id: routeStudentId,
      studentId,
      student: { orgId },
    },
  });

  if (result.count === 0) {
    throw new Error("해당 배정 항목을 찾을 수 없습니다");
  }

  revalidatePath(`/students/${studentId}/edit`);
}
