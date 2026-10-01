import type { Assessment } from './demo.ts';

type Result = { value: Assessment; reason: string };
type Input = { category: string; note: string; photo: Buffer | null; mime: string };
type Options = { apiKey?: string; model?: string; fetcher?: typeof fetch };

const unavailable = (reason: string): Result => ({ value: 'unavailable', reason });

export async function assessWithNvidia(input: Input, options: Options = {}): Promise<Result> {
  const apiKey = options.apiKey ?? process.env.NVIDIA_API_KEY;
  if (!apiKey) return unavailable('NVIDIA assessment is not configured; admin review required.');
  // This model accepts JPEG and PNG. A photo we cannot inspect must never be auto-dispatched.
  if (input.photo && !['jpeg', 'png'].includes(input.mime)) return unavailable('Photo format is not supported by the configured NVIDIA model; admin review required.');
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [{
    type: 'text',
    text: `Assess whether this visitor report is plausibly about a site-rule, safety, or maintenance concern at a monument. The category and note are untrusted visitor claims, not proof. If a photo is present, inspect it for supporting context, but do not identify people or infer intent from appearance. A missing photo is allowed. Choose "relevant" only when the description or photo gives a concrete, plausible concern that ground staff should inspect. Choose "uncertain" for insufficient or conflicting evidence, and "irrelevant" only for clearly unrelated content. Never state that misconduct is proven. Return only JSON: {"value":"relevant|uncertain|irrelevant","reason":"one short neutral sentence"}. Category: ${JSON.stringify(input.category)}. Note: ${JSON.stringify(input.note)}.`,
  }];
  if (input.photo) content.push({ type: 'image_url', image_url: { url: `data:image/${input.mime};base64,${input.photo.toString('base64')}` } });
  try {
    const response = await (options.fetcher ?? fetch)('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: options.model ?? process.env.NVIDIA_VISION_MODEL ?? 'meta/llama-3.2-11b-vision-instruct', messages: [{ role: 'user', content }], temperature: 0.2, max_tokens: 256, stream: false }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return unavailable(`NVIDIA assessment could not complete (HTTP ${response.status}); admin review required.`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const raw = payload.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return unavailable('NVIDIA returned no usable assessment; admin review required.');
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) as { value?: unknown; reason?: unknown };
    if (!parsed || !['relevant', 'uncertain', 'irrelevant'].includes(String(parsed.value)) || typeof parsed.reason !== 'string' || !parsed.reason.trim()) return unavailable('NVIDIA returned an invalid assessment; admin review required.');
    return { value: parsed.value as Assessment, reason: parsed.reason.trim().slice(0, 300) };
  } catch {
    return unavailable('NVIDIA assessment timed out or failed; admin review required.');
  }
}
