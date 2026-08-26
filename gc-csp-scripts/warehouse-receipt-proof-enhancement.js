(() => {
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co'
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda'
  const $ = (id) => document.getElementById(id)
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const endpoint = `${URL}/functions/v1/warehouse-receipt-proof`
  const apiClient = window.supabase?.createClient ? window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

  const field = (id, label, placeholder = '', type = 'text', full = false) => {
    const wrap = document.createElement('label')
    wrap.className = `proof-label${full ? ' full' : ''}`
    wrap.innerHTML = `<span>${esc(label)}</span><input id="${id}" class="field" type="${type}" placeholder="${esc(placeholder)}" autocomplete="off">`
    return wrap
  }

  function addPanel() {
    if (!$('save') || $('proofPanel')) return
    const panel = document.createElement('section')
    panel.id = 'proofPanel'
    panel.className = 'proof-panel'
    panel.innerHTML = `
      <h3>ULTRA — زانیاریی لیبڵی بار</h3>
      <p class="proof-note">لەسەر ستیکەرەکەی J&amp;T / carrier ـەکە، زانیاریی invoice، وزن، بەهای ڕاگەیەنراو، ژمارەی پاکێج و tracking تۆمار بکە. کۆدی GC ـی کڕیار هەمیشە بە ID ـی کڕیار پەیوەست دەبێت.</p>
      <div id="proofGrid" class="proof-grid"></div>
      <div class="proof-actions">
        <button id="proofSave" class="btn primary" type="button">تۆمارکردنی وەرگرتن + وێنە</button>
        <button id="proofCopy" class="btn" type="button" disabled>کۆپی بۆ WhatsApp</button>
      </div>
      <div id="proofResult" class="proof-result" role="status" aria-live="polite">ئامادەیە بۆ تۆمارکردنی بەڵگەی وەرگرتن.</div>`

    const grid = panel.querySelector('#proofGrid')
    grid.append(
      field('proofStage', 'قۆناغ', '', 'text'),
      field('proofShipmentId', 'Shipment ID (ئەگەر هەیە)', 'مثال: SHP-...'),
      field('proofInvoice', 'Invoice Number', 'مثال: 6061226141997'),
      field('proofQty', 'QTY', 'مثال: 7', 'number'),
      field('proofWeight', 'Gross Weight (KG)', '0.5660', 'number'),
      field('proofPackages', 'Total Packages', '1', 'number'),
      field('proofDeclared', 'Declared Value', '24.17', 'number'),
      field('proofCurrency', 'Currency', 'USD'),
      field('proofCarrier', 'Carrier', 'J&T Express / iMile'),
      field('proofService', 'Service', 'STANDARD'),
      field('proofTracking', 'Carrier Tracking No.', 'JTE... / 860...'),
      field('proofSupplier', 'Supplier / Shipper', 'Jiang Yuanfei'),
      field('proofOrigin', 'Origin City', 'Foshan, Guangdong, China'),
      field('proofDestination', 'Destination', 'Dubai / Erbil', 'text'),
      field('proofItemSummary', 'Items / Contents', 'Watch, glasses, phone case ...', 'text', true),
      field('proofLabelText', 'Label / OCR text', 'هەموو دەقەکەی ستیکەر لێرە دابنێ', 'text', true),
    )

    const stage = $('proofStage')
    stage.outerHTML = `<select id="proofStage" class="field"><option value="received">Received</option><option value="china_received">China received</option><option value="uae_arrived">UAE / Dubai arrived</option><option value="erbil_arrived">Erbil arrived</option><option value="delivery_proof">Delivery proof</option></select>`

    $('notes')?.parentElement?.insertBefore(panel, $('notes'))
    $('proofStage').value = /china/i.test($('location')?.value || '') ? 'china_received' : /erbil/i.test($('location')?.value || '') ? 'erbil_arrived' : 'uae_arrived'
  }

  async function token() {
    if (!apiClient) throw new Error('Supabase client is not available')
    const { data } = await apiClient.auth.getSession()
    if (!data.session?.access_token) throw new Error('No active staff session')
    return data.session.access_token
  }

  const read = (id) => $(id)?.value?.trim() || ''

  async function getLocation() {
    return await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: '', lng: '' })
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) }),
        () => resolve({ lat: '', lng: '' }),
        { enableHighAccuracy: true, timeout: 3500, maximumAge: 30000 },
      )
    })
  }

  function buildLabelMetadata() {
    return {
      invoice_number: read('proofInvoice'),
      quantity: Number(read('proofQty') || 0) || null,
      gross_weight_kg: Number(read('proofWeight') || 0) || null,
      declared_value: Number(read('proofDeclared') || 0) || null,
      declared_currency: read('proofCurrency').toUpperCase() || null,
      total_packages: Number(read('proofPackages') || 0) || null,
      carrier: read('proofCarrier'),
      service_level: read('proofService'),
      carrier_tracking_number: read('proofTracking'),
      supplier_name: read('proofSupplier'),
      origin_city: read('proofOrigin'),
      origin_country: /china|guangdong|foshan/i.test(read('proofOrigin')) ? 'China' : '',
      destination: read('proofDestination'),
      item_summary: read('proofItemSummary'),
      label_text: read('proofLabelText'),
    }
  }

  function whatsappText(code, location, stage, batch, meta, photoCount) {
    return [
      `Globall Cloud | ${code}`,
      `وەرگیرا: ${location} · ${stage}`,
      `Batch: ${batch}`,
      meta.invoice_number ? `Invoice: ${meta.invoice_number}` : '',
      meta.carrier ? `Carrier: ${meta.carrier}` : '',
      meta.carrier_tracking_number ? `Tracking: ${meta.carrier_tracking_number}` : '',
      meta.gross_weight_kg ? `Weight: ${meta.gross_weight_kg} kg` : '',
      meta.declared_value ? `Declared: ${meta.declared_value} ${meta.declared_currency || ''}` : '',
      meta.total_packages ? `Packages: ${meta.total_packages}` : '',
      `${photoCount} وێنەی بەڵگەی وەرگرتن`,
    ].filter(Boolean).join('\n')
  }

  async function saveProof() {
    const result = $('proofResult')
    const button = $('proofSave')
    const code = read('customerCode').toUpperCase()
    const batch = read('batch')
    const photos = [...($('photos')?.files || [])]
    if (!/^GC-[A-Z0-9-]{2,30}$/.test(code)) return void (result.textContent = 'کۆدی GC پێویستە، وەک GC-338.')
    if (!batch) return void (result.textContent = 'Batch code پێویستە.')
    if (!photos.length) return void (result.textContent = 'بەلایەنی کەم یەک وێنەی ستیکەر/زەرف هەڵبژێرە.')
    if (photos.length > 8) return void (result.textContent = 'زۆرترین ٨ وێنەی بەڵگەی وەرگرتنە.')

    button.disabled = true
    result.classList.remove('error')
    result.textContent = 'بەڵگەکان upload دەکرێن و کڕیار/GC ID دەپشتڕاستێت…'
    const geo = await getLocation()
    const form = new FormData()
    form.append('batch_code', batch)
    form.append('customer_code', code)
    form.append('location', $('location')?.value || 'Dubai')
    form.append('stage', read('proofStage'))
    form.append('customer_phone', read('phone'))
    form.append('notes', read('notes'))
    form.append('shipment_id', read('proofShipmentId'))
    form.append('latitude', geo.lat)
    form.append('longitude', geo.lng)
    form.append('photo_taken_at', new Date().toISOString())
    form.append('gc_code_detected', code)
    form.append('auto_assigned', 'true')
    form.append('label_metadata', JSON.stringify(buildLabelMetadata()))
    const barcode = read('recognitionResult')
    if (barcode && !/هیچ کۆدێک/.test(barcode)) form.append('scan_code', code)
    photos.forEach((file) => form.append('photos', file, file.name))

    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${await token()}` }, body: form, cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Receipt ${response.status}`)
      const text = payload.whatsapp_text || whatsappText(code, $('location')?.value || 'Dubai', read('proofStage'), batch, buildLabelMetadata(), photos.length)
      result.innerHTML = `<strong>✓</strong> ${esc(`وەرگرتنی ${code} تۆمار کرا.`)}\n${esc(text)}`
      $('proofCopy').disabled = false
      $('proofCopy').dataset.whatsapp = text
      button.textContent = 'تۆمارکرا ✓'
      if ($('msg')) $('msg').textContent = `وەرگرتن بۆ ${code} بە سەرکەوتوویی تۆمار کرا.`
      if (typeof load === 'function') await load()
    } catch (error) {
      result.classList.add('error')
      result.textContent = error instanceof Error ? error.message : String(error)
      button.disabled = false
    }
  }

  async function copyWhatsapp() {
    const text = $('proofCopy')?.dataset.whatsapp || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      $('proofCopy').textContent = 'کۆپی کرا ✓'
      setTimeout(() => { if ($('proofCopy')) $('proofCopy').textContent = 'کۆپی بۆ WhatsApp' }, 1500)
    } catch {
      $('proofCopy').textContent = 'کۆپی نەکرا'
    }
  }

  function init() {
    addPanel()
    $('save')?.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      void saveProof()
    }, true)
    $('proofSave')?.addEventListener('click', () => void saveProof())
    $('proofCopy')?.addEventListener('click', () => void copyWhatsapp())
    $('location')?.addEventListener('change', () => {
      const value = $('location').value
      $('proofStage').value = /china/i.test(value) ? 'china_received' : /erbil/i.test(value) ? 'erbil_arrived' : 'uae_arrived'
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
})()
