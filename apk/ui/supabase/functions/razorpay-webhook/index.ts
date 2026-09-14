import { adminClient, errorResponse, handleOptions, json } from '../_shared/http.ts'
import { validHmac } from '../_shared/razorpay.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature') ?? ''
    const eventId = request.headers.get('x-razorpay-event-id') ?? ''
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!secret || !signature || !await validHmac(secret, rawBody, signature)) return json({ error: 'Invalid webhook signature.' }, 401)
    const payload = JSON.parse(rawBody) as Record<string, any>
    const payment = payload?.payload?.payment?.entity
    const refund = payload?.payload?.refund?.entity
    const client = adminClient()
    if (payment?.order_id && (payload.event === 'payment.captured' || payload.event === 'order.paid')) {
      const { data: paymentRow } = await client.from('marketplace_payments').select('reservation_id, provider_event_id').eq('provider_order_id', payment.order_id).single()
      if (paymentRow && paymentRow.provider_event_id !== eventId) {
        const { error } = await client.rpc('confirm_marketplace_payment', {
          p_reservation_id: paymentRow.reservation_id, p_provider_order_id: payment.order_id,
          p_provider_payment_id: payment.id, p_provider_event_id: eventId, p_payload: payload,
        })
        if (error) throw error
      }
    } else if (refund?.payment_id && payload.event === 'refund.processed') {
      const { data: paymentRow } = await client.from('marketplace_payments').select('reservation_id').eq('provider_payment_id', refund.payment_id).single()
      if (paymentRow) {
        await client.from('marketplace_payments').update({ status: 'refunded', provider_event_id: eventId, provider_payload: payload, updated_at: new Date().toISOString() }).eq('reservation_id', paymentRow.reservation_id)
        const { data: reservation } = await client.from('marketplace_reservations').select('buyer_id').eq('id', paymentRow.reservation_id).single()
        if (reservation) await client.rpc('release_marketplace_reservation', { p_reservation_id: paymentRow.reservation_id, p_status: 'refunded', p_actor_id: reservation.buyer_id, p_reason: 'Razorpay refund processed' })
      }
    }
    return json({ received: true })
  } catch (error) { return errorResponse(error) }
})

