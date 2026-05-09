import { type DocumentProps, renderToBuffer } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { createElement, type ReactElement } from "react";

import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  currentKstQuarter,
  isQuarter,
  quarterLabel,
  type Quarter,
} from "@/lib/pdf/quarter";
import { getSafetyReportData } from "@/lib/pdf/safety-report-data";
import { SafetyReportPdf } from "@/lib/pdf/safety-report";

// 분기 안전운행기록 PDF 다운로드.
// 쿼리: ?year=2026&quarter=2  → KST 기준 2026년 2분기 PDF stream.
// quarter 미지정 시 KST 현재 분기. year 미지정 시 KST 현재 연도.
//
// react-pdf는 Node 런타임 필요 (edge X). dynamic export로 항상 server 측 실행.
// route.ts (not .tsx) — Next.js App Router route handler는 .ts 권장.
// JSX 대신 createElement(SafetyReportPdf, { data }) 사용.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 권한 체크 — OWNER만. requireOwner가 throw 시 Next.js 500 페이지로 처리됨.
  const me = await requireOwner();
  const orgId = await getOrgId();

  const sp = req.nextUrl.searchParams;
  const fallback = currentKstQuarter();

  const yearRaw = Number(sp.get("year"));
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 2024 && yearRaw <= 2099
      ? yearRaw
      : fallback.year;

  const qRaw = Number(sp.get("quarter"));
  const quarter: Quarter = isQuarter(qRaw) ? qRaw : fallback.quarter;

  try {
    const data = await getSafetyReportData(orgId, year, quarter);

    // SafetyReportPdf는 @react-pdf/renderer Document를 반환. createElement
    // 결과를 DocumentProps element로 cast해서 renderToBuffer 시그니처에 맞춤.
    const element = createElement(SafetyReportPdf, {
      data,
    }) as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    const filename = `safety-report-${me.org.name}-${quarterLabel(year, quarter)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // attachment + RFC 5987 UTF-8 filename* — 한글 파일명 안전 인코딩
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[safety-report] PDF render failed", err);
    return NextResponse.json(
      {
        error: "PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
