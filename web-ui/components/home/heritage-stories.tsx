"use client"

import Link from "next/link"
import { Volume2 } from "lucide-react"

const STORIES = [
  {
    title: "Taj Mahal",
    monumentId: "taj-mahal",
    story:
      "At sunrise, the marble of the Taj Mahal blushes pink, as if the monument still remembers love. Shah Jahan raised it for Mumtaz, turning grief into symmetry and light. Every carved flower speaks in stone, every arch mirrors the sky. The Yamuna beside it carries centuries of whispers. Here, love is not told as a legend, it is built as a horizon.",
  },
  {
    title: "Red Fort",
    monumentId: "red-fort",
    story:
      "The Red Fort rises like a memory of power, its walls once guarding the heart of the Mughal empire. Royal courts echoed here with strategy, ambition, and ceremony. Centuries later, those same ramparts became a stage for freedom. India's Independence Day address still lifts from this fort each year. It is a place where authority transformed into hope.",
  },
  {
    title: "Qutub Minar",
    monumentId: "qutub-minar",
    story:
      "Qutub Minar climbs into the Delhi sky as a tower of victory and layered identity. Its bands of calligraphy and stonework reveal Indo-Islamic artistry in motion. Around it, older pillars and later additions create a dialogue across dynasties. No single era owns this complex. It stands as a timeline you can walk through, step by step.",
  },
]

function speakStory(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "en-US"
  utterance.rate = 0.92
  window.speechSynthesis.speak(utterance)
}

export function HeritageStories() {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8C7B63]">Heritage stories</p>
          <h2 className="text-lg font-semibold text-[#F6E8D6]">Read. Listen. Explore.</h2>
        </div>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STORIES.map((story) => (
          <article
            key={story.monumentId}
            className="snap-start min-w-[300px] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <h3 className="text-lg font-semibold text-[#F6E8D6]">{story.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#C7B08B]">{story.story}</p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => speakStory(story.story)}
                className="inline-flex items-center gap-2 rounded-full border border-[#4B9B8E]/40 bg-[#4B9B8E]/15 px-3 py-2 text-xs font-semibold text-[#7EE4D4]"
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>
              <Link
                href={`/monument/${story.monumentId}`}
                className="inline-flex items-center rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/14 px-3 py-2 text-xs font-semibold text-[#F7D88C]"
              >
                Explore
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
