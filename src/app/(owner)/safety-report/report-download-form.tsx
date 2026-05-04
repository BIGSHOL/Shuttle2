"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <Select
          value={String(selected)}
          onValueChange={(v) => setSelected(Number(v))}
        >
          <SelectTrigger id="quarter">
            <SelectValue placeholder="분기 선택" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o, i) => (
              <SelectItem
                key={`${o.value.year}-${o.value.quarter}`}
                value={String(i)}
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
