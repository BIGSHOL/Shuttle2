import { headers } from "next/headers";

import { InviteForm } from "./invite-form";

export default async function InvitePage() {
  // 초대 URL을 만들 때 쓸 origin을 서버에서 결정 (production/preview/dev 모두 자동 반영).
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <InviteForm origin={origin} />
    </main>
  );
}
