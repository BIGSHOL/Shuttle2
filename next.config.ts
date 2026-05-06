import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 안전교육 이수증 첨부(최대 5MB) + multipart 오버헤드 여유.
      bodySizeLimit: "6mb",
    },
  },
  // dev mode 좌하단 "N" 배지 끄기 — 메뉴얼 스크린샷에 노출되는 것 방지.
  // prod 배포에는 영향 없음 (dev 환경에서만 표시되던 indicator).
  devIndicators: false,
};

export default nextConfig;
