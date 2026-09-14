import { adminClient, errorResponse, handleOptions, json, parseJson, requireAdmin, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const pin = String(body.confirmationPin ?? '')
    const eventType = body.eventType === 'attended' ? 'attended' : 'collected'
    if (!/^\d{6}$/.test(pin)) return json({ error: 'A six-digit confirmation PIN is required.' }, 422)
    const client = adminClient()
    const { data: rows, error } = await client.from('marketplace_reservations')
      .select('id, status, listing_id, marketplace_listings(artisan_id)').eq('confirmation_pin', pin).eq('status', 'confirmed').limit(10)
    if (error) throw error
    let reservation = rows?.find((row) => {
      const listing = Array.isArray(row.marketplace_listings) ? row.marketplace_listings[0] : row.marketplace_listings
      return listing?.artisan_id === user.id
    })
    if (!reservation) {
      try { await requireAdmin(user.id); reservation = rows?.[0] }
      catch { /* Keep the not-found response indistinguishable. */ }
    }
    if (!reservation) return json({ error: 'No confirmed reservation matches that PIN.' }, 404)
    const { error: updateError } = await client.from('marketplace_reservations').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', reservation.id).eq('status', 'confirmed')
    if (updateError) throw updateError
    await client.from('fulfillment_events').upsert({ reservation_id: reservation.id, actor_id: user.id, event_type: eventType }, { onConflict: 'reservation_id,event_type', ignoreDuplicates: true })
    return json({ reservationId: reservation.id, status: 'completed', eventType })
  } catch (error) { return errorResponse(error) }
})

