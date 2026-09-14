import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Android build excludes server routes and needs a static export. During
  // browser development we keep the Next.js server so private API-backed
  // translation routes remain available without exposing credentials.
  ...(process.env.SANSKRITI_MOBILE_BUNDLE === "1" ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
