"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconInfo } from "@/components/icons";
import { NAME_MAX_LENGTH } from "@/lib/visitor";
import { useVisitor } from "./use-visitor";

export function WelcomeForm() {
  const router = useRouter();
  const { status, visitor, save } = useVisitor();
  const [editing, setEditing] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (status === "present" && visitor && !editing && !continuing) {
    return (
      <div className="returning">
        <p className="eyebrow">Welcome back</p>
        <p className="returning__name">{visitor.displayName}</p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => {
            setContinuing(true);
            router.push("/home");
          }}
        >
          Continue <IconArrowRight />
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => {
            setValue(visitor.displayName);
            setError(null);
            setEditing(true);
          }}
        >
          Use a different name
        </button>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = save(value);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setContinuing(true);
    router.push("/home");
  }

  return (
    <form className="welcome__form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-name`}>
          What should we call you?
        </label>
        <p className="field__hint" id={`${id}-hint`}>
          A first name or nickname is enough.
        </p>
        <input
          ref={inputRef}
          id={`${id}-name`}
          name="displayName"
          className="input"
          type="text"
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={NAME_MAX_LENGTH * 2}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
          disabled={continuing}
        />
        {error && (
          <p className="field__error" id={`${id}-error`} role="alert">
            <IconInfo size={18} />
            {error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn--primary btn--block" disabled={continuing}>
        {continuing ? "Opening…" : "Continue"}
        {!continuing && <IconArrowRight />}
      </button>
    </form>
  );
}
