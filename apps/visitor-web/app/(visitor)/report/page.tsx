import type { Metadata } from "next";
import { ReportFlow } from "@/components/report/report-flow";

export const metadata: Metadata = { title: "Report an issue" };

export default function ReportPage() {
  return (
    <div className="container narrow">
      <ReportFlow />
    </div>
  );
}
