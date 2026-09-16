import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Показывает побочные эффекты (двойной вызов рендеров) в dev-режиме
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
