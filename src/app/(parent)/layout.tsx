import { requireGuardian } from "@/lib/auth/session";

import { ParentHeader } from "./parent-header";
import { SwRegister } from "./sw-register";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireGuardian();

  return (
    <div className="bg-muted/40 min-h-screen">
      <ParentHeader
        name={me.guardian.name}
        email={me.email}
        childCount={me.students.length}
      />
      <SwRegister />
      {children}
    </div>
  );
}
