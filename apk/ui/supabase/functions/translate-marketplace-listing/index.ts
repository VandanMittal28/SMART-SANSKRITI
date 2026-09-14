import { adminClient, errorResponse, handleOptions, json, parseJson, requireAdmin, requireUser } from '../_shared/http.ts'

const languages = ['ar', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'ms', 'nl', 'nb', 'pl', 'pt', 'ru', 'sv', 'sw', 'tr', 'zh']

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const listingId = Number(body.listingId)
    const client = adminClient()
    const { data: listing, error } = await client.from('marketplace_listings').select('*').eq('id', listingId).single()
    if (error || !listing) return json({ error: 'Listing not found.' }, 404)
    if (listing.artisan_id !== user.id) await requireAdmin(user.id)
    const apiKey = Deno.env.get('NVIDIA_API_KEY')
    const existingTitles = listing.title_translations && typeof listing.title_translations === 'object' ? listing.title_translations : {}
    const existingDescriptions = listing.description_translations && typeof listing.description_translations === 'object' ? listing.description_translations : {}
    const fallbackTitle = String(existingTitles.en ?? listing.title_source)
    const fallbackDescription = String(existingDescriptions.en ?? listing.description_source)
    const fallbackTitles = Object.fromEntries(languages.map((language) => [language, String(existingTitles[language] ?? fallbackTitle)]))
    const fallbackDescriptions = Object.fromEntries(languages.map((language) => [language, String(existingDescriptions[language] ?? fallbackDescription)]))
    if (!apiKey) {
      const { error: fallbackError } = await client.from('marketplace_listings').update({
        title_translations: fallbackTitles, description_translations: fallbackDescriptions,
        approval_status: 'pending', updated_at: new Date().toISOString(),
      }).eq('id', listingId)
      if (fallbackError) throw fallbackError
      return json({ listingId, translated: false, fallback: 'en', languages: languages.length, reason: 'NVIDIA_API_KEY is not configured.' })
    }
    const model = Deno.env.get('NVIDIA_TRANSLATION_MODEL') ?? 'nvidia/riva-translate-4b-instruct-v2'
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.1, messages: [
        { role: 'system', content: 'Translate local Indian craft marketplace copy accurately. Preserve names, prices, and craft terms. Return only valid JSON.' },
        { role: 'user', content: `Return an object with keys title and description. Each contains translations keyed by these language codes: ${languages.join(', ')}. Source title: ${listing.title_source}\nSource description: ${listing.description_source}` },
      ] }),
    })
    if (!response.ok) throw new Error('Marketplace translation request failed.')
    const payload = await response.json() as Record<string, any>
    const content = String(payload?.choices?.[0]?.message?.content ?? '').replace(/^```json\s*|\s*```$/g, '')
    const translated = JSON.parse(content) as { title?: Record<string, string>; description?: Record<string, string> }
    const { error: updateError } = await client.from('marketplace_listings').update({
      title_translations: { ...fallbackTitles, ...(translated.title ?? {}) },
      description_translations: { ...fallbackDescriptions, ...(translated.description ?? {}) },
      approval_status: 'pending', updated_at: new Date().toISOString(),
    }).eq('id', listingId)
    if (updateError) throw updateError
    return json({ listingId, translated: true, languages: languages.length })
  } catch (error) { return errorResponse(error) }
})
