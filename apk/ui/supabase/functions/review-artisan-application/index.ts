import { adminClient, errorResponse, handleOptions, json, parseJson, requireAdmin, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    await requireAdmin(user.id)
    const body = await parseJson(request)
    const applicationId = Number(body.applicationId)
    const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : ''
    if (!Number.isSafeInteger(applicationId) || !status) return json({ error: 'Invalid review request.' }, 422)
    const { data, error } = await adminClient().rpc('review_marketplace_artisan', {
      p_application_id: applicationId, p_status: status, p_note: String(body.note ?? ''), p_reviewer_id: user.id,
    })
    if (error) throw error
    return json({ applicationId: data.id, status: data.status })
  } catch (error) { return errorResponse(error) }
})

