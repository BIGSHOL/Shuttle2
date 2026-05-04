"use client";

import { useState } from "react";

import { getCertificateSignedUrlAction } from "../actions";

// 이수증 파일 (Supabase Storage object) 보기 버튼.
// 클릭 시 server action으로 1시간 signed URL 발급 → 새 탭에서 열기.
// SSR 시 미리 발급하지 않음 (만료·권한 변경 즉시 반영 + 불필요한 Storage 호출 방지).
export function CertificateViewButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await getCertificateSignedUrlAction(recordId);
    setLoading(false);
    if ("url" in res) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setError(res.error);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="text-primary text-xs font-medium hover:underline disabled:opacity-60"
      >
        {loading ? "여는 중..." : "이수증 보기"}
      </button>
      {error ? (
        <span className="text-destructive text-[10px]">{error}</span>
      ) : null}
    </span>
  );
}
