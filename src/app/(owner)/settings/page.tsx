import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarOff,
  Clock,
  CreditCard,
  KeyRound,
  MapPinned,
  Plug,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

const SETTING_GROUPS = [
  {
    group: "학원",
    items: [
      { id: "org", label: "일반 정보", Icon: Building2 },
      { id: "hours", label: "운영 시간·휴무일", Icon: Clock },
    ],
  },
  {
    group: "운영 정책",
    items: [
      { id: "alerts", label: "학부모 자동 알림 룰", Icon: Bell },
      { id: "absence-policy", label: "결석·미탑승", Icon: CalendarOff },
      { id: "stop-policy", label: "정류장 변경", Icon: MapPinned },
      { id: "safety", label: "안전점검", Icon: ShieldCheck },
    ],
  },
  {
    group: "시스템",
    items: [
      { id: "users", label: "사용자·권한", Icon: KeyRound },
      { id: "integrations", label: "외부 연동", Icon: Plug },
      { id: "billing", label: "요금제·결제", Icon: CreditCard },
    ],
  },
  {
    group: "기타",
    items: [{ id: "danger", label: "위험 구역", Icon: AlertTriangle }],
  },
] as const;

const ALERT_RULES = [
  {
    key: "depart",
    label: "차량 출발 (집 → 학원)",
    desc: "버스가 첫 정류장에 도착하기 N분 전에 보호자에게 발송됩니다.",
    valueLabel: "5분 전",
    enabled: true,
  },
  {
    key: "boarded",
    label: "학생 탑승 완료",
    desc: "기사 또는 동승자가 학생 탑승을 확인한 즉시 발송됩니다.",
    valueLabel: "즉시",
    enabled: true,
  },
  {
    key: "no-show",
    label: "학생 미탑승",
    desc:
      "정류장에서 30초 대기 후에도 미탑승 시 보호자에게 즉시 발송됩니다. 도로교통법상 권장 의무.",
    valueLabel: "30초 대기",
    enabled: true,
    legal: true,
  },
  {
    key: "alighted",
    label: "학생 하차 완료",
    desc: "하원 시 정류장 또는 본원에서 하차한 즉시 발송됩니다.",
    valueLabel: "즉시",
    enabled: true,
  },
  {
    key: "delay",
    label: "운행 지연 (5분 이상)",
    desc:
      "예상 시간보다 지연될 경우 해당 정류장에 대기 중인 보호자에게 발송됩니다.",
    valueLabel: "5분 이상",
    enabled: true,
  },
  {
    key: "emergency",
    label: "긴급 상황 (사고·고장)",
    desc:
      "기사가 긴급 상황을 보고하면 모든 보호자에게 즉시 발송됩니다. 변경 불가.",
    valueLabel: "즉시",
    enabled: true,
    locked: true,
  },
];

