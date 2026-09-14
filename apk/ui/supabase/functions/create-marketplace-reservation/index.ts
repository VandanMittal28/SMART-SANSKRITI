import { adminClient, errorResponse, handleOptions, json, parseJson, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const listingId = Number(body.listingId)
    const quantity = Number(body.quantity)
    const workshopSlotId = body.workshopSlotId ? Number(body.workshopSlotId) : null
    const scheduledFor = typeof body.scheduledFor === 'string' ? body.scheduledFor : null
    if (!Number.isSafeInteger(listingId) || !Number.isSafeInteger(quantity)) return json({ error: 'Invalid listing or quantity.' }, 422)
    const client = adminClient()
    await client.rpc('expire_marketplace_holds')
    const { data, error } = await client.rpc('reserve_marketplace_item', {
      p_buyer_id: user.id, p_listing_id: listingId, p_quantity: quantity,
      p_workshop_slot_id: workshopSlotId, p_scheduled_for: scheduledFor,
    })
    if (error) throw error
    return json({ reservationId: data.id, expiresAt: data.expires_at, deposit: data.deposit_paise })
  } catch (error) { return errorResponse(error) }
})
