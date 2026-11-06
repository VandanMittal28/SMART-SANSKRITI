// Server-only Google vision transport. Never expose GEMINI_API_KEY to clients.
export class GeminiError extends Error {
  status: number;
  constructor(status: number) { super(`Vision service returned HTTP ${status}.`); this.status = status; }
}

type Part = { type: string; text?: string; image_url?: { url: string } };
type Message = { role: string; content: string | Part[] };

export function isImageRequest(body: Record<string, unknown>): boolean {
  const messages = body.messages as Message[] | undefined;
  return !!messages?.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
}

export async function requestGeminiVision(body: Record<string, unknown>) {
  const messages = body.messages as Message[];
  const contents = messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: typeof message.content === 'string' ? [{ text: message.content }] : message.content.map(part => {
      if (part.type === 'text') return { text: part.text || '' };
      // Only inline images are accepted: never fetch caller-supplied URLs.
      const match = part.image_url?.url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new GeminiError(400);
      return { inlineData: { mimeType: match[1], data: match[2] } };
    }),
  }));
  const model = process.env.GEMINI_VISION_MODEL || 'gemini-3.1-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY?.trim() || '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: {
      temperature: body.temperature ?? 0.1,
      maxOutputTokens: Math.max(2048, Number(body.max_tokens) || 2048),
      responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' },
    } }),
    signal: AbortSignal.timeout(45_000),
  });
  // No provider fallback: quota exhaustion must never trigger paid inference.
  if (!response.ok) throw new GeminiError(response.status);
  const data = await response.json() as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim();
  if (candidate?.finishReason !== 'STOP' || !content) throw new GeminiError(502);
  return { choices: [{ message: { content } }] };
}
