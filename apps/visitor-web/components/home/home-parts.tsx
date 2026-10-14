"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCapabilities } from "@/components/capabilities";
import { IconArrowRight } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import { useVisitor } from "@/components/visitor/use-visitor";
import { YatrikAvatar } from "@/components/yatrik/yatrik-avatar";
import { useYatrik } from "@/components/yatrik/yatrik-provider";

export function Greeting() {
  const { visitor } = useVisitor();
  return (
    <header className="home-greeting">
      <p className="eyebrow">Namaste</p>
      <h1>{visitor ? `${visitor.displayName}, where shall we begin?` : "Where shall we begin?"}</h1>
    </header>
  );
}

export function YatrikTile() {
  const yatrik = useYatrik();
  return (
    <button type="button" className="home-tile home-tile--yatrik" aria-haspopup="dialog" onClick={(event) => yatrik.open({ opener: event.currentTarget })}>
      <YatrikAvatar size={48} />
      <span className="home-tile__title">Ask Yatrik</span>
      <span className="home-tile__text">Questions about any monument, in English or Hindi</span>
    </button>
  );
}

// Only appears when something is switched off, and says what still works.
export function ServiceNote() {
  const { status, live, reportsReachable } = useCapabilities();
  if (status !== "ready") return null;
  const items: string[] = [];
  if (live === false) items.push("Live recognition, Yatrik's AI answers and voice questions aren't switched on yet. Yatrik answers from saved notes, and the monument guide and audio stories work as normal.");
  if (reportsReachable === false) items.push("Reporting uses a local operations demo that isn't running on this computer right now.");
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
    <Link href="/recognize" className="home-primary on-dark">
      <span className="home-primary__text">
        <span className="home-primary__title">Recognise a monument</span>
        <span className="home-primary__sub">Take a photo or choose one from your gallery, and learn what you&apos;re looking at.</span>
      </span>
      <span className="home-primary__go" aria-hidden="true">
        <IconArrowRight size={22} />
      </span>
    </Link>
  );
}
