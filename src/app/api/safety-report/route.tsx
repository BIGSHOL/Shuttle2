import { renderToBuffer } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";

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

  const data = await getSafetyReportData(orgId, year, quarter);

  const buffer = await renderToBuffer(<SafetyReportPdf data={data} />);

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
}
