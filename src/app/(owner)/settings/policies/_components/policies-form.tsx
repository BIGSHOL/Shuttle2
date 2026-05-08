"use client";

import { Bell, MapPin, UserX } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { updatePoliciesAction } from "../actions";

type Policy = {
  absenceAutoAck: boolean;
  absenceCutoffMin: number;
  stopChangeAutoApprove: boolean;
  stopChangeRequiresReason: boolean;
  stopChangeMaxDays: number;
  notifyParentOnDecision: boolean;
  notifyDriverOnApprove: boolean;
};

export function PoliciesForm({ policy }: { policy: Policy }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updatePoliciesAction(formData);
        toast.success("정책을 저장했어요");
      } catch {
        toast.error("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3.5">
      <Section
        icon={<UserX className="h-4 w-4" />}
        iconClass="bg-warning-soft text-warning"
        title="결석 신청"
        subtitle="학부모의 결석 신청에 대한 처리 정책"
      >
        <Toggle
          name="absenceAutoAck"
          defaultChecked={policy.absenceAutoAck}
          label="자동 확인"
          help="결석 신청 즉시 '확인됨' 처리하고 기사에게 알림 (수동 처리 불필요)"
        />
        <NumberField
          name="absenceCutoffMin"
          defaultValue={policy.absenceCutoffMin}
          label="신청 마감 (출발 전 N분)"
          help="이 시간 이후 신청은 즉시 기사 알림 발송 (예: 15분)"
          suffix="분"
          min={0}
          max={720}
        />
      </Section>

      <Section
        icon={<MapPin className="h-4 w-4" />}
        iconClass="bg-info-soft text-info"
        title="정류장 변경"
        subtitle="같은 노선의 기존 정류장 중에서만 변경 가능 — 신규 정류장 생성은 불가"
      >
        <Toggle
          name="stopChangeAutoApprove"
          defaultChecked={policy.stopChangeAutoApprove}
          label="자동 승인"
          help="같은 노선의 인접 정류장(순서 ±1) 변경은 자동 승인 (권장: OFF)"
        />
        <Toggle
          name="stopChangeRequiresReason"
          defaultChecked={policy.stopChangeRequiresReason}
          label="사유 필수"
          help="학부모가 변경 사유를 반드시 입력해야 함"
        />
        <NumberField
          name="stopChangeMaxDays"
          defaultValue={policy.stopChangeMaxDays}
          label="임시 변경 최대 기간"
          help="0이면 영구 변경만 허용. 1 이상이면 그 일수 이내의 임시 변경 허용"
          suffix="일"
          min={0}
          max={365}
        />
      </Section>

      <Section
        icon={<Bell className="h-4 w-4" />}
        iconClass="bg-bus-soft text-bus-foreground"
        title="알림 발송"
        subtitle="결정·승인 시 자동 알림"
      >
        <Toggle
          name="notifyParentOnDecision"
          defaultChecked={policy.notifyParentOnDecision}
          label="학부모 푸시 알림"
          help="결석 확인 / 정류장 변경 승인·반려 결과를 학부모에게 즉시 발송"
        />
        <Toggle
          name="notifyDriverOnApprove"
          defaultChecked={policy.notifyDriverOnApprove}
          label="기사 SMS 알림"
          help="정류장 변경 승인 시 해당 운행 기사에게 SMS 자동 발송"
        />
      </Section>

      <div className="bg-card border-border sticky bottom-4 flex justify-end gap-2 rounded-lg border p-3 shadow-md">
        <Button
          type="submit"
          disabled={pending}
          className="bg-bus hover:bg-bus/90 text-bus-foreground h-10 px-7 text-sm font-extrabold"
        >
          {pending ? "저장 중..." : "정책 저장"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon,
  iconClass,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <header className="flex items-center gap-3 border-b p-4">
        <div
          className={`grid h-9 w-9 place-items-center rounded-md ${iconClass}`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold">
            {subtitle}
          </p>
        </div>
      </header>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function Toggle({
  name,
  defaultChecked,
  label,
  help,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  help: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold tracking-tight">{label}</div>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold leading-relaxed">
          {help}
        </p>
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="bg-muted peer-checked:bg-success relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors">
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function NumberField({
  name,
  defaultValue,
  label,
  help,
  suffix,
  min,
  max,
}: {
  name: string;
  defaultValue: number;
  label: string;
  help: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold tracking-tight">{label}</div>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold leading-relaxed">
          {help}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          name={name}
          type="number"
          defaultValue={defaultValue}
          min={min}
          max={max}
          className="bg-muted h-10 w-20 rounded-md border px-2.5 text-right text-sm font-extrabold tabular-nums"
        />
        {suffix ? (
          <span className="text-muted-foreground text-xs font-bold">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}
