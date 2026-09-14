import { adminClient, errorResponse, handleOptions, json, requireAdmin, requireUser } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options
  try {
    const user = await requireUser(request)
    await requireAdmin(user.id)
    const client = adminClient()
    const [applications, listings, reservations] = await Promise.all([
      client.from('artisan_applications').select('*, artisan_documents(*)').order('submitted_at', { ascending: false }),
      client.from('marketplace_listings').select('*').order('created_at', { ascending: false }),
      client.from('marketplace_reservations').select('*, marketplace_listings(title_source)').order('created_at', { ascending: false }).limit(50),
    ])
    const error = applications.error ?? listings.error ?? reservations.error
    if (error) throw error
    const documents = (applications.data ?? []).flatMap((application) => application.artisan_documents ?? [])
    const paths = documents.map((document) => document.storage_path)
    const signedUrls = paths.length
      ? await client.storage.from('artisan-documents').createSignedUrls(paths, 600)
      : { data: [], error: null }
    if (signedUrls.error) throw signedUrls.error
    const signedUrlByPath = new Map((signedUrls.data ?? []).map((item) => [item.path, item.signedUrl]))
    const applicationsWithDocuments = (applications.data ?? []).map((application) => ({
      ...application,
      artisan_documents: (application.artisan_documents ?? []).map((document) => ({
        ...document,
        signed_url: signedUrlByPath.get(document.storage_path) ?? null,
      })),
    }))
    return json({
      applications: applicationsWithDocuments,
      listings: listings.data ?? [],
      reservations: reservations.data ?? [],
    })
  } catch (error) { return errorResponse(error) }
})
