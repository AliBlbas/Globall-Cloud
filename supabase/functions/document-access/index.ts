import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>

const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

const cors = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://globall-cloud.pages.dev',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

const respond = (req: Request, body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) })

const resolveServiceKey = () => {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (direct) return direct
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (parsed?.default) return String(parsed.default)
    const first = Object.values(parsed ?? {})[0]
    return first ? String(first) : null
  } catch {
    return null
  }
}

const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = resolveServiceKey()
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'GET') return respond(req, { error: 'Method not allowed' }, 405)
  try {
    const authorization = req.headers.get('authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    if (!url || !anon || !authorization.toLowerCase().startsWith('bearer ')) return respond(req, { error: 'Unauthorized' }, 401)
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authorization } } })
    const userResult = await userClient.auth.getUser()
    if (userResult.error || !userResult.data.user) return respond(req, { error: 'Unauthorized' }, 401)
    const documentId = new URL(req.url).searchParams.get('document_id')
    if (!documentId) return respond(req, { error: 'document_id is required' }, 400)
    const service = serviceClient()
    const [documentResult, staffResult] = await Promise.all([
      service.from('shipment_documents').select('id,customer_user_id,is_public,document_status,file_path,file_url,title').eq('id', documentId).maybeSingle(),
      service.from('staff').select('id,is_active').eq('id', userResult.data.user.id).maybeSingle(),
    ])
    if (documentResult.error) throw documentResult.error
    if (!documentResult.data || documentResult.data.document_status === 'archived') return respond(req, { error: 'Document not found' }, 404)
    const isStaff = Boolean(staffResult.data?.is_active)
    const isOwner = documentResult.data.customer_user_id === userResult.data.user.id
    if (!isStaff && !isOwner && !documentResult.data.is_public) return respond(req, { error: 'Document access denied' }, 403)
    if (!documentResult.data.file_path) return respond(req, { url: documentResult.data.file_url, title: documentResult.data.title })
    const signed = await service.storage.from('shipment-documents').createSignedUrl(documentResult.data.file_path, 60 * 60)
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('Could not create signed URL')
    return respond(req, { url: signed.data.signedUrl, title: documentResult.data.title, expires_in: 3600 })
  } catch (error) {
    console.error('document-access error', error)
    return respond(req, { error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})
