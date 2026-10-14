"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useVisitor } from "./use-visitor";

// Sends visitors who haven't entered a name back to the welcome screen.
// A navigation convenience only, NOT access control: the name lives in
// localStorage and anyone can set it. Never rely on it to protect anything.
export function VisitorGate({ children }: { children: ReactNode }) {
  const { status } = useVisitor();
  const router = useRouter();

  useEffect(() => {
    if (status === "absent") router.replace("/");
  }, [status, router]);

  if (status !== "present") {
    return (
      <div className="gate-loading" role="status">
        <span className="visually-hidden">Loading your visit…</span>
      </div>
    );
  }
  return <>{children}</>;
}
