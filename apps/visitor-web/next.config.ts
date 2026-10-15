import type { NextConfig } from "next";

// This app is standalone and keeps its own lockfile. Pinning the tracing root
// stops Next from treating the repository root (which has another lockfile and
// an unrelated npm workspace) as this project's root. npm scripts always run
// with this package directory as the working directory.
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "https://appassets.androidplatform.net" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        { key: "Vary", value: "Origin" },
      ],
    }];
  },
};

export default config;
