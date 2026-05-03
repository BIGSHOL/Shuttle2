"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Quarter } from "@/lib/pdf/quarter";

type Option = {
  value: { year: number; quarter: Quarter };
  label: string;
};

export function ReportDownloadForm({ options }: { options: Option[] }) {
  const [selected, setSelected] = useState(0); // 첫 번째(최근 분기) default

  const opt = options[selected];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="quarter" className="text-sm font-medium">
          분기
        </label>
        <select
          id="quarter"
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
        >
          {options.map((o, i) => (
            <option key={`${o.value.year}-${o.value.quarter}`} value={i}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Button asChild className="w-full">
        <a
          href={`/api/safety-report?year=${opt.value.year}&quarter=${opt.value.quarter}`}
          download
          rel="nofollow"
        >
          PDF 다운로드
        </a>
      </Button>
      <p className="text-muted-foreground text-xs">
        선택한 분기의 운행·안전점검 기록을 차량별로 정리한 PDF가 다운로드돼요.
      </p>
    </div>
  );
}
