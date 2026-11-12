
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ==========================================
// CampusFix 字型設定
// ==========================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ==========================================
// CampusFix 網站資訊
// ==========================================

export const metadata: Metadata = {
  title: {
    default: "CampusFix | 校園問題通報系統",
    template: "%s | CampusFix",
  },

  description:
    "CampusFix 校園問題通報與管理系統，提供學生問題通報、案件查詢、進度追蹤及工作人員處理管理功能。",

  applicationName: "CampusFix",

  keywords: [
    "CampusFix",
    "校園問題通報",
    "校園管理",
    "問題追蹤",
    "Software Engineering",
  ],

  openGraph: {
    title: "CampusFix | 校園問題通報系統",
    description:
      "讓校園問題，更快被解決。提供問題通報、進度追蹤及工作人員管理功能。",
    siteName: "CampusFix",
    locale: "zh_TW",
    type: "website",
  },
};

// ==========================================
// Root Layout
// ==========================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
