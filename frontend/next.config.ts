import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone) for lean Docker images.
  output: "standalone",
  // Proxy /api requests to the Go Gin backend during development.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8081"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
