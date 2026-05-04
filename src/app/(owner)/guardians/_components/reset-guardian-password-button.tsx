"use client";

import { ResetPasswordButton } from "@/app/(owner)/_components/reset-password-button";

import { resetGuardianPasswordAction } from "../actions";

export function ResetGuardianPasswordButton({
  guardianId,
  name,
}: {
  guardianId: string;
  name: string;
}) {
  return (
    <ResetPasswordButton
      name={name}
      onReset={() => resetGuardianPasswordAction(guardianId)}
    />
  );
}
