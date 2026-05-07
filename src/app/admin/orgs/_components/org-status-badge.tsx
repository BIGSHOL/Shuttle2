// W24: 학원 상태 배지 — server·client 양쪽에서 사용 가능 (no "use client").

const STATUS_STYLE = {
  ACTIVE: "bg-success-soft text-success",
  SUSPENDED: "bg-destructive/10 text-destructive",
  TRIAL_EXPIRED: "bg-warning-soft text-warning",
} as const;

const STATUS_LABEL = {
  ACTIVE: "운영",
  SUSPENDED: "정지",
  TRIAL_EXPIRED: "만료",
} as const;

export function OrgStatusBadge({
  status,
}: {
  status: keyof typeof STATUS_STYLE;
}) {
  return (
    <span
      className={`${STATUS_STYLE[status]} rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
