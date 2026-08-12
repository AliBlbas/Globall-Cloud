import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>

const ALLOWED_ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin')
  return !origin || ALLOWED_ORIGINS.has(origin)
}

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) },
  })
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

async function getUser(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null

  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: auth } },
  })

  const { data } = await client.auth.getUser()
  return data.user || null
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'Origin not allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const id = String(new URL(req.url).searchParams.get('id') || '').trim()
    if (!id || id.length > 128) return json(req, { error: 'Invalid tracking id' }, 400)

    const service = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const user = await getUser(req)
    const { data: shipment, error } = await service
      .from('shipments')
      .select('id,customer_user_id,customer_name,customer_phone,customer_email,notes,origin_key,dest_key,type,weight_kg,volume_cbm,items_count,total_amount,paid_amount,current_step_index,step_dates,eta,directory_customer_id,step_photos,batch_code,branch,created_at')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!shipment) return json(req, { error: 'Shipment not found' }, 404)

    let staff = false
    if (user?.id) {
      const { data: staffRow } = await service
        .from('staff')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      staff = Boolean(staffRow)
    }

    const owner = Boolean(user?.id && shipment.customer_user_id === user.id)
    const privileged = staff || owner

    return json(req, {
      shipment: {
        id: shipment.id,
        customer_name: privileged ? shipment.customer_name : null,
        customer_phone: privileged ? shipment.customer_phone : null,
        customer_email: privileged ? shipment.customer_email : null,
        notes: privileged ? shipment.notes : null,
        origin_key: shipment.origin_key,
        dest_key: shipment.dest_key,
        type: shipment.type,
        weight_kg: shipment.weight_kg,
        volume_cbm: shipment.volume_cbm,
        items_count: shipment.items_count,
        total_amount: privileged ? shipment.total_amount : null,
        paid_amount: privileged ? shipment.paid_amount : null,
        current_step_index: shipment.current_step_index,
        step_dates: shipment.step_dates,
        eta: shipment.eta,
        customer_user_id: privileged ? shipment.customer_user_id : null,
        directory_customer_id: privileged ? shipment.directory_customer_id : null,
        step_photos: privileged ? shipment.step_photos : null,
        batch_code: privileged ? shipment.batch_code : null,
        branch: staff ? shipment.branch : null,
        created_at: shipment.created_at,
      },
    })
  } catch (_error) {
    console.error('public-track error')
    return json(req, { error: 'Internal server error' }, 500)
  }
})
