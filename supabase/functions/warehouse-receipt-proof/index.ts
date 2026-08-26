import { createClient } from 'npm:@supabase/supabase-js@2'

type StaffRole = 'admin' | 'super_admin' | 'warehouse' | 'warehouse_china' | 'warehouse_uae' | 'warehouse_erbil' | 'operations' | 'delivery'

const ORIGINS = new Set(['https://globall-cloud.pages.dev', 'https://globall-cloud.netlify.app'])
const ALLOWED_ROLES = new Set<StaffRole>(['admin', 'super_admin', 'warehouse', 'warehouse_china', 'warehouse_uae', 'warehouse_erbil', 'operations', 'delivery'])
const BUCKET = 'warehouse-receipts'

const cors = (req: Request) => ({
  ...(ORIGINS.has(req.headers.get('origin') || '') ? { 'Access-Control-Allow-Origin': req.headers.get('origin') || '' } : {}),
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

const text = (value: unknown, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const numeric = (value: unknown, max: number) => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null
}

const normalizeGc = (value: unknown) => {
  const raw = text(value, 64).normalize('NFKC').toUpperCase().replace(/[–—−]/g, '-').replace(/\s+/g, '')
  return /^GC-[A-Z0-9-]{2,30}$/.test(raw) ? raw : ''
}

const safeFilename = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-80) || 'photo.jpg'
const stageForLocation = (location: string, requested: string) => {
  if (['received', 'china_received', 'uae_arrived', 'erbil_arrived', 'delivery_proof'].includes(requested)) return requested
  if (/china/i.test(location)) return 'china_received'
  if (/dubai|uae|emirates/i.test(location)) return 'uae_arrived'
  if (/erbil/i.test(location)) return 'erbil_arrived'
  return 'received'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (!['GET', 'POST'].includes(req.method)) return json(req, { error: 'Method not allowed' }, 405)

  if (req.method === 'GET') return json(req, { ok: true, service: 'warehouse-receipt-proof' })

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
    const { data: staff, error: staffError } = await service
      .from('staff')
      .select('id,full_name,role,branch,is_active')
      .eq('id', user.id)
      .maybeSingle()
    if (staffError) throw staffError
    if (!staff || staff.is_active !== true || !ALLOWED_ROLES.has(String(staff.role) as StaffRole)) return json(req, { error: 'Forbidden' }, 403)

    const form = await req.formData()
    const batchCode = text(form.get('batch_code'), 120)
    const customerCode = normalizeGc(form.get('customer_code'))
    const location = text(form.get('location'), 60) || 'Dubai'
    const customerPhone = text(form.get('customer_phone'), 80)
    const notes = text(form.get('notes'), 4000)
    const stage = stageForLocation(location, text(form.get('stage'), 40))
    const shipmentId = text(form.get('shipment_id'), 100) || null
    const scanCode = text(form.get('scan_code'), 120) || null
    const scanType = ['qr', 'barcode'].includes(text(form.get('scan_type'), 20)) ? text(form.get('scan_type'), 20) : 'barcode'
    const verificationStatus = ['pending', 'verified', 'rejected'].includes(text(form.get('verification_status'), 20)) ? text(form.get('verification_status'), 20) : 'pending'
    const lat = numeric(form.get('latitude'), 90)
    const lng = numeric(form.get('longitude'), 180)
    const photoTakenAt = text(form.get('photo_taken_at'), 80) || new Date().toISOString()
    const detectedGc = normalizeGc(form.get('gc_code_detected')) || customerCode
    const ocrText = text(form.get('ocr_text'), 12000) || null
    const ocrConfidence = numeric(form.get('ocr_confidence'), 1)
    const autoAssigned = String(form.get('auto_assigned') || '').toLowerCase() === 'true'

    if (!batchCode) return json(req, { error: 'Batch code is required.' }, 400)
    if (!customerCode) return json(req, { error: 'Valid GC customer code is required.' }, 400)

    let labelMetadata: Record<string, unknown> = {}
    try {
      const raw = text(form.get('label_metadata'), 12000)
      labelMetadata = raw ? JSON.parse(raw) : {}
    } catch {
      return json(req, { error: 'Invalid label metadata.' }, 400)
    }

    labelMetadata = {
      invoice_number: text(labelMetadata.invoice_number, 120),
      quantity: numeric(labelMetadata.quantity, 1000000),
      gross_weight_kg: numeric(labelMetadata.gross_weight_kg, 1000000),
      declared_value: numeric(labelMetadata.declared_value, 1000000000),
      declared_currency: text(labelMetadata.declared_currency, 12).toUpperCase() || null,
      total_packages: numeric(labelMetadata.total_packages, 1000000),
      carrier: text(labelMetadata.carrier, 120),
      service_level: text(labelMetadata.service_level, 80),
      carrier_tracking_number: text(labelMetadata.carrier_tracking_number, 160),
      supplier_name: text(labelMetadata.supplier_name, 220),
      origin_city: text(labelMetadata.origin_city, 160),
      origin_country: text(labelMetadata.origin_country, 100),
      destination: text(labelMetadata.destination, 160),
      item_summary: text(labelMetadata.item_summary, 1200),
      label_text: text(labelMetadata.label_text, 6000),
    }

    const customerQuery = await service
      .from('customer_directory')
      .select('id,code,gc_code,name,phone,is_active')
      .eq('gc_code', customerCode)
      .maybeSingle()
    let customer = customerQuery.data
    if (!customer) {
      const fallback = await service.from('customer_directory').select('id,code,gc_code,name,phone,is_active').eq('code', customerCode).maybeSingle()
      customer = fallback.data
    }
    if (!customer || customer.is_active !== true) return json(req, { error: `Customer ${customerCode} was not found or is inactive.` }, 404)

    const files = form.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0)
    if (files.length > 8) return json(req, { error: 'A maximum of 8 receipt photos is allowed.' }, 400)
    for (const file of files) {
      if (!file.type.startsWith('image/')) return json(req, { error: 'Only image receipt photos are allowed.' }, 400)
      if (file.size > 10 * 1024 * 1024) return json(req, { error: 'Each receipt photo must be 10 MB or smaller.' }, 400)
    }

    const timestamp = Date.now()
    const photoUrls: string[] = []
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const path = `${customerCode}/${batchCode}/${timestamp}-${index + 1}-${safeFilename(file.name)}`
      const { error: uploadError } = await service.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
        cacheControl: '31536000',
      })
      if (uploadError) throw uploadError
      const { data: publicData } = service.storage.from(BUCKET).getPublicUrl(path)
      if (publicData?.publicUrl) photoUrls.push(publicData.publicUrl)
    }

    const { data: receipt, error: receiptError } = await service
      .from('warehouse_receipts')
      .insert({
        batch_code: batchCode,
        location,
        photos: photoUrls,
        notes: notes || null,
        received_at: new Date().toISOString(),
        created_by: user.id,
        created_by_name: staff.full_name || staff.role || 'Staff',
        directory_phone: customerPhone || customer.phone || null,
        directory_customer_id: customer.id,
        stage,
        latitude: lat,
        longitude: lng,
        photo_taken_at: photoTakenAt,
        gc_code_detected: detectedGc,
        ocr_text: ocrText,
        ocr_confidence: ocrConfidence,
        ai_detected_items: [],
        auto_assigned: autoAssigned || Boolean(shipmentId),
        shipment_id: shipmentId,
        scan_code: scanCode,
        scan_type: scanType,
        scanned_at: scanCode ? new Date().toISOString() : null,
        verification_status: verificationStatus,
        verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
        label_metadata: labelMetadata,
        label_captured_at: new Date().toISOString(),
        label_capture_method: ocrText ? 'ocr' : (scanCode ? 'barcode' : 'manual'),
      })
      .select('id,batch_code,location,stage,gc_code_detected,verification_status,photos,shipment_id,received_at,label_metadata,label_capture_method,label_captured_at')
      .single()
    if (receiptError) throw receiptError

    await service.from('staff_activity_log').insert({
      staff_id: user.id,
      staff_name: staff.full_name || staff.role || 'Staff',
      action: 'warehouse_receipt_created',
      target_id: String(receipt.id),
      details: JSON.stringify({ customer_code: customerCode, batch_code: batchCode, stage, photo_count: photoUrls.length, carrier_tracking_number: labelMetadata.carrier_tracking_number || null }),
    })

    return json(req, {
      ok: true,
      customer: { id: customer.id, code: customer.gc_code || customer.code, name: customer.name, phone: customer.phone },
      receipt,
      whatsapp_text: `Globall Cloud | ${customer.gc_code || customer.code}\nوەرگیرا: ${location} · ${stage}\nBatch: ${batchCode}\n${photoUrls.length} وێنەی بەڵگەی وەرگرتن\n${labelMetadata.carrier ? `Carrier: ${labelMetadata.carrier}\n` : ''}${labelMetadata.carrier_tracking_number ? `Tracking: ${labelMetadata.carrier_tracking_number}\n` : ''}${labelMetadata.gross_weight_kg != null ? `Weight: ${labelMetadata.gross_weight_kg} kg\n` : ''}${labelMetadata.declared_value != null ? `Declared: ${labelMetadata.declared_value} ${labelMetadata.declared_currency || ''}\n` : ''}`,
    })
  } catch (error) {
    console.error('warehouse-receipt-proof error', error instanceof Error ? error.message : String(error))
    return json(req, { error: 'Receipt could not be saved.' }, 500)
  }
})
