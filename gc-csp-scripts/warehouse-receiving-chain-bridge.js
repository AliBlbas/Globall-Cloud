(() => {
  const LEGACY_ENDPOINT = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/warehouse-receipt-proof'
  const RECEIVING_ENDPOINT = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/warehouse-receiving'
  const originalFetch = window.fetch.bind(window)

  const add = (form, key, value) => {
    if (value !== null && value !== undefined && String(value).trim() !== '' && !form.has(key)) form.append(key, String(value))
  }

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    if (!url.startsWith(LEGACY_ENDPOINT)) return originalFetch(input, init)

    const nextInit = { ...init }
    if (init.body instanceof FormData) {
      const source = init.body
      const form = new FormData()
      source.forEach((value, key) => form.append(key, value))

      let metadata = {}
      try { metadata = JSON.parse(String(source.get('label_metadata') || '{}')) || {} } catch { metadata = {} }

      add(form, 'invoice_number', metadata.invoice_number)
      add(form, 'quantity', metadata.quantity)
      add(form, 'gross_weight_kg', metadata.gross_weight_kg)
      add(form, 'declared_value', metadata.declared_value)
      add(form, 'declared_currency', metadata.declared_currency)
      add(form, 'total_packages', metadata.total_packages)
      add(form, 'carrier', metadata.carrier)
      add(form, 'service_level', metadata.service_level)
      add(form, 'tracking_number', metadata.carrier_tracking_number || metadata.tracking_number)
      add(form, 'shipper', metadata.supplier_name || metadata.shipper)
      add(form, 'origin', metadata.origin_city || metadata.origin)
      add(form, 'destination', metadata.destination)
      add(form, 'item_summary', metadata.item_summary)
      add(form, 'ocr_text', metadata.label_text)
      add(form, 'shipment_id', source.get('shipment_id'))
      add(form, 'idempotency_key', `ui:${source.get('customer_code') || 'GC'}:${source.get('batch_code') || crypto.randomUUID()}:${source.get('photo_taken_at') || Date.now()}`)

      nextInit.body = form
      nextInit.headers = { ...(init.headers || {}) }
      delete nextInit.headers['content-type']
      delete nextInit.headers['Content-Type']
    }

    return originalFetch(RECEIVING_ENDPOINT, nextInit)
  }
})()
