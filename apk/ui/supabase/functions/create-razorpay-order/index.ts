import { adminClient, errorResponse, handleOptions, json, parseJson, requireUser } from '../_shared/http.ts'
import { razorpayConfig, razorpayRequest } from '../_shared/razorpay.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const reservationId = String(body.reservationId ?? '')
    const client = adminClient()
    const { data: reservation, error } = await client.from('marketplace_reservations').select('*').eq('id', reservationId).eq('buyer_id', user.id).single()
    if (error || !reservation) return json({ error: 'Reservation not found.' }, 404)
    if (reservation.status !== 'payment_pending' || new Date(reservation.expires_at).getTime() <= Date.now()) return json({ error: 'Reservation is no longer payable.' }, 409)

    const { data: existing } = await client.from('marketplace_payments').select('*').eq('reservation_id', reservationId).eq('status', 'created').maybeSingle()
    const { keyId } = razorpayConfig()
    if (existing?.provider_order_id) return json({ keyId, orderId: existing.provider_order_id, amount: existing.amount_paise, reservationId })
    if (existing && new Date(existing.updated_at).getTime() < Date.now() - 30_000) {
      await client.from('marketplace_payments').delete().eq('id', existing.id).is('provider_order_id', null)
    }

    const idempotencyKey = `reservation:${reservationId}`
    const { data: claimedPayment, error: claimError } = await client.from('marketplace_payments').insert({
      reservation_id: reservationId, amount_paise: reservation.deposit_paise,
      status: 'created', idempotency_key: idempotencyKey,
    }).select('id').single()
    if (claimError) {
      if (claimError.code !== '23505') throw claimError
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        const { data: inFlight } = await client.from('marketplace_payments')
          .select('provider_order_id, amount_paise').eq('idempotency_key', idempotencyKey).maybeSingle()
        if (inFlight?.provider_order_id) {
          return json({ keyId, orderId: inFlight.provider_order_id, amount: inFlight.amount_paise, reservationId })
        }
      }
      return json({ error: 'Payment order creation is already in progress. Please retry.' }, 409)
    }

    try {
      const order = await razorpayRequest('/orders', 'POST', {
        amount: reservation.deposit_paise, currency: 'INR', receipt: `sanskriti_${reservationId.replaceAll('-', '').slice(0, 24)}`,
        notes: { reservation_id: reservationId, buyer_id: user.id },
      })
      const { error: paymentError } = await client.from('marketplace_payments').update({
        provider_order_id: String(order.id), updated_at: new Date().toISOString(),
      }).eq('id', claimedPayment.id).is('provider_order_id', null)
      if (paymentError) throw paymentError
      return json({ keyId, orderId: order.id, amount: reservation.deposit_paise, reservationId })
    } catch (error) {
      await client.from('marketplace_payments').delete().eq('id', claimedPayment.id).is('provider_order_id', null)
      throw error
    }
  } catch (error) { return errorResponse(error) }
})
