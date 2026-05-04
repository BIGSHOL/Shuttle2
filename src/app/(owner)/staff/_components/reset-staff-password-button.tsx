"use client";

import { ResetPasswordButton } from "@/app/(owner)/_components/reset-password-button";

import { resetStaffPasswordAction } from "../actions";

export function ResetStaffPasswordButton({
  staffId,
  name,
}: {
  staffId: string;
  name: string;
}) {
  return (
    <ResetPasswordButton
      name={name}
      onReset={() => resetStaffPasswordAction(staffId)}
    />
  );
}
