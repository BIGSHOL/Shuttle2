// OrgType별 호칭 분기. 학원·교습소는 "학생", 어린이집·유치원은 "원아".
// CLAUDE.md 명세에 명시된 라벨 분기점들을 이 헬퍼 한 군데에서 관리.

import type { OrgType } from "@/generated/prisma/enums";

export function studentTerm(orgType: OrgType): "학생" | "원아" {
  return orgType === "ACADEMY" ? "학생" : "원아";
}

export function ownerTerm(orgType: OrgType): "학원장" | "원장" {
  return orgType === "ACADEMY" ? "학원장" : "원장";
}

export function institutionTerm(orgType: OrgType): "학원" | "기관" {
  return orgType === "ACADEMY" ? "학원" : "기관";
}

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};
