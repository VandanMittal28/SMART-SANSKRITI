import type { NextConfig } from "next";

// `next dev` and `next build` otherwise share `.next`. Running a build while
// the dev server is up left the dev server serving HTTP 500 and made the build
// fail intermittently with "Cannot find module for page". Giving the
// production build its own directory keeps the two independent, so the
// documented `npm run build:operations` check is safe to run at any time.
// Vercel expects the standard `.next` output directory when it packages a
// Next.js deployment. Local production builds keep a separate directory so a
// running development server is not disturbed.
const distDir = process.env.VERCEL ? ".next" : process.env.NODE_ENV === "production" ? ".next-build" : ".next";

const config: NextConfig = { poweredByHeader: false, devIndicators: false, distDir };
export default config;
