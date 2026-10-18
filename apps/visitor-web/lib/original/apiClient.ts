// The askChat and recognize calls from apk/ui/lib/apiClient.ts, as used by the
// ported Yatrik and Recognition screens. Same request bodies and { data }
// result shape. Differences:
// - The Android app answered through its native NVIDIA bridge, the iOS app
//   through its own /api/chat and /api/recognize routes, and a plain browser
//   through an external backend (https://heritageai-backend.onrender.com),
//   which did not respond when checked. This website's server provides
//   /api/chat and /api/recognize with the original request fields, so both
//   calls go there, as on iOS.
// - In a browser the original used axios, whose errors read "Network Error"
//   or "Request failed with status code N". The screens choose their error
//   text from those messages, so the same messages are produced here.

import type { SupportedLanguage } from './languages'

async function postApp(path: string, body: Record<string, unknown>) {
  let response: Response
  try {
    response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Network Error')
  }
  if (!response.ok) throw new Error(`Request failed with status code ${response.status}`)
  const data = await response.json()
  return { data }
}

export const api = {
  // Chat
  askChat: (question: string, monumentId = '', lang?: SupportedLanguage) =>
    postApp('/api/chat', { question, monument_id: monumentId, lang }),

  // Recognition
  recognize: (imageB64: string, filename = 'image.jpg', options?: Record<string, unknown>) =>
    postApp('/api/recognize', {
      image_b64: imageB64,
      filename,
      ...(options || {}),
    }),
}

export default api
