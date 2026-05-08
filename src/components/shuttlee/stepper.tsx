import { Check } from "lucide-react";

// W24-C P1 C3: 진행 단계 표시 — 가입·운행 플로우.
// 가로 배치, dot + label + 연결선. status: done(success) / current(bus glow) / pending(muted)

export type StepStatus = "done" | "current" | "pending";

export type Step = {
  label: string;
  status: StepStatus;
  description?: string;
};

export function Stepper({
  steps,
  className,
}: {
  steps: Step[];
  className?: string;
}) {
  if (steps.length === 0) return null;

  return (
    <ol className={`flex w-full items-start ${className ?? ""}`}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li
            key={`${step.label}-${idx}`}
            className={`flex flex-col items-center text-center ${
              isLast ? "" : "flex-1"
            } ${isLast ? "w-auto" : ""}`}
          >
            <div className="relative flex w-full items-center">
              {idx > 0 ? (
                <span
                  className={`absolute right-[calc(50%+18px)] left-0 top-3.5 h-0.5 ${
                    step.status === "pending"
                      ? "bg-border"
                      : "bg-success"
                  }`}
                />
              ) : null}
              <span
                className={`relative z-10 mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold ${
                  step.status === "done"
                    ? "bg-success border-success text-success-foreground"
                    : step.status === "current"
                      ? "bg-bus border-bus text-bus-foreground shadow-[0_0_0_3px_rgba(245,197,24,0.3)]"
                      : "bg-card border-border text-muted-foreground"
                }`}
                aria-current={step.status === "current" ? "step" : undefined}
              >
                {step.status === "done" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  idx + 1
                )}
              </span>
              {!isLast ? (
                <span
                  className={`absolute left-[calc(50%+18px)] right-0 top-3.5 h-0.5 ${
                    steps[idx + 1] && steps[idx + 1].status !== "pending"
                      ? "bg-success"
                      : "bg-border"
                  }`}
                />
              ) : null}
            </div>
            <p
              className={`mt-2 text-[11px] font-extrabold tracking-tight ${
                step.status === "current"
                  ? "text-foreground"
                  : step.status === "done"
                    ? "text-success"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </p>
            {step.description ? (
              <p className="text-muted-foreground mt-0.5 text-[10px] font-medium leading-tight">
                {step.description}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
