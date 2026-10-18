"use client";

// The parts of apk/ui/lib/languageContext.tsx used by the ported Recognition,
// Report and Yatrik screens: the same storage key, the same t() lookup and the
// entries those screens use (English and Hindi, copied unchanged).
//
// Differences, because the website has neither piece:
// - The original's language picker lives on its Profile screen, which is not
//   part of this website, so the language is read from the same storage key
//   and is otherwise English (the original's default).
// - translate() used the original app's translation service (/api/translate),
//   which this website does not have. It rejects, and every original caller
//   already falls back to the English text when translation fails.

import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, isSupportedLanguage, type SupportedLanguage } from "./languages";

export type Lang = SupportedLanguage;

export const TRANSLATIONS: Record<string, { en: string; hi?: string }> = {
  take_quiz: { en: 'Take Quiz', hi: 'क्विज़ लें' },
  monument_recognition: { en: 'Monument Recognition', hi: 'स्मारक पहचान' },
  upload_photo: { en: '📂 Upload Photo', hi: '📂 फ़ोटो अपलोड' },
  use_camera: { en: '📷 Use Camera', hi: '📷 कैमरा उपयोग' },
  identifying: { en: '🔍 Identifying monument with AI Vision...', hi: '🔍 AI विज़न से स्मारक पहचाना जा रहा है...' },
  not_identified: { en: '❓ Monument Not Identified', hi: '❓ स्मारक पहचाना नहीं गया' },
  try_clearer: { en: 'Try uploading a clearer image or different angle', hi: 'स्पष्ट छवि या अलग कोण से प्रयास करें' },
  listen_emperor: { en: '🎙️ Listen to Emperor', hi: '🎙️ सम्राट को सुनें' },
  historical_narration: { en: 'Historical narration for', hi: 'ऐतिहासिक वर्णन' },
  ai_chatbot: { en: 'Yatrik', hi: 'यात्रिक' },
  ask_placeholder: { en: 'Ask about a monument or heritage site...', hi: 'किसी स्मारक या विरासत स्थल के बारे में पूछें...' },
  send: { en: 'Send', hi: 'भेजें' }, ask_by_voice: { en: 'Voice', hi: 'आवाज़' },
  listening: { en: 'Listening...', hi: 'सुन रहे हैं...' },
  speaking: { en: 'Speaking...', hi: 'बोल रहे हैं...' },
  heritage_guide: { en: 'Yatrik', hi: 'यात्रिक' },
  student_mode: { en: 'Student Mode', hi: 'छात्र मोड' },
  namaste_greeting: { en: "Namaste! I am Yatrik. I answer only monument and heritage-related questions. Ask me about their history, architecture, legends, or visitor information!", hi: 'नमस्ते! मैं यात्रिक हूँ। मैं केवल स्मारक और विरासत से जुड़े सवालों के जवाब देता हूँ। इनके इतिहास, वास्तुकला, किंवदंतियों या यात्रा जानकारी के बारे में पूछें!' },
  when_built: { en: 'When was it built?', hi: 'यह कब बना था?' }, who_built: { en: 'Who built it?', hi: 'इसे किसने बनाया?' },
  what_legend: { en: 'What is the legend?', hi: 'इसकी किंवदंती क्या है?' }, best_time_visit: { en: 'Best time to visit?', hi: 'दर्शन का सर्वोत्तम समय?' },
  entry_fee_q: { en: 'Entry fee?', hi: 'प्रवेश शुल्क?' },
  treasure_hunt: { en: '🗺️ Treasure Hunt', hi: '🗺️ खजाना खोज' },
  try_again: { en: 'Try Again', hi: 'दोबारा प्रयास करें' },
  mode_title: { en: 'Mode', hi: 'मोड' },
}

const LANGUAGE_STORAGE_KEY = 'sanskriti-language-v1'

export function useLang() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANGUAGE)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (isSupportedLanguage(saved)) setLang(saved)
    } catch {
      // English remains when storage is blocked.
    }
  }, [])

  const t = (key: string): string => {
    const entry = TRANSLATIONS[key]
    if (!entry) return key
    if (lang === 'en') return entry.en || key
    if (lang === 'hi' && entry.hi) return entry.hi
    return entry.en || key
  }

  const translate = async (text: string): Promise<string> => {
    void text
    throw new Error('Translation is not available on this website.')
  }

  return { lang, t, translate }
}
