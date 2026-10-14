import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "@/components/icons";

type Tone = "info" | "warn" | "error" | "success";

export function Notice({ tone = "info", title, children, role }: { tone?: Tone; title?: ReactNode; children?: ReactNode; role?: "status" | "alert" }) {
  const Icon = tone === "success" ? IconCheck : tone === "info" ? IconInfo : IconAlert;
  return (
    <div className={`notice${tone === "info" ? "" : ` notice--${tone}`}`} role={role}>
      <Icon size={18} />
      <div className="notice__body">
        {title && <p className="notice__title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
