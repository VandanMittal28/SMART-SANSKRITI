"use client";

import { useState } from "react";
import { IconSpeaker } from "@/components/icons";

// Narration recorded for the Sanskriti app (apk/ui/public/audio, mapped to
// monuments by apk/ui/components/recognition/listen-to-emperor.tsx). The
// spoken content hasn't been reviewed for this website, so it is presented as
// the app's narrated story, not as verified guide text.
export function AudioStory({ name, audio }: { name: string; audio: { en: string; hi: string } }) {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  return (
    <section id="audio-story" className="audio-story" aria-labelledby="audio-story-title">
      <div className="audio-story__head">
        <span className="audio-story__icon" aria-hidden="true">
          <IconSpeaker size={20} />
        </span>
        <div>
          <h2 id="audio-story-title">Listen to the story</h2>
          <p className="audio-story__note">A short narrated story of {name} from the Sanskriti app.</p>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="Narration language">
        <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
          English
        </button>
        <button type="button" aria-pressed={language === "hi"} onClick={() => setLanguage("hi")} lang="hi">
          हिन्दी
        </button>
      </div>
      <audio key={language} className="audio-story__player" controls preload="none" src={audio[language]}>
        Your browser can&apos;t play this recording.
      </audio>
    </section>
  );
}
