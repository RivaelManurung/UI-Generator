import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "DashboardCraft — Schema-first dashboard generator",
    template: "%s · DashboardCraft",
  },
  description:
    "Generate production-grade dashboard pages from prompts. Schema-first generation, strict validation, sandboxed preview, and versioned code output.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${geistMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
