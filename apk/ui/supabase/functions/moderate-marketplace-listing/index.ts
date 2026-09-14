import { adminClient, errorResponse, handleOptions, json, parseJson, requireAdmin, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    await requireAdmin(user.id)
    const body = await parseJson(request)
    const listingId = Number(body.listingId)
    const status = body.status === 'approved' ? 'approved' : body.status === 'paused' ? 'paused' : ''
    if (!Number.isSafeInteger(listingId) || !status) return json({ error: 'Invalid moderation request.' }, 422)
    const client = adminClient()
    const { data: current, error: currentError } = await client.from('marketplace_listings')
      .select('title_translations, description_translations, deposit_percent').eq('id', listingId).single()
    if (currentError || !current) return json({ error: 'Listing not found.' }, 404)
    const requestedDeposit = Number(body.depositPercent ?? current.deposit_percent)
    if (!Number.isInteger(requestedDeposit) || requestedDeposit < 1 || requestedDeposit > 100) {
      return json({ error: 'Deposit percent must be between 1 and 100.' }, 422)
    }
    const titles = body.titleTranslations && typeof body.titleTranslations === 'object' ? body.titleTranslations as Record<string, unknown> : {}
    const descriptions = body.descriptionTranslations && typeof body.descriptionTranslations === 'object' ? body.descriptionTranslations as Record<string, unknown> : {}
    const cleanText = (values: Record<string, unknown>) => Object.fromEntries(
      Object.entries(values).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => [key, String(value).trim()]),
    )
    const { data, error } = await client.from('marketplace_listings').update({
      approval_status: status, admin_note: String(body.note ?? ''), reviewed_at: new Date().toISOString(), reviewed_by: user.id,
      deposit_percent: requestedDeposit,
      title_translations: { ...(current.title_translations ?? {}), ...cleanText(titles) },
      description_translations: { ...(current.description_translations ?? {}), ...cleanText(descriptions) },
    }).eq('id', listingId).select('id, approval_status, deposit_percent').single()
    if (error) throw error
    return json({ listingId: data.id, status: data.approval_status, depositPercent: data.deposit_percent })
  } catch (error) { return errorResponse(error) }
})
