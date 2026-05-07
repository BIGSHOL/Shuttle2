"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// 운행 전 확인사항 collapsible 카드.
// native <details>는 iOS PWA standalone mode에서 펼침/접힘 시 box width가
// 다르게 측정되는 환경 의존성이 있어, useState 기반 controlled로 전환해
// 일반 block element(div + button) layout으로 일관성 보장.
export function RunChecklistCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card w-full rounded-lg border px-4 py-3 text-sm shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-foreground flex w-full items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>운행 전 확인사항</span>
      </button>
      {open ? (
        <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-4 text-xs font-medium">
          <li>
            <strong className="text-foreground">거치대 + 충전기</strong>를
            차량에 고정하세요. 운행 중 폰을 만지면 위험합니다.
          </li>
          <li>
            폰은{" "}
            <strong className="text-foreground">안드로이드 권장</strong> — iOS
            Safari는 백그라운드 GPS·화면 잠금 방지가 약해 셔틀 위치가 끊길 수
            있습니다.
          </li>
          <li>
            iOS를 쓴다면{" "}
            <strong className="text-foreground">
              운행 화면을 항상 켠 상태
            </strong>
            로 두세요 (자동 화면 잠금이 GPS를 멈춥니다).
          </li>
          <li>
            처음 진입 시 브라우저가 묻는{" "}
            <strong className="text-foreground">
              위치 권한·알림 권한을 허용
            </strong>
            해 주세요.
          </li>
          <li>
            어린이용 모드 차량은{" "}
            <strong className="text-foreground">동승보호자</strong>가 함께 타야
            합니다 (어린이통학버스 법령 의무).
          </li>
        </ul>
      ) : null}
    </div>
  );
}
