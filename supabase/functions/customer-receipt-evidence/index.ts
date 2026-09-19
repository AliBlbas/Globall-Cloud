import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const BUCKET = 'warehouse-receipts'
const SIGNED_URL_TTL = 60 * 60

const cors = (req: Request) => ({
  ...(ORIGINS.has(req.headers.get('origin') || '') ? { 'Access-Control-Allow-Origin': req.headers.get('origin') || '' } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
  Vary: 'Origin',
})

const json = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) },
})

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function extractStoragePath(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (!raw.startsWith('http')) return raw.replace(/^\/+/, '')
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ]
  for (const marker of markers) {
    const index = raw.indexOf(marker)
    if (index >= 0) return decodeURIComponent(raw.slice(index + marker.length).split('?')[0])
  }
  return null
}

async function signedPhotos(service: ReturnType<typeof createClient>, photos: unknown) {
  const values = Array.isArray(photos) ? photos : []
  const paths = values.map(extractStoragePath).filter((v): v is string => Boolean(v))
  if (!paths.length) return []
  const { data, error } = await service.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  if (error) throw error
  return (data || []).map((item) => item.signedUrl).filter((v): v is string => Boolean(v))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)
  const authorization = req.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return json(req, { error: 'Unauthorized' }, 401)

  try {
    const url = env('SUPABASE_URL')
    const anonKey = env('SUPABASE_ANON_KEY')
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    const user = userData.user
    if (userError || !user) return json(req, { error: 'Unauthorized' }, 401)

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: customer, error: customerError } = await service
      .from('customer_directory')
      .select('id,code,gc_code,name,email,phone,is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer || customer.is_active !== true) return json(req, { error: 'Customer account is not active.' }, 403)

    const { data: receipts, error: receiptError } = await service
      .from('warehouse_receipts')
      .select('id,batch_code,location,stage,photo_taken_at,gc_code_detected,verification_status,photos,shipment_id,received_at,created_at,notes,label_metadata,label_capture_method,label_captured_at,scan_code,scan_type,scanned_at,verified_at,consolidated')
      .eq('directory_customer_id', customer.id)
      .order('received_at', { ascending: false })
      .limit(60)
    if (receiptError) throw receiptError

    const securedReceipts = await Promise.all((receipts || []).map(async (receipt) => ({
      ...receipt,
      photos: await signedPhotos(service, receipt.photos),
    })))

    return json(req, {
      ok: true,
      profile: {
        id: customer.id,
        code: customer.gc_code || customer.code || null,
        name: customer.name || 'Customer',
        email: customer.email || user.email || null,
      },
      receipts: securedReceipts,
    })
  } catch (error) {
    console.error('customer-receipt-evidence error', error instanceof Error ? error.message : String(error))
    return json(req, { error: 'Receipt evidence could not be loaded.' }, 500)
  }
})
