import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getGuardianInviteByToken } from "@/app/(owner)/guardians/actions";

import { ParentAcceptForm } from "./accept-form";

export default async function ParentInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getGuardianInviteByToken(token);

  const main = "flex min-h-screen items-center justify-center bg-muted/40 p-4";

  if (!invite) {
    return (
      <main className={main}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>유효하지 않은 초대 링크</CardTitle>
            <CardDescription>
              링크가 잘못되었거나 만료되었습니다. 학원장·원장님께 다시 발급해
              달라고 요청하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (invite.acceptedAt) {
    return (
      <main className={main}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>이미 사용된 초대</CardTitle>
            <CardDescription>
              이 링크는 이미 가입에 사용되었습니다. 로그인 페이지에서 본인
              계정으로 로그인하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <main className={main}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>만료된 초대</CardTitle>
            <CardDescription>
              초대 링크의 유효기간(7일)이 지났습니다. 학원장·원장님께 새 초대를
              요청하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className={main}>
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
