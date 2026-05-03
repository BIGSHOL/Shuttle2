import Link from "next/link";
import { Bus, Clock, Link2Off, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getGuardianInviteByToken } from "@/app/(owner)/guardians/actions";

import { ParentAcceptForm } from "./accept-form";

const SHELL =
  "bg-muted/40 flex min-h-screen items-center justify-center p-4";

function Logo() {
  return (
    <Link href="/" className="flex items-center justify-center gap-2">
      <span className="bg-bus text-bus-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
        <Bus className="h-5 w-5" />
      </span>
      <span className="text-lg font-extrabold tracking-tight">셔틀이</span>
    </Link>
  );
}

function ErrorCard({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Logo />
      <div className="bg-card rounded-2xl border p-6 text-center shadow-sm">
        <span className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
          {body}
        </p>
        <div className="mt-5">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">로그인 페이지로</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function ParentInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getGuardianInviteByToken(token);

  if (!invite) {
    return (
      <main className={SHELL}>
        <ErrorCard
          Icon={Link2Off}
          title="유효하지 않은 초대 링크"
          body={
            <>
              링크가 잘못되었거나 만료되었습니다.
              <br />
              학원장·원장님께 다시 발급해 달라고 요청하세요.
            </>
          }
        />
      </main>
    );
  }

  if (invite.acceptedAt) {
    return (
      <main className={SHELL}>
        <ErrorCard
          Icon={ShieldCheck}
          title="이미 사용된 초대"
          body={
            <>
              이 링크는 이미 가입에 사용되었습니다.
              <br />
              로그인 페이지에서 본인 계정으로 로그인하세요.
            </>
          }
        />
      </main>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <main className={SHELL}>
        <ErrorCard
          Icon={Clock}
          title="만료된 초대"
          body={
            <>
              초대 링크의 유효기간(7일)이 지났습니다.
              <br />
              학원장·원장님께 새 초대를 요청하세요.
            </>
          }
        />
      </main>
    );
  }

  return (
    <main className={SHELL}>
      <ParentAcceptForm
        token={token}
        invite={{
          name: invite.name,
          relation: invite.relation,
          org: { name: invite.org.name },
          students: invite.students.map((s) => ({ name: s.student.name })),
        }}
      />
    </main>
  );
}
