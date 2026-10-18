import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconCamera } from "@/components/icons";
import { MonumentBrowser } from "@/components/monuments/monument-browser";

export const metadata: Metadata = { title: "Monuments" };

export default function MonumentsPage() {
  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Explore</p>
        <h1>Monuments</h1>
        <p className="page-head__lede">Stories of the heritage sites in Sanskriti&apos;s guide.</p>
      </header>
      {/* The original app's "Scan a monument" card, as on its home screen. */}
      <Link href="/recognize" className="scan-card on-dark">
        <span className="scan-card__icon" aria-hidden="true">
          <IconCamera size={20} />
        </span>
        <span className="scan-card__text">
          <span className="scan-card__title">Scan a monument</span>
          <span className="scan-card__sub">Point your camera or upload a photo</span>
        </span>
        <span className="scan-card__go" aria-hidden="true">
          <IconArrowRight size={20} />
        </span>
      </Link>
      <MonumentBrowser />
    </div>
  );
}
