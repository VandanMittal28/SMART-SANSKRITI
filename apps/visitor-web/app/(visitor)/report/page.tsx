import type { Metadata } from "next";
import { OriginalScreen } from "@/components/original/original-screen";
import { ReportScreen } from "@/components/original/report/report-screen";

export const metadata: Metadata = { title: "Report an issue" };

export default function ReportPage() {
  return (
    <OriginalScreen appShell={false}>
      <ReportScreen />
    </OriginalScreen>
  );
}
