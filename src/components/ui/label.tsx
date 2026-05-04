"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// required prop: 필수 입력 필드면 라벨 옆에 빨간 * 표시.
// 시각 보조용 — 실제 form validation은 input의 required 속성이나 zod schema가 담당.
function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean;
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export { Label };
