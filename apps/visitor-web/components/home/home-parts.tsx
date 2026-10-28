"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { aiUnavailableText, useCapabilities } from "@/components/capabilities";
import { IconArrowRight } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import { useVisitor } from "@/components/visitor/use-visitor";

export function Greeting() {
  const { visitor } = useVisitor();
  return (
    <header className="home-greeting">
      <p className="eyebrow">Namaste</p>
      <h1>{visitor ? `${visitor.displayName}, where shall we begin?` : "Where shall we begin?"}</h1>
    </header>
  );
}

// Only appears when something is switched off, and says what still works.
export function ServiceNote() {
  const { status, live, ai, reportsMode, reportsReachable } = useCapabilities();
  if (status !== "ready") return null;
  const items: string[] = [];
  if (live === false) items.push(`${aiUnavailableText(ai)} Recognition, Yatrik's AI answers and voice questions are off; Yatrik answers from the original app's offline guide, and the monument guide and audio stories work as normal.`);
  if (reportsMode === "unavailable") items.push("Reporting isn't available on the public website yet.");
  else if (reportsReachable === false) items.push("Reporting is temporarily unavailable. Your draft stays on this device.");
  if (items.length === 0) return null;
  return (
    <Notice title="Some features are unavailable">
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </Notice>
  );
}

export function DeviceFooter() {
  const { visitor, forget } = useVisitor();
  const router = useRouter();
  if (!visitor) return null;
  return (
    <footer className="home-device">
      <p>
        Visiting as <strong>{visitor.displayName}</strong>. This name is stored only in this browser; it isn&apos;t an account.
      </p>
      <div className="home-device__actions">
        <Link href="/" className="btn btn--quiet">
          Change name
        </Link>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => {
            forget();
            router.replace("/");
          }}
        >
          Forget me on this device
        </button>
      </div>
    </footer>
  );
}

export function PrimaryAction() {
  return (
    <Link href="/explore" className="home-primary on-dark">
      <span className="home-primary__text">
        <span className="home-primary__title">Explore with Sanskriti</span>
        <span className="home-primary__sub">Follow the map, discover historic zones, and hear their stories.</span>
      </span>
      <span className="home-primary__go" aria-hidden="true">
        <IconArrowRight size={22} />
      </span>
    </Link>
  );
}
