(() => {
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co'
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda'
  const ENDPOINT = `${URL}/functions/v1/customer-receipt-evidence`
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const fmtDate = (value) => value ? new Date(value).toLocaleString() : '—'
  const money = (value, currency) => value == null ? '—' : `${Number(value).toLocaleString('en-US')} ${esc(currency || 'USD')}`

  async function load() {
    const target = document.getElementById('receipts')
    if (!target || document.getElementById('gcReceiptEvidence')) return
    const supabaseClient = window.supabase?.createClient?.(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    if (!supabaseClient) return
    const { data: sessionData } = await supabaseClient.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    let payload
    try {
      const response = await fetch(ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, apikey: KEY },
        cache: 'no-store',
      })
      payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Receipt evidence ${response.status}`)
    } catch (error) {
      const panel = document.createElement('section')
      panel.id = 'gcReceiptEvidence'
      panel.className = 'gc-receipt-evidence'
      panel.innerHTML = `<div class="gc-receipt-evidence__empty">نەتوانرا بەڵگەی وەرگرتنی کۆگا باربکرێت.</div>`
      target.parentElement?.insertBefore(panel, target.nextSibling)
      return
    }

    const receipts = Array.isArray(payload.receipts) ? payload.receipts : []
    const profileCode = payload.profile?.code || 'GC-—'
    const renderReceipt = (item) => {
      const meta = item.label_metadata && typeof item.label_metadata === 'object' ? item.label_metadata : {}
      const photos = Array.isArray(item.photos) ? item.photos.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)) : []
      const facts = [
        ['Invoice', meta.invoice_number],
        ['QTY', meta.quantity],
        ['Gross weight', meta.gross_weight_kg == null ? null : `${meta.gross_weight_kg} kg`],
        ['Declared', money(meta.declared_value, meta.declared_currency)],
        ['Packages', meta.total_packages],
        ['Carrier', meta.carrier],
        ['Tracking', meta.carrier_tracking_number],
        ['Supplier', meta.supplier_name],
        ['Origin', meta.origin_city],
        ['Destination', meta.destination],
        ['Items', meta.item_summary],
        ['Captured', fmtDate(item.label_captured_at || item.photo_taken_at || item.received_at)],
      ].filter(([, value]) => value !== null && value !== undefined && value !== '')
      return `<article class="gc-receipt-evidence__card">
        <div class="gc-receipt-evidence__row">
          <div><div class="gc-receipt-evidence__title">${esc(item.batch_code || 'Receipt')}</div><div class="gc-receipt-evidence__meta">${esc(item.location || '—')} · ${esc(item.stage || 'received')} · ${esc(fmtDate(item.received_at))}</div></div>
          <span class="gc-receipt-evidence__pill">${esc(item.verification_status || 'pending')}</span>
        </div>
        ${item.gc_code_detected ? `<div class="gc-receipt-evidence__meta">GC code: <strong>${esc(item.gc_code_detected)}</strong></div>` : ''}
        ${facts.length ? `<div class="gc-receipt-evidence__facts">${facts.map(([label, value]) => `<div class="gc-receipt-evidence__fact"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>` : ''}
        ${photos.length ? `<div class="gc-receipt-evidence__photos">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="${esc(profileCode)} receipt photo ${index + 1}" loading="lazy"></a>`).join('')}</div>` : ''}
      </article>`
    }

    const panel = document.createElement('section')
    panel.id = 'gcReceiptEvidence'
    panel.className = 'gc-receipt-evidence'
    panel.innerHTML = `<div class="gc-receipt-evidence__head"><div><div class="gc-receipt-evidence__kicker">WAREHOUSE PHOTO PROOF</div><h3>بەڵگەی وەرگرتنی کاڵا</h3><p>وێنەی زەرف، کۆدی GC، زانیاریی ستیکەر و مێژووی وەرگرتن لە هەمان شوێن.</p></div><span class="gc-receipt-evidence__code">${esc(profileCode)}</span></div><div class="gc-receipt-evidence__list">${receipts.length ? receipts.map(renderReceipt).join('') : '<div class="gc-receipt-evidence__empty">هێشتا هیچ بەڵگەی وەرگرتنی کۆگا بۆ ئەم کڕیارە نییە.</div>'}</div>`
    target.parentElement?.insertBefore(panel, target.nextSibling)
  }

  const init = () => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') void load()
    else document.addEventListener('DOMContentLoaded', () => void load(), { once: true })
    window.addEventListener('gc-customer-portal-ready', () => void load(), { once: true })
  }
  init()
})()
