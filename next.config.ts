import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 안전교육 이수증 첨부(최대 5MB) + multipart 오버헤드 여유.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
