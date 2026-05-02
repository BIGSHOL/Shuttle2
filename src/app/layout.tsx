import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "셔틀이 — 학원·어린이집·유치원 셔틀버스 운영",
    template: "%s · 셔틀이",
  },
  description:
    "학원·교습소·어린이집·유치원 셔틀버스 운영을 위한 SaaS. 분기별 안전운행기록 자동 생성과 실시간 GPS 위치 추적.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
