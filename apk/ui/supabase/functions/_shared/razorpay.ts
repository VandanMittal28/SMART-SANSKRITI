const encoder = new TextEncoder()

export function razorpayConfig() {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keyId || !keySecret) throw new Error('Razorpay test credentials are not configured.')
  return { keyId, keySecret }
}

export async function razorpayRequest(path: string, method: 'POST' | 'GET', body?: unknown) {
  const { keyId, keySecret } = razorpayConfig()
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(typeof payload?.error?.description === 'string' ? payload.error.description : 'Razorpay request failed.')
  return payload as Record<string, unknown>
}

export async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function validHmac(secret: string, value: string, received: string) {
  const expected = await hmacHex(secret, value)
  if (expected.length !== received.length) return false
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ received.charCodeAt(index)
  return mismatch === 0
}

