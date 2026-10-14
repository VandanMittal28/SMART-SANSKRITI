import type { Metadata } from "next";
import { RecognizeFlow } from "@/components/recognize/recognize-flow";

export const metadata: Metadata = { title: "Recognise a monument" };

export default function RecognizePage() {
  return (
    <div className="container narrow">
      <RecognizeFlow />
    </div>
  );
}
