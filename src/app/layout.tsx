import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "체험단 리뷰 작성기",
  description: "AI 멀티 에이전트가 체험단 블로그 리뷰를 작성해드립니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
