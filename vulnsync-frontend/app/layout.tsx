import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";

import localFont from "next/font/local";

export const inter = localFont({
  variable: "--font-sans",
  src: [
    { path: "/fonts/inter/Inter-Thin.woff2", weight: "100", style: "normal" },
    {
      path: "/fonts/inter/Inter-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    { path: "/fonts/inter/Inter-Light.woff2", weight: "300", style: "normal" },
    {
      path: "/fonts/inter/Inter-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    { path: "/fonts/inter/Inter-Medium.woff2", weight: "500", style: "normal" },
    {
      path: "/fonts/inter/Inter-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    { path: "/fonts/inter/Inter-Bold.woff2", weight: "700", style: "normal" },
    {
      path: "/fonts/inter/Inter-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    { path: "/fonts/inter/Inter-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "/fonts/geist/Geist-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "/fonts/geist/Geist-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
});

export const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    {
      path: "/fonts/geist-mono/GeistMono-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "/fonts/geist-mono/GeistMono-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "VulnSync - Синхронизация уязвимостей",
  description:
    "Сервис для ручной синхронизации уязвимостей между внешними системами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
      >
        <Header />
        <main className="container mx-auto py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
