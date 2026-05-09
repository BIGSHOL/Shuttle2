import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock,
  GraduationCap,
  IdCard,
  MapPin,
  PartyPopper,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "학원 정보", Icon: ShieldCheck },
  { id: 2, label: "운영 모드", Icon: Bus },
  { id: 3, label: "노선·차량·기사", Icon: RouteIcon },
  { id: 4, label: "학생·학부모 초대", Icon: Users },
  { id: 5, label: "완료", Icon: CheckCircle2 },
] as const;

const ORG_TYPE_LABEL = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

// W25 P1-B: ground truth Owner Onboarding.html — 5단계 위저드.
// 신규 학원 가입 후 첫 운행까지 가이드. 베타 시점은 UI + 안내·외부 페이지 link
// 위주 (실제 schema 변경은 P3 backlog). step은 ?step=N으로 navigate.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const me = await requireOwner();
  const orgId = await getOrgId();
  const sp = await searchParams;
  const step = Math.min(
    5,
    Math.max(1, Number.parseInt(sp.step ?? "1", 10) || 1),
  );

  // 진행 상태 — 각 step 자동 완료 검사용
  const [vehicleCount, routeCount, staffCount, studentCount, guardianCount] =
    await Promise.all([
      db.vehicle.count({ where: { orgId } }),
      db.route.count({ where: { vehicle: { orgId } } }),
      db.staff.count({
        where: { orgId, role: { in: ["DRIVER", "HELPER"] } },
      }),
      db.student.count({ where: { orgId } }),
      db.guardianLink.count({
        where: { student: { orgId } },
      }),
    ]);

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      {/* 뒤로 */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">대시보드</span>
          </Link>
        </Button>
        <h2 className="mt-2 text-2xl font-black tracking-tight lg:text-3xl">
          학원 온보딩
        </h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
          신규 학원 첫 운행까지 5단계로 안내합니다. 평균 15분이면 끝나요.
        </p>
      </div>

      {/* Step indicator */}
      <ol className="bg-card flex items-center justify-between gap-1 overflow-x-auto rounded-lg border p-3 shadow-sm">
        {STEPS.map(({ id, label, Icon }) => {
          const active = id === step;
          const done = id < step;
          return (
            <li key={id} className="flex flex-1 items-center gap-2">
              <Link
                href={`/onboarding?step=${id}`}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                  active
                    ? "bg-bus-soft text-bus-foreground"
                    : done
                      ? "text-success"
                      : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold",
                    active
                      ? "bg-bus text-bus-foreground border-bus-foreground/15 border"
                      : done
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : id}
                </span>
                <span className="hidden truncate text-xs font-bold sm:inline">
                  {label}
                </span>
                <Icon className="ml-auto hidden h-3.5 w-3.5 shrink-0 lg:inline" />
              </Link>
              {id < 5 ? (
                <ArrowRight className="text-muted-foreground/40 h-3 w-3 shrink-0" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      {step === 1 ? (
        <Step1Org orgName={me.org.name} orgType={me.org.type} />
      ) : null}
      {step === 2 ? <Step2Mode /> : null}
      {step === 3 ? (
        <Step3Resources
          vehicleCount={vehicleCount}
          routeCount={routeCount}
          staffCount={staffCount}
        />
      ) : null}
      {step === 4 ? (
        <Step4Invite
          studentCount={studentCount}
          guardianCount={guardianCount}
        />
      ) : null}
      {step === 5 ? <Step5Done orgName={me.org.name} /> : null}

      {/* nav */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" disabled={step === 1}>
          <Link
            href={`/onboarding?step=${Math.max(1, step - 1)}`}
            aria-disabled={step === 1}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </Link>
        </Button>
        <span className="text-muted-foreground text-xs font-bold tabular-nums">
          {step} / 5
        </span>
        {step < 5 ? (
          <Button asChild>
            <Link
              href={`/onboarding?step=${step + 1}`}
              className="flex items-center gap-1"
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/dashboard">대시보드로</Link>
          </Button>
        )}
      </div>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 1 — 학원 정보
// ────────────────────────────────────────────────────────────────────
function Step1Org({
  orgName,
  orgType,
}: {
  orgName: string;
  orgType: keyof typeof ORG_TYPE_LABEL;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">학원 정보</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs font-semibold">
          학부모·기사 앱과 모든 알림에 표시되는 기본 정보. 베타 기간은 가입
          시점 정보 그대로 사용합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="학원명">
            <Input defaultValue={orgName} disabled />
          </Field>
          <Field label="기관 유형">
            <Input defaultValue={ORG_TYPE_LABEL[orgType]} disabled />
          </Field>
          <Field label="대표 연락처">
            <Input placeholder="02-1234-5678" disabled />
          </Field>
          <Field label="사업자등록번호 (선택)">
            <Input placeholder="123-45-67890" disabled />
          </Field>
          <Field label="주소">
            <Input placeholder="서울시 강남구 ..." disabled />
          </Field>
          <Field label="예상 학생 수">
            <Input placeholder="50~200명" disabled />
          </Field>
        </div>
        <p className="text-muted-foreground text-[11px] font-semibold">
          베타 기간은 변경이 비활성화돼 있습니다. 정식 출시 시 폼이 활성화돼
          저장됩니다 (P3 backlog).
        </p>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 2 — 운영 모드
// ────────────────────────────────────────────────────────────────────
function Step2Mode() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">운영 모드</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs font-semibold">
          어린이용은 동승보호자·안전점검·전원 하차 확인이 의무입니다. 나중에
          노선별로도 변경할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            label="어린이용 (KIDS)"
            desc="유치원생·초등학생 중심. 동승보호자 필수 · 안전점검 의무 · 전원 하차 확인."
            tone="bus"
            checked
          />
          <ModeCard
            label="일반용 (GENERAL)"
            desc="중·고등 / 성인 학습자 중심. 동승보호자 선택 · 안전점검은 차량 점검 위주."
            tone="muted"
          />
        </div>
        <p className="text-muted-foreground mt-3 text-[11px] font-semibold">
          모드 선택은 차량별로 합니다 (3단계에서). 여기는 베타 기본값 안내.
        </p>
      </CardContent>
    </Card>
  );
}

function ModeCard({
  label,
  desc,
  tone,
  checked,
}: {
  label: string;
  desc: string;
  tone: "bus" | "muted";
  checked?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-colors",
        tone === "bus"
          ? "bg-bus-soft border-bus/40"
          : "bg-card border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-sm font-extrabold tracking-tight",
            tone === "bus" ? "text-bus-foreground" : "",
          )}
        >
          {label}
        </p>
        {checked ? (
          <CheckCircle2 className="text-bus-foreground h-4 w-4" />
        ) : null}
      </div>
      <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed font-semibold">
        {desc}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 3 — 노선·차량·기사 (quick links)
// ────────────────────────────────────────────────────────────────────
function Step3Resources({
  vehicleCount,
  routeCount,
  staffCount,
}: {
  vehicleCount: number;
  routeCount: number;
  staffCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">노선·차량·기사</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs font-semibold">
          운행을 시작하려면 차량·노선·기사 각 1개 이상 등록이 필요합니다. 현재
          상태:
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResourceRow
          Icon={Bus}
          label="차량"
          count={vehicleCount}
          required={1}
          href="/vehicles/new"
          actionLabel="차량 등록"
        />
        <ResourceRow
          Icon={MapPin}
          label="정류장"
          count={0}
          required={2}
          href="/stops/new"
          actionLabel="정류장 등록"
          help="등원·하원 경로의 시작점·경유지·종착점 (보통 4~6개)"
        />
        <ResourceRow
          Icon={RouteIcon}
          label="노선"
          count={routeCount}
          required={1}
          href="/routes/new"
          actionLabel="노선 등록"
          help="차량 + 정류장 순서를 묶어 등원·하원 단위로 관리"
        />
        <ResourceRow
          Icon={IdCard}
          label="기사·동승보호자"
          count={staffCount}
          required={1}
          href="/staff/invite"
          actionLabel="초대 보내기"
          help="기사 폰에 PWA 설치 + 안드로이드는 RN 앱 사이드로드 권장"
        />
      </CardContent>
    </Card>
  );
}

function ResourceRow({
  Icon,
  label,
  count,
  required,
  href,
  actionLabel,
  help,
}: {
  Icon: typeof Bus;
  label: string;
  count: number;
  required: number;
  href: string;
  actionLabel: string;
  help?: string;
}) {
  const ok = count >= required;
  return (
    <div className="bg-muted/30 flex items-start gap-3 rounded-md p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2",
          ok
            ? "bg-success-soft text-success border-success/30"
            : "bg-warning-soft text-warning border-warning/30",
        )}
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-extrabold tracking-tight">{label}</p>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide",
              ok
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning",
            )}
          >
            {count} / 최소 {required}
          </span>
        </div>
        {help ? (
          <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold">
            {help}
          </p>
        ) : null}
      </div>
      <Button asChild variant={ok ? "outline" : "default"} size="sm">
        <Link href={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 4 — 학생·학부모 초대
// ────────────────────────────────────────────────────────────────────
function Step4Invite({
  studentCount,
  guardianCount,
}: {
  studentCount: number;
  guardianCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">학생·학부모 초대</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs font-semibold">
          학생을 등록하고 보호자를 초대 링크로 연결합니다. 보호자가 초대 링크
          탭하면 자녀 운행 정보가 자동으로 보입니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResourceRow
          Icon={GraduationCap}
          label="학생"
          count={studentCount}
          required={1}
          href="/students/new"
          actionLabel="학생 등록"
          help="이름·생년·학교·학년·노선·정류장 입력"
        />
        <ResourceRow
          Icon={Users}
          label="보호자 연결"
          count={guardianCount}
          required={1}
          href="/guardians/invite"
          actionLabel="초대 발송"
          help="휴대폰 번호로 초대 링크 SMS·카카오 발송"
        />
        <div className="bg-info-soft border-info/30 rounded-md border p-3">
          <p className="text-info flex items-center gap-1.5 text-xs font-extrabold">
            <Clock className="h-3.5 w-3.5" />
            빠른 등록 팁
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed font-semibold">
            학생은 CSV 일괄 업로드 가능. 보호자 초대 링크는 단체 카톡으로 한 번에
            발송하면 50명 5분 이내 가입 완료.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 5 — 완료
// ────────────────────────────────────────────────────────────────────
function Step5Done({ orgName }: { orgName: string }) {
  return (
    <Card className="border-bus/30 bg-bus-soft/30">
      <CardContent className="space-y-4 p-6 text-center lg:p-10">
        <div className="bg-bus text-bus-foreground border-bus-foreground/15 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-md">
          <PartyPopper className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight">
            온보딩 완료!
          </h3>
          <p className="text-muted-foreground mt-2 text-sm font-bold">
            {orgName}의 셔틀 운영을 시작할 준비가 됐어요.
          </p>
        </div>
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <Button asChild>
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/help?role=owner">학원장 가이드 보기</Link>
          </Button>
        </div>
        <p className="text-muted-foreground/80 pt-2 text-[11px] font-semibold">
          궁금한 점은 도움말 또는 셔틀이 운영팀에 문의해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// 공용 form field
// ────────────────────────────────────────────────────────────────────
function Field({
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
