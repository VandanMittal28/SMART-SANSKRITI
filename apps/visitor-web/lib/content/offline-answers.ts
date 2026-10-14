// Answers from the saved monument notes, used when Yatrik's live service is
// not configured or cannot be reached. Adapted from
// apk/ui/lib/offlineHeritage.ts. It only ever quotes the guide text in
// lib/content/monuments.ts; it never composes new facts. The notes are in
// English, so Hindi replies say so before quoting them.

import { findMonumentInText } from "./match.ts";
import { getMonument, type Monument } from "./monuments.ts";

export type YatrikLanguage = "en" | "hi";

const HERITAGE_WORDS =
  /\b(monument|heritage|temple|fort|palace|mahal|minar|minaret|mosque|tomb|mausoleum|cave|caves|museum|archaeolog\w*|architect\w*|dynasty|emperor|king|queen|built|build|builder|history|historic|legend|story|conservation|unesco|visit|who|when|why|what)\b|स्मारक|विरासत|मंदिर|किला|महल|इतिहास|किसने|कब|क्यों|क्या|निर्माण|कहानी/i;

function pickPassage(monument: Monument, question: string): string {
  const q = question.toLowerCase();
  if (/who|when|built|build|year|founded|commission|origin|किसने|कब|बना|निर्माण/.test(q)) return monument.origins;
  if (/british|colonial|later|history|happened|1857|ब्रिटिश|अंग्रेज़|इतिहास/.test(q)) return monument.laterHistory;
  if (/today|now|visit|visitor|famous|unesco|आज|अब|प्रसिद्ध/.test(q)) return monument.today;
  return `${monument.summary} ${monument.today}`;
}

export function offlineAnswer(question: string, monumentId: string | undefined, language: YatrikLanguage): string {
  const monument = getMonument(monumentId) ?? findMonumentInText(question);

  if (!monument) {
    if (!HERITAGE_WORDS.test(question)) {
      return language === "hi"
        ? "मैं केवल स्मारकों और विरासत स्थलों से जुड़े सवालों में मदद कर सकता हूँ।"
        : "I can only help with questions about monuments and heritage sites.";
    }
    return language === "hi"
      ? "ऑफ़लाइन जवाब देने के लिए मुझे स्मारक का नाम चाहिए। ऊपर से स्मारक चुनें या नाम लेकर पूछें, जैसे “लाल किला किसने बनवाया?”"
      : "To answer from my saved notes I need to know which monument you mean. Choose one above, or name it in your question, like “Who built the Red Fort?”";
  }

  const passage = pickPassage(monument, question);
  // "Name · notes" avoids inflecting the templated name (e.g. किला → किले).
  return language === "hi" ? `${monument.nameHi} · सहेजे गए नोट्स (अंग्रेज़ी में): ${passage}` : passage;
}
