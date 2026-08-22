import type { NextConfig } from "next";

const isMobileBundle = process.env.SANSKRITI_MOBILE_BUNDLE === "1";

const nextConfig: NextConfig = {
  ...(isMobileBundle
    ? {
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: isMobileBundle,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60_000,
    pagesBufferLength: 2,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
