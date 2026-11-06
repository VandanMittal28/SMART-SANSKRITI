// Server-only Groq transport. Never import from a client component.
export class GroqError extends Error {
  status: number;
  constructor(status: number) { super(`AI service returned HTTP ${status}.`); this.status = status; }
}

export function isTextRequest(body: Record<string, unknown>): boolean {
  const messages = body.messages as Array<{ content?: unknown }> | undefined;
  return !!messages?.length && messages.every(({ content }) =>
    typeof content === 'string' || (Array.isArray(content) && content.every(part => part?.type === 'text')));
}

export async function requestGroq(body: Record<string, unknown>) {
  // Explicit allowlist: NVIDIA-specific thinking/top_k options are unsupported.
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY?.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages: body.messages, temperature: body.temperature,
      max_completion_tokens: Math.max(2048, Number(body.max_tokens) || 2048),
      reasoning_effort: 'low', stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new GroqError(response.status);
  return response.json();
}

export async function transcribeGroq(audioBase64: string, language: string): Promise<string> {
  const form = new FormData();
  form.set('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: 'audio/wav' }), 'recording.wav');
  form.set('model', process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3-turbo');
  form.set('language', language);
  form.set('response_format', 'json');
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY?.trim()}` },
    body: form, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new GroqError(response.status);
  const data = await response.json() as { text?: unknown };
  if (typeof data.text !== 'string' || !data.text.trim()) throw new GroqError(502);
  return data.text.trim();
}
