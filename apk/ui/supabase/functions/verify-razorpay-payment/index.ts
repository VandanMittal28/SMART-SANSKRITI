import { adminClient, errorResponse, handleOptions, json, parseJson, requireUser } from '../_shared/http.ts'
import { razorpayConfig, validHmac } from '../_shared/razorpay.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    const body = await parseJson(request)
    const reservationId = String(body.reservationId ?? '')
    const orderId = String(body.orderId ?? '')
    const paymentId = String(body.paymentId ?? '')
    const signature = String(body.signature ?? '')
    const client = adminClient()
    const { data: reservation } = await client.from('marketplace_reservations').select('buyer_id').eq('id', reservationId).single()
    if (!reservation || reservation.buyer_id !== user.id) return json({ error: 'Reservation not found.' }, 404)
    const { keySecret } = razorpayConfig()
    if (!await validHmac(keySecret, `${orderId}|${paymentId}`, signature)) return json({ error: 'Payment signature is invalid.' }, 401)
    const { data, error } = await client.rpc('confirm_marketplace_payment', {
      p_reservation_id: reservationId, p_provider_order_id: orderId, p_provider_payment_id: paymentId,
      p_provider_event_id: null, p_payload: { source: 'checkout_handler' },
    })
    if (error) throw error
    return json({ reservationId: data.id, status: data.status })
  } catch (error) { return errorResponse(error) }
})