export default async function SettingsPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      type: true,
      plan: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-black tracking-tight lg:text-3xl">설정</h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
          학원 정보 · 운영 정책 · 알림 · 사용자 권한 · 외부 연동 관리.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        {/* 좌측 sub-nav (sticky) */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <nav aria-label="설정 메뉴" className="space-y-4">
            {SETTING_GROUPS.map((g) => (
              <div key={g.group}>
                <h3 className="text-muted-foreground mb-1.5 px-2 text-[10px] font-extrabold tracking-wider uppercase">
                  {g.group}
                </h3>
                <ul className="space-y-0.5">
                  {g.items.map(({ id, label, Icon }) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-bold tracking-tight transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* 우측 sections */}
        <div className="space-y-5">
          <Section
            id="org"
            title="학원 일반 정보"
            description="학부모·기사 앱과 모든 알림에 표시되는 기본 정보. 변경 시 보호자에게 알림 발송."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="기관명">
                <Input defaultValue={org?.name ?? ""} disabled />
              </FormField>
              <FormField label="기관 유형">
                <Input
                  defaultValue={
                    org ? ORG_TYPE_LABEL[org.type] : ""
                  }
                  disabled
                />
              </FormField>
              <FormField label="대표자">
                <Input defaultValue={user.staff.name} disabled />
              </FormField>
              <FormField label="가입일">
                <Input
                  defaultValue={
                    org?.createdAt?.toISOString().slice(0, 10) ?? ""
                  }
                  disabled
                />
              </FormField>
            </div>
            <PlaceholderNote />
          </Section>

          <Section
            id="hours"
            title="운영 시간·휴무일"
            description="운행 가능 시간대와 자동 휴무 처리 규칙."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="등원 운행 시간">
                <Input defaultValue="07:30 ~ 09:00" disabled />
              </FormField>
              <FormField label="하원 운행 시간">
                <Input defaultValue="15:00 ~ 18:30" disabled />
              </FormField>
              <FormField label="운영 요일">
                <Input defaultValue="월·화·수·목·금" disabled />
              </FormField>
              <FormField label="공휴일 자동 휴무">
                <Input defaultValue="ON · 대한민국 공휴일" disabled />
              </FormField>
            </div>
            <PlaceholderNote />
          </Section>

          <Section
            id="alerts"
            title="학부모 자동 알림 룰"
            description="각 이벤트별로 카카오 알림톡·SMS·푸시 발송 여부를 설정합니다."
          >
            <ul className="divide-y">
              {ALERT_RULES.map((r) => (
                <li
                  key={r.key}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold tracking-tight">
                        {r.label}
                      </p>
                      <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold">
                        기본 ON
                      </span>
                      {r.legal ? (
                        <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold">
                          법적 의무·권장
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {r.desc}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground text-xs font-bold">
                      {r.valueLabel}
                    </span>
                    <span
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        r.enabled ? "bg-bus" : "bg-muted",
                      )}
                      aria-checked={r.enabled}
                      role="switch"
                    >
                      <span
                        className={cn(
                          "bg-card inline-block h-4 w-4 rounded-full shadow-sm transition-transform",
                          r.enabled ? "translate-x-4" : "translate-x-0.5",
                        )}
                      />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <PlaceholderNote />
          </Section>

          <Section
            id="absence-policy"
            title="결석·미탑승 정책"
            description="결석 신청 마감, 미탑승 처리 규칙."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="결석 신청 마감">
                <Input defaultValue="운행 시작 60분 전까지" disabled />
              </FormField>
              <FormField label="미탑승 후 처리">
                <Input
                  defaultValue="30초 대기 → 보호자 즉시 알림"
                  disabled
                />
              </FormField>
            </div>
            <PlaceholderNote />
          </Section>

          <Section
            id="stop-policy"
            title="정류장 변경 처리"
            description="학부모가 신청한 정류장 변경 처리 흐름."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="처리 정책">
                <Input defaultValue="학원장 승인 후 적용" disabled />
              </FormField>
              <FormField label="현재 대기 중">
                <Input defaultValue="0건" disabled />
              </FormField>
            </div>
            <PlaceholderNote />
          </Section>

          <Section
            id="safety"
            title="안전점검 정책"
            description="어린이용 차량 안전점검 항목·검사 주기."
          >
            <PlaceholderNote text="어린이용 차량 운행마다 출발 전·도착 후 자동 점검 (좌석 안전띠·동승보호자·전원 하차 확인). 도로교통법 의무이므로 비활성화 불가." />
          </Section>

          <Section
            id="users"
            title="사용자·권한"
            description="학원장·기사·동승자·학부모 계정 관리."
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/staff">직원 관리</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/guardians">보호자 관리</Link>
              </Button>
            </div>
          </Section>

          <Section
            id="integrations"
            title="외부 연동"
            description="카카오맵·푸시·SMS 등 외부 서비스 연동 상태."
          >
            <ul className="divide-y">
              <Integration
                name="카카오맵 JS SDK"
                status="connected"
                detail="학부모 trip-live · 정류장 등록 지도"
              />
              <Integration
                name="Web Push (VAPID)"
                status="connected"
                detail="학부모·기사 디바이스 푸시 알림"
              />
              <Integration
                name="Firebase FCM"
                status="connected"
                detail="기사용 RN 앱 백그라운드 푸시"
              />
              <Integration
                name="Supabase Auth + Realtime"
                status="connected"
                detail="로그인 + GPS 5초 broadcast"
              />
              <Integration
                name="SMS (NHN Cloud)"
                status="pending"
                detail="베타 후 통합 예정"
              />
            </ul>
          </Section>

          <Section
            id="billing"
            title="요금제·결제"
            description="현재 플랜과 다음 청구 예정. 자세한 청구서는 요금·청구 화면."
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                현재 플랜:{" "}
                <span className="text-bus-foreground bg-bus-soft rounded-md px-2 py-0.5 text-xs font-extrabold">
                  {org?.plan ?? "TRIAL"}
                </span>
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/billing">요금·청구로 이동</Link>
              </Button>
            </div>
          </Section>

          <Section
            id="danger"
            title="위험 구역"
            description="되돌릴 수 없는 작업. 신중히 결정하세요."
            tone="destructive"
          >
            <div className="space-y-3">
              <Button variant="destructive" size="sm" disabled>
                학원 비활성화 신청
              </Button>
              <p className="text-muted-foreground text-xs">
                학원 비활성화는 셔틀이 운영팀 검토 후 적용됩니다. 학생·운행
                데이터는 분기 PDF 발행 후 90일간 보관 후 영구 삭제됩니다.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  description,
  children,
  tone,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "destructive";
}) {
  return (
    <Card
      id={id}
      className={cn(
        "scroll-mt-6",
        tone === "destructive" && "border-destructive/40",
      )}
    >
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PlaceholderNote({
  text = "베타 기간은 변경이 비활성화돼 있습니다. 정식 출시 시 폼이 활성화됩니다.",
}: {
  text?: string;
}) {
  return (
    <p className="text-muted-foreground mt-3 text-[11px] font-semibold">
      {text}
    </p>
  );
}

function Integration({
  name,
  status,
  detail,
}: {
  name: string;
  status: "connected" | "pending";
  detail: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-tight">{name}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide",
          status === "connected"
            ? "bg-success-soft text-success"
            : "bg-muted text-muted-foreground",
        )}
      >
        {status === "connected" ? "연결됨" : "예정"}
      </span>
    </li>
  );
}
