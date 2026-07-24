This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## NVIDIA NIM setup

The AI chat uses NVIDIA NIM through a server-side Next.js route, so the API key
is never exposed to the browser.

1. Copy `.env.example` to `.env.local`.
2. Add your NVIDIA API key as `NVIDIA_API_KEY`.
3. Keep `NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b` for the fast free
   endpoint.

The app uses `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` for monument
image recognition and speech transcription. Kimi K2.6 can be selected by
setting `NVIDIA_VISION_MODEL=moonshotai/kimi-k2.6` after enabling that model
for the NVIDIA account.

`.env.local` is ignored by Git. Add the same variables to your hosting provider
when deploying.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

<!-- Trigger Vercel Deployment 2026-04-07 11:53:37 -->

<!-- Vercel re-trigger 2026-04-07 12:45:50 -->
