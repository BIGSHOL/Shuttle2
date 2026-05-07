import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import { UserActionButtons } from "../../_components/user-action-buttons";

const STAFF_ROLE_LABEL = {
  OWNER: "학원장",
  DRIVER: "기사",
  HELPER: "동승자",
} as const;

type PushDevices = {
  webPush: number; // 웹 푸시 구독 수 (브라우저)
  fcm: number; // 앱 푸시 토큰 수 (기사 앱)
};

// W24: 매니저 — 사용자 1명 상세. 직원(STAFF) 또는 학부모(GUARDIAN).
// 푸시 진단 카드(웹 푸시·앱 푸시 등록 수 + 마지막 로그인) 포함.
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind: kindRaw, id } = await params;
  if (kindRaw !== "STAFF" && kindRaw !== "GUARDIAN") notFound();
  const kind = kindRaw as "STAFF" | "GUARDIAN";

  if (kind === "STAFF") {
    const s = await db.staff.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        loginId: true,
        phone: true,
        recoveryEmail: true,
        userId: true,
        org: { select: { id: true, name: true } },
        _count: {
          select: {
            pushSubscriptions: true,
            fcmSubscriptions: true,
          },
        },
      },
    });
    if (!s) notFound();
    const lastSignInAt = await fetchLastSignIn(s.userId);
    return renderProfile({
      kind: "STAFF",
      id: s.id,
      name: s.name,
      subTitle: `${STAFF_ROLE_LABEL[s.role]} · ${s.org.name}`,
      orgLink: { id: s.org.id, label: `${s.org.name} 상세` },
      info: [
        { label: "로그인 아이디", value: s.loginId ?? "—" },
        { label: "전화", value: s.phone },
        { label: "복구용 이메일", value: s.recoveryEmail ?? "미등록" },
        { label: "인증 계정", value: s.userId ?? "미가입" },
      ],
      pushDevices: {
        webPush: s._count.pushSubscriptions,
        fcm: s._count.fcmSubscriptions,
      },
      lastSignInAt,
      recoveryEmail: s.recoveryEmail,
    });
  }

  const g = await db.guardian.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      loginId: true,
      phone: true,
      recoveryEmail: true,
      userId: true,
      _count: { select: { pushSubscriptions: true } },
      links: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              org: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!g) notFound();

  const childList = g.links.map((l) => ({
    id: l.student.id,
    name: l.student.name,
    orgName: l.student.org.name,
  }));
  const lastSignInAt = await fetchLastSignIn(g.userId);

  return renderProfile({
    kind: "GUARDIAN",
    id: g.id,
    name: g.name,
    subTitle: `학부모 · 자녀 ${childList.length}명`,
    info: [
      { label: "로그인 아이디", value: g.loginId ?? "—" },
      { label: "전화", value: g.phone },
      { label: "복구용 이메일", value: g.recoveryEmail ?? "미등록" },
      { label: "인증 계정", value: g.userId ?? "미가입" },
      {
        label: "자녀",
        value:
          childList.length > 0
            ? childList.map((c) => `${c.name} (${c.orgName})`).join(", ")
            : "—",
      },
    ],
    pushDevices: { webPush: g._count.pushSubscriptions, fcm: 0 },
    lastSignInAt,
    recoveryEmail: g.recoveryEmail,
  });
}

async function fetchLastSignIn(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb.auth.admin.getUserById(userId);
    if (error) return null;
    return data?.user?.last_sign_in_at ?? null;
  } catch (err) {
    console.error("[admin user detail] last sign-in fetch failed", err);
    return null;
  }
}

function formatLastSignIn(iso: string | null): string {
  if (!iso) return "기록 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // KST 표시
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.toISOString().slice(0, 16).replace("T", " ")} KST`;
}

function renderProfile(p: {
  kind: "STAFF" | "GUARDIAN";
  id: string;
  name: string;
  subTitle: string;
  info: { label: string; value: string }[];
  recoveryEmail: string | null;
  pushDevices: PushDevices;
  lastSignInAt: string | null;
  orgLink?: { id: string; label: string };
}) {
  const noPushRegistration =
    p.pushDevices.webPush + p.pushDevices.fcm === 0;
  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        사용자 목록으로
      </Link>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h2 className="text-xl font-extrabold tracking-tight">{p.name}</h2>
        <p className="text-muted-foreground mt-1.5 text-sm font-medium">
          {p.subTitle}
        </p>
        {p.orgLink ? (
          <Link
            href={`/admin/orgs/${p.orgLink.id}`}
            className="text-info mt-2 inline-block text-xs font-bold hover:underline"
          >
            → {p.orgLink.label}
          </Link>
        ) : null}
      </div>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          기본 정보
        </h3>
        <dl className="grid grid-cols-1 gap-2 text-sm lg:grid-cols-2">
          {p.info.map((i) => (
            <div key={i.label}>
              <dt className="text-muted-foreground text-[11px] font-bold uppercase">
                {i.label}
              </dt>
              <dd className="text-foreground mt-0.5 break-words font-medium">
                {i.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 푸시 진단 */}
      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          푸시·로그인 진단
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <DiagnosticCell
            label="웹 푸시 구독"
            value={`${p.pushDevices.webPush}대`}
            tone={p.pushDevices.webPush > 0 ? "success" : "warning"}
          />
          {p.kind === "STAFF" ? (
            <DiagnosticCell
              label="앱 푸시 (기사 앱)"
              value={`${p.pushDevices.fcm}대`}
              tone={p.pushDevices.fcm > 0 ? "success" : undefined}
            />
          ) : null}
          <DiagnosticCell
            label="마지막 로그인"
            value={formatLastSignIn(p.lastSignInAt)}
          />
        </div>
        {noPushRegistration ? (
          <p className="text-warning mt-3 text-xs font-medium">
            푸시 등록이 없습니다. 사용자에게 앱 알림 권한 허용을 안내하세요.
          </p>
        ) : null}
      </div>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          매니저 액션
        </h3>
        <UserActionButtons
          kind={p.kind}
          id={p.id}
          name={p.name}
          recoveryEmail={p.recoveryEmail}
        />
      </div>
    </div>
  );
}

function DiagnosticCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </p>
      <p className={`mt-1 text-base font-extrabold tracking-tight ${cls}`}>
        {value}
      </p>
    </div>
  );
}
