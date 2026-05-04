import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Pretendard — 1순위. 디자인 토큰 (docs/01) 명세.
// public/fonts/Pretendard-{Regular,Bold}.woff2를 사용 (postinstall 시
// node_modules/pretendard에서 복사하거나 수동 복사).
const pretendard = localFont({
  src: [
    {
      path: "../../public/fonts/Pretendard-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Pretendard-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["Noto Sans KR", "system-ui", "-apple-system", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "셔틀이 — 학원·어린이집·유치원 셔틀버스 운영",
    template: "%s · 셔틀이",
  },
  description:
    "학원·교습소·어린이집·유치원 셔틀버스 운영 서비스. 분기별 안전운행기록 자동 생성과 실시간 GPS 위치 추적.",
  applicationName: "셔틀이",
  keywords: [
    "셔틀버스",
    "어린이통학버스",
    "안전운행기록",
    "GPS 추적",
    "학원",
    "어린이집",
    "유치원",
  ],
  authors: [{ name: "셔틀이" }],
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "셔틀이",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
