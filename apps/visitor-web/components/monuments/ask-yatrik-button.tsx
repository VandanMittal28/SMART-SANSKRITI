"use client";

import { IconChat } from "@/components/icons";
import { useYatrik } from "@/components/yatrik/yatrik-provider";
import type { MonumentId } from "@/lib/content/monuments";

export function AskYatrikButton({
  monumentId,
  label = "Ask Yatrik",
  draft,
  className = "btn btn--primary",
}: {
  monumentId?: MonumentId | null;
  label?: string;
  draft?: string;
  className?: string;
}) {
  const yatrik = useYatrik();
  return (
    <button type="button" className={className} aria-haspopup="dialog" onClick={(event) => yatrik.open({ monumentId: monumentId ?? null, draft, opener: event.currentTarget })}>
      <IconChat size={20} />
      {label}
    </button>
  );
}
