import { requireHelper } from "@/lib/auth/session";

import { DriverHeader } from "@/app/(driver)/driver-header";

export default async function HelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireHelper();

  return (
    <div className="bg-muted/40 min-h-screen">
      <DriverHeader
        orgName={user.org.name}
        role="HELPER"
        email={user.email}
        staffName={user.staff.name}
      />
      {children}
    </div>
  );
}
