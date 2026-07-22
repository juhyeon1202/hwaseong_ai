import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "화성 교통일지",
    template: "%s | 화성 교통일지",
  },
  description:
    "화성시 대중교통 이용 경험을 기록하고 개선하는 시민 참여 웹앱",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}