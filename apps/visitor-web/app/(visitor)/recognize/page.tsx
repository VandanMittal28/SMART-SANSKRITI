import type { Metadata } from "next";
import { OriginalScreen } from "@/components/original/original-screen";
import { RecognitionScreen } from "@/components/original/recognition/recognition-screen";

export const metadata: Metadata = { title: "Monument Recognition" };

// Reached from Explore (and the home screen's "Scan a monument" card); there
// is no separate navigation tab for it.
export default function RecognizePage() {
  return (
    <OriginalScreen>
      <RecognitionScreen />
    </OriginalScreen>
  );
}
