// W24: AdminAuditLog.action enum → 한국어 라벨 매핑.
// 학원 detail의 "최근 30일 매니저 작업 이력"·신규 통합 audit log 페이지에서
// 사용. 신규 액션을 actions.ts에 추가하면 여기에도 라벨을 추가한다.

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  ORG_PLAN_CHANGED: "요금제 변경",
  ORG_SUSPENDED: "학원 일시정지",
  ORG_ACTIVATED: "학원 활성화",
  IMPERSONATE_START: "임시 진입 시작",
  IMPERSONATE_END: "임시 진입 종료",
  DRIVER_APP_RELEASE_ADDED: "기사 앱 버전 등록",
  DRIVER_APP_RELEASE_EDITED: "기사 앱 버전 수정",
  DRIVER_APP_RELEASE_ACTIVATED: "기사 앱 버전 활성화",
  PUSH_TEST_SENT: "푸시 테스트 발송",
  USER_PASSWORD_RESET_SENT: "비밀번호 재설정 메일 발송",
  USER_RECOVERY_EMAIL_CHANGED: "복구용 이메일 변경",
  USER_FORCE_SIGNOUT: "강제 로그아웃",
};

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] =
  Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => ({ value, label }));

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
