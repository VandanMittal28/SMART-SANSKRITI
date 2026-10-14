"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCapabilities } from "@/components/capabilities";
import { ApiError, askYatrik } from "@/lib/api";
import { isMonumentId, type MonumentId } from "@/lib/content/monuments";
import { offlineAnswer, type YatrikLanguage } from "@/lib/content/offline-answers";

/** live: from the AI service; notes: saved guide text (service not configured);
 * notes-offline: saved text because the service couldn't be reached; system: a notice. */
export type MessageSource = "live" | "notes" | "notes-offline" | "system";

export type YatrikMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  language: YatrikLanguage;
  source?: MessageSource;
};

/** opener: the control that opened the panel. Passed explicitly because Safari
 * doesn't focus buttons on click, so document.activeElement isn't reliable. */
type OpenOptions = { monumentId?: MonumentId | null; draft?: string; opener?: HTMLElement | null };

type YatrikValue = {
  isOpen: boolean;
  open: (options?: OpenOptions) => void;
  close: () => void;
  messages: YatrikMessage[];
  sending: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
  language: YatrikLanguage;
  setLanguage: (language: YatrikLanguage) => void;
  monumentId: MonumentId | null;
  setMonumentId: (id: MonumentId | null) => void;
  draft: string;
  setDraft: (draft: string) => void;
  readAloud: boolean;
  setReadAloud: (on: boolean) => void;
  /** The element focus returns to when the panel closes. */
  openerRef: React.MutableRefObject<HTMLElement | null>;
};

const YatrikContext = createContext<YatrikValue | null>(null);
const STORAGE_KEY = "sanskriti-yatrik-v1";
const MAX_MESSAGES = 40;

const newId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

type Saved = { messages: YatrikMessage[]; language: YatrikLanguage; monumentId: MonumentId | null; readAloud: boolean };

function load(): Partial<Saved> {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.filter((m) => m && typeof m.text === "string" && (m.role === "user" || m.role === "assistant")).slice(-MAX_MESSAGES) : [],
      language: parsed.language === "hi" ? "hi" : "en",
      monumentId: isMonumentId(parsed.monumentId) ? parsed.monumentId : null,
      readAloud: parsed.readAloud === true,
    };
  } catch {
    return {};
  }
}

export function YatrikProvider({ children }: { children: ReactNode }) {
  const capabilities = useCapabilities();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<YatrikMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState<YatrikLanguage>("en");
  const [monumentId, setMonumentId] = useState<MonumentId | null>(null);
  const [draft, setDraft] = useState("");
  const [readAloud, setReadAloud] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The conversation lasts for this browser tab only (sessionStorage).
  useEffect(() => {
    const saved = load();
    if (saved.messages) setMessages(saved.messages);
    if (saved.language) setLanguage(saved.language);
    if (saved.monumentId !== undefined) setMonumentId(saved.monumentId);
    if (saved.readAloud !== undefined) setReadAloud(saved.readAloud);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-MAX_MESSAGES), language, monumentId, readAloud }));
    } catch {
      // Storage full or blocked: the conversation still works for this page.
    }
  }, [loaded, messages, language, monumentId, readAloud]);

  const open = useCallback((options?: OpenOptions) => {
    openerRef.current = options?.opener ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
    if (options?.monumentId !== undefined) setMonumentId(options.monumentId);
    if (options?.draft !== undefined) setDraft(options.draft);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Return focus to the opener once the panel has unmounted (runs after commit).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) openerRef.current?.focus({ preventScroll: false });
    wasOpen.current = isOpen;
  }, [isOpen]);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || sending) return;
      const userMessage: YatrikMessage = { id: newId(), role: "user", text: question, language };
      setMessages((current) => [...current, userMessage].slice(-MAX_MESSAGES));
      setDraft("");

      const reply = (text: string, source: MessageSource) =>
        setMessages((current) => [...current, { id: newId(), role: "assistant" as const, text, language, source }].slice(-MAX_MESSAGES));
      const notes = () => offlineAnswer(question, monumentId ?? undefined, language);

      if (capabilities.live === false) {
        reply(notes(), "notes");
        return;
      }
      setSending(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const { answer } = await askYatrik({ question, monumentId: monumentId ?? undefined, language }, controller.signal);
        reply(answer, "live");
      } catch (error) {
        if (error instanceof ApiError && error.code === "aborted") return;
        if (error instanceof ApiError && error.code === "not_configured") {
          capabilities.markLiveUnavailable();
          reply(notes(), "notes");
        } else if (error instanceof ApiError && error.code === "invalid") {
          reply(error.message, "system");
        } else {
          reply(notes(), "notes-offline");
        }
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [capabilities, language, monumentId, sending],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setDraft("");
  }, []);

  const value = useMemo<YatrikValue>(
    () => ({ isOpen, open, close, messages, sending, send, clear, language, setLanguage, monumentId, setMonumentId, draft, setDraft, readAloud, setReadAloud, openerRef }),
    [isOpen, open, close, messages, sending, send, clear, language, monumentId, draft, readAloud],
  );
  return <YatrikContext.Provider value={value}>{children}</YatrikContext.Provider>;
}

export function useYatrik(): YatrikValue {
  const value = useContext(YatrikContext);
  if (!value) throw new Error("useYatrik must be used inside YatrikProvider");
  return value;
}
