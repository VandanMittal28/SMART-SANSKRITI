import { adminClient, errorResponse, handleOptions, json, parseJson, requireAdmin, requireUser } from '../_shared/http.ts'
import { razorpayRequest } from '../_shared/razorpay.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const reservationId = String(body.reservationId ?? '')
    const adminOverride = body.adminOverride === true
    const reason = String(body.reason ?? 'Reservation cancelled')
    const client = adminClient()
    const { data: reservation, error } = await client.from('marketplace_reservations')
      .select('*, marketplace_listings(artisan_id), marketplace_payments(*)').eq('id', reservationId).single()
    if (error || !reservation) return json({ error: 'Reservation not found.' }, 404)
    const listing = Array.isArray(reservation.marketplace_listings) ? reservation.marketplace_listings[0] : reservation.marketplace_listings
    const artisanCancellation = listing?.artisan_id === user.id
    if (adminOverride) await requireAdmin(user.id)
    if (reservation.buyer_id !== user.id && !artisanCancellation && !adminOverride) return json({ error: 'You cannot cancel this reservation.' }, 403)
    if (!['payment_pending', 'confirmed', 'refund_pending'].includes(reservation.status)) return json({ reservationId, status: reservation.status, unchanged: true })

    const moreThan24Hours = new Date(reservation.scheduled_for).getTime() - Date.now() >= 24 * 60 * 60_000
    const refundable = artisanCancellation || adminOverride || moreThan24Hours
    const payments = Array.isArray(reservation.marketplace_payments) ? reservation.marketplace_payments : []
    const payment = payments.find((item: Record<string, unknown>) => item.status === 'captured')
    let nextStatus: 'cancelled' | 'refund_pending' = 'cancelled'
    if (payment && refundable) {
      await razorpayRequest(`/payments/${encodeURIComponent(payment.provider_payment_id)}/refund`, 'POST', {
        amount: payment.amount_paise, notes: { reservation_id: reservationId, reason },
      })
      await client.from('marketplace_payments').update({ status: 'refund_pending', updated_at: new Date().toISOString() }).eq('id', payment.id)
      nextStatus = 'refund_pending'
    }
    const { data, error: releaseError } = await client.rpc('release_marketplace_reservation', {
      p_reservation_id: reservationId, p_status: nextStatus, p_actor_id: user.id, p_reason: reason,
    })
    if (releaseError) throw releaseError
    await client.from('fulfillment_events').upsert({ reservation_id: reservationId, actor_id: user.id, event_type: refundable ? 'refund_requested' : 'cancelled', note: reason }, { onConflict: 'reservation_id,event_type', ignoreDuplicates: true })
    return json({ reservationId, status: data.status, refundable })
  } catch (error) { return errorResponse(error) }
})

