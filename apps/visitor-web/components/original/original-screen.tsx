import type { ReactNode } from "react";

// Hosts a screen ported from the original app inside this website's shell,
// with its dark styling (styles/original.css applies only inside
// .sanskriti-original). Screens that used the original AppShell sit in its
// centred 420px column; the report screen had no AppShell and lays itself out.
export function OriginalScreen({ children, appShell = true }: { children: ReactNode; appShell?: boolean }) {
  return (
    <div className="sanskriti-original sanskriti-original--page">
      {appShell ? <div className="mx-auto w-full max-w-[420px]">{children}</div> : children}
    </div>
  );
}
