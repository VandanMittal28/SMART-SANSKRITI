import type { ReactNode } from "react";
import { CapabilitiesProvider } from "@/components/capabilities";
import { AppShell } from "@/components/shell/app-shell";
import { VisitorGate } from "@/components/visitor/visitor-gate";
import { YatrikProvider } from "@/components/yatrik/yatrik-provider";

export default function VisitorLayout({ children }: { children: ReactNode }) {
  return (
    <VisitorGate>
      <CapabilitiesProvider>
        <YatrikProvider>
          <AppShell>{children}</AppShell>
        </YatrikProvider>
      </CapabilitiesProvider>
    </VisitorGate>
  );
}
