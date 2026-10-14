import type { Metadata } from "next";
import { MonumentBrowser } from "@/components/monuments/monument-browser";

export const metadata: Metadata = { title: "Monuments" };

export default function MonumentsPage() {
  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Monument guide</p>
        <h1>Monuments</h1>
        <p className="page-head__lede">Stories of the heritage sites in Sanskriti&apos;s guide.</p>
      </header>
      <MonumentBrowser />
    </div>
  );
}
