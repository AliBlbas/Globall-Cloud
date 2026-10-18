const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const CUSTOMER_SELF = `${SUPABASE_URL}/functions/v1/customer-self`;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
// Classic-script const bindings are not window properties; expose the same
// session-aware client to independently loaded account modules.
window.sb = sb;
window.gcSupabase = sb;

const customerApi = async ({ method = 'GET', body } = {}) => {
  const { data: sessionResult } = await sb.auth.getSession();
  const token = sessionResult.session?.access_token;
  if (!token) throw new Error('تکایە سەرەتا login بکە');
  const response = await fetch(CUSTOMER_SELF, {
    method,
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Customer API ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};
// Shared only within this signed-in customer page; all requests remain session-authenticated.
window.gcCustomerApi = customerApi;
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const setHtml = (id, html) => { const element = $(id); if (element) element.innerHTML = html; };
const money = (amount, currency = 'USD') => `${Number(amount || 0).toLocaleString('en-US')} ${esc(currency)}`;
const date = (value) => value ? new Date(value).toLocaleString() : '—';
const showMessage = (message, kind = 'muted') => { $('quoteMessage').textContent = message; $('quoteMessage').className = kind; };
const syncQuoteMeasurements = () => {
  const isSea = $('quoteMode')?.value === 'sea';
  const weight = $('quoteWeight');
  const volume = $('quoteVolume');
  if (weight) weight.required = !isSea;
  if (volume) {
    volume.required = isSea;
    volume.min = isSea ? '0.001' : '0';
    volume.setAttribute('aria-required', String(isSea));
  }
  const volumeWrap = volume?.closest('.field-wrap');
  if (volumeWrap) {
    let note = volumeWrap.querySelector('[data-gc-volume-help]');
    if (isSea && !note) {
      note = document.createElement('small');
      note.dataset.gcVolumeHelp = '1';
      note.className = 'muted';
      note.textContent = 'بۆ بارە دەریاییەکان قەبارە بە CBM پێویستە.';
      volumeWrap.appendChild(note);
    } else if (!isSea) {
      note?.remove();
    }
  }
};

const renderClaimPrompt = () => {
  const status = $('portalStatus');
  if (!status) return;
  status.className = 'portal-status';
  status.innerHTML = `
    <div>
      <strong>هەژماری کڕیار پێویستی بە پشتڕاستکردنەوە هەیە</strong>
      <span>بۆ پاراستنی داتاکانی کڕیار، پەیوەستکردنی هەژمار بە GC Code و ژمارەی مۆبایل بە تەنیا بەردەست نییە. تکایە لەگەڵ ستافی Globall Cloud پەیوەندی بکە تا ناسنامەکەت پشتڕاست بکەنەوە و هەژمارەکەت بە شێوەی پارێزراو ببەستنەوە.</span>
      <div class="muted" role="status">GC Code ـەکەت ئامادە بێت. وشەی نهێنیی خۆت لە ڕێگای نەپارێزراو هاوبەش مەکە.</div>
      <a class="app-secondary-action gc-account-help-action" href="https://wa.me/9647507577137" target="_blank" rel="noopener noreferrer">پەیوەندی بە تیمی پشتیوانی لە WhatsApp <span aria-hidden="true">↗</span></a>
    </div>`;
};

const emptyState = (icon, title, text) => `<div class="gc-data-empty"><span class="gc-empty-icon">${icon}</span><div><strong>${title}</strong><span>${text}</span></div></div>`;
const EMPTY = {
  box: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M7 7V4h10v3"></path></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>',
  quote: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2"></path></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h5"></path></svg>',
  money: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h5"></path></svg>'
};

const renderCustomerIdentity = (profile) => {
  if (!profile) return;
  const code = profile.gc_code || profile.code || 'GC-—';
  if ($('customerGcCode')) $('customerGcCode').textContent = code;
  if ($('customerProfileName')) $('customerProfileName').textContent = profile.name || 'Customer';
  if ($('customerProfileContact')) $('customerProfileContact').textContent = [profile.email, profile.phone].filter(Boolean).join(' · ') || 'پەیوەندی تۆمار نەکراوە';
};
const renderWarehouseAddresses = (items) => {
  const rows = (items || []).map((item) => {
    const warehouse = item.warehouse || {};
    return `<div class="warehouse-address"><strong>${esc(item.label || warehouse.name || warehouse.code || 'Warehouse')}</strong><div>${esc(warehouse.address_line || warehouse.city || '—')}</div><small class="muted">${esc(warehouse.country_code || '')} · ${esc(item.recipient_name || '')}${item.recipient_phone ? ` · ${esc(item.recipient_phone)}` : ''}</small>${item.instructions ? `<div class="muted">${esc(item.instructions)}</div>` : ''}${item.is_default ? '<span class="pill">Default</span>' : ''}</div>`;
  }).join('');
  setHtml('warehouseAddresses', rows || '<div class="muted">هێشتا ناونیشانی warehouse بۆ هەژمارەکەت دانەنراوە.</div>');
};
const renderShipments = (items, cargoItems = []) => {
  const cargoByShipment = new Map();
  (cargoItems || []).forEach((cargo) => {
    const key=String(cargo.shipment_id||''); if(!key)return;
    if(!cargoByShipment.has(key))cargoByShipment.set(key,[]);
    cargoByShipment.get(key).push(cargo);
  });
  const rows=(items||[]).map((item)=>{
    const tracking=item.tracking_id||item.tracking_number||item.customer_gc_code||item.id;
    const cargo=cargoByShipment.get(String(item.id))||[];
    const cargoSummary=cargo.slice(0,4).map((row)=>{
      const counts=[];
      if(Number(row.quantity_pc||0)>0)counts.push(String(Number(row.quantity_pc))+' pc');
      if(Number(row.box_count||0)>0)counts.push(String(Number(row.box_count))+' box');
      if(Number(row.weight_kg||0)>0)counts.push(String(Number(row.weight_kg))+' kg');
      return esc(row.item_name||'Cargo item')+(counts.length?' · '+counts.join(' / '):'');
    }).join(' · ');
    return '<button class="item shipment-card" type="button" data-shipment-id="'+esc(item.id)+'">'+
      '<div class="row"><strong>'+esc(tracking)+'</strong><span class="pill">'+esc(item.operational_status||item.status||'in_progress')+'</span></div>'+
      '<div class="muted">'+esc(item.origin_key||item.origin||'—')+' → '+esc(item.dest_key||item.destination||'—')+'</div>'+
      '<small>'+esc(item.current_location_label||'دۆخی شوێن بەردەست نییە')+' · ETA '+esc(date(item.eta))+'</small>'+
      (cargoSummary?'<div class="shipment-content"><small>ناوەڕۆکی کاڵای هەژمارەکەت</small><div>'+cargoSummary+'</div></div>':'')+
      (item.is_consolidated?'<small class="muted">بارێکی کۆکراوە؛ تەنها کاڵا و زانیاریی دارایی تایبەت بە هەژماری خۆت پیشان دەدرێت.</small>':'')+
      '<span class="shipment-open">کردنەوەی وردەکاری ←</span></button>';
  }).join('');
  setHtml('shipments',rows||emptyState(EMPTY.box,'هیچ بارێک نییە','کاتێک shipment ـێک بۆ هەژمارەکەت تۆمار بکرێت، لێرە دەردەکەوێت.'));
};
const renderCustomerChat = (threads) => { const list=$('customerChatThreads'); if(!list)return; const rows=threads||[]; list.innerHTML=rows.map((thread)=>`<article class="item"><div class="row"><strong>${esc(thread.subject||'Customer Support')}</strong><span class="pill">${esc(thread.status||'open')}</span></div><small class="muted">${esc(date(thread.last_message_at||thread.created_at))}</small><div class="chat-messages">${(thread.messages||[]).map((message)=>`<div class="message ${message.sender_type==='customer'?'me':''}"><b>${message.sender_type==='customer'?'تۆ':'Staff'}</b><p>${esc(message.body)}</p><small>${esc(date(message.created_at))}</small></div>`).join('')||'<span class="muted">هێشتا پەیام نییە.</span>'}</div><button class="btn tiny" type="button" data-chat-thread="${esc(thread.id)}">وەڵامدانەوە</button></article>`).join('') || '<div class="muted">هیچ chat ـێک نییە؛ پەیامێک بنووسە بۆ دەستپێکردن.</div>'; document.querySelectorAll('[data-chat-thread]').forEach((button)=>button.addEventListener('click',()=>{ const input=$('customerChatInput'); if(input){ input.dataset.threadId=button.dataset.chatThread; input.focus(); } })); };
const sendCustomerChat = async (event) => { event.preventDefault(); const input=$('customerChatInput'); const status=$('customerChatStatus'); const body=input?.value.trim()||''; if(!body)return; const button=event.currentTarget.querySelector('button'); if(button)button.disabled=true; if(status)status.textContent='پەیامەکە دەنێردرێت…'; try{ await customerApi({method:'POST',body:{action:'chat_send',data:{thread_id:input.dataset.threadId||undefined,body}}}); input.value=''; delete input.dataset.threadId; if(status)status.textContent='پەیام بە سەرکەوتوویی نێردرا.'; await load(); }catch(error){if(status)status.textContent=error.message||'ناردنی پەیام سەرکەوتوو نەبوو.';}finally{if(button)button.disabled=false;} };
const renderNotifications = (items) => setHtml('notifications',
  items.length
    ? items.map((item) => {
      const isRead = Boolean(item.read_at);
      const action = typeof item.action_url === 'string' && (/^\//.test(item.action_url) || /^#/.test(item.action_url)) && !item.action_url.startsWith('//')
        ? item.action_url
        : '';
      const actionLabel = item.kind === 'warehouse_received' ? 'بینینی وێنە و بەڵگەی کۆگا' : 'بینینی بەشە پەیوەندیدارەکە';
      const receiptPhotos = Array.isArray(item.receipt_photos)
        ? item.receipt_photos.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)).slice(0, 4)
        : [];
      const receiptMetaItems = item.kind === 'warehouse_received' ? [
        ['GC Code', item.receipt_gc_code],
        ['کۆگا', item.receipt_location],
        ['کاتی وەرگرتن', item.receipt_received_at ? date(item.receipt_received_at) : date(item.created_at)],
        ['کارتۆن', Number(item.receipt_carton_count || (Array.isArray(item.receipt_cartons) ? item.receipt_cartons.length : 0)) || null],
        ['کێش', item.receipt_weight_kg !== null && item.receipt_weight_kg !== undefined && Number.isFinite(Number(item.receipt_weight_kg)) ? String(Number(item.receipt_weight_kg).toLocaleString('en-US', {maximumFractionDigits: 2})) + ' kg' : null],
        ['دۆخی بەڵگە', item.receipt_verification_status === 'verified' ? 'پشتڕاستکراوە' : item.receipt_verification_status],
      ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '') : [];
      const receiptMeta = receiptMetaItems.length
        ? '<div class="notification-receipt-meta" aria-label="وردەکاریی وەرگرتنی کاڵا">' + receiptMetaItems.map(([label, value]) => '<div class="notification-receipt-meta-item"><small>' + esc(label) + '</small><strong>' + esc(value) + '</strong></div>').join('') + '</div>'
        : '';
      const receiptPhotoPreview = item.kind === 'warehouse_received' && receiptPhotos.length
        ? `<div class="photo-grid notification-receipt-photo-grid" role="group" aria-label="وێنەکانی وەرگرتنی ${esc(item.receipt_gc_code || 'GC')}">${receiptPhotos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img class="receipt-photo" src="${esc(url)}" alt="${esc(item.receipt_gc_code || 'GC')} · وێنەی ${index + 1}" loading="lazy"></a>`).join('')}</div>`
        : '';
      return `<article class="item notification-item ${isRead ? 'is-read' : 'is-unread'}" data-notification-state="${isRead ? 'read' : 'unread'}">
        <div class="row notification-item-head"><strong>${esc(item.title)}</strong>${isRead ? '<span class="pill">خوێندراوە</span>' : `<button class="btn notification-action" type="button" data-read-notification="${esc(item.id)}">خوێندراوە بکە</button>`}</div>
        <div class="muted notification-body">${esc(item.body)}</div>
        ${receiptMeta}
        ${receiptPhotoPreview}
        <div class="row notification-item-foot"><small class="notification-time">${esc(date(item.created_at))}</small>${action ? `<a class="btn notification-open-action" href="${esc(action)}">${esc(actionLabel)} ↗</a>` : ''}</div>
      </article>`;
    }).join('')
    : emptyState(EMPTY.bell,'هیچ ئاگادارییەکی نوێ نییە','کاتێک update ـێکی shipment یان پەیامێک هەبێت، لێرە پیشان دەدرێت.')
);

const renderQuotes = (items) => {
  const html = items.map((item) => {
    const canAccept = item.status === 'quoted' && item.valid_until && new Date(item.valid_until) > new Date();
    return `<div class="item">
      <div class="row"><strong>${esc(item.origin_key)} → ${esc(item.dest_key)}</strong><span class="pill">${esc(item.status)}</span></div>
      <div class="muted">${esc(item.transport_mode)} · ${esc(item.weight_kg || 0)} kg · ${esc(item.volume_cbm || 0)} CBM</div>
      <div>${item.quoted_amount == null ? 'لەژێر پێداچوونەوە' : money(item.quoted_amount, item.currency)}</div>
      <small>${item.valid_until ? `کاریگەر تا ${esc(date(item.valid_until))}` : 'هێشتا نرخ دیاری نەکراوە'}</small>
      ${canAccept ? `<div class="actions"><button class="btn primary" type="button" data-accept-quote="${esc(item.id)}">پەسەندکردنی quote</button></div>` : ''}
    </div>`;
  }).join('');
  setHtml('quotes', html || emptyState(EMPTY.quote, 'هیچ داواکاریی نرخ نییە', 'لە بەشی “داواکاری نرخ” ـەوە دەتوانیت داواکارییەکی نوێ بنێریت.'));
};

const renderDocuments = (items) => {
  const html = items.map((item) => `<div class="item">
    <div class="row"><strong>${esc(item.title || item.document_type)}</strong><span class="pill">${item.is_public ? 'Public' : 'Private'}</span></div>
    <div class="muted">${esc(item.shipment_id)} · ${esc(item.document_status || 'uploaded')}</div>
    <small>${esc(date(item.created_at))}</small>
    ${item.file_url ? ` <a class="download" href="${esc(item.file_url)}" data-document-id="${esc(item.id)}" target="_blank" rel="noopener noreferrer" download>داگرتن</a>` : ''}
  </div>`).join('');
  setHtml('docs', html || emptyState(EMPTY.file, 'هیچ بەڵگەیەک نییە', 'کاتێک document ـێک بۆ shipment ـەکەت بڵاوکرایەوە، لێرە دەبینرێت.'));
};

const renderPods = (items) => {
  const html = items.map((item) => `<div class="item">
    <div class="row"><strong>${esc(item.shipment_id)}</strong><span class="pill">${item.delivered_at ? 'Delivered' : 'Pending'}</span></div>
    <div class="muted">${item.delivered_at ? `گەیەنراو ${esc(date(item.delivered_at))}` : 'لە چاوەڕوانیدایە'} · ${esc(item.receiver_name || '—')}</div>
    <small>${esc(item.note || '')}${Array.isArray(item.photo_urls) && item.photo_urls.length ? ` · ${item.photo_urls.length} وێنە` : ''}</small>
  </div>`).join('');
  setHtml('pods', html || emptyState(EMPTY.file, 'هیچ Proof of Delivery نییە', 'دوای گەیاندنی بار، بەڵگەی وەرگرتن لێرە دەردەکەوێت.'));
};

const renderReceipts = (items) => {
  const html = items.map((item) => {
    const photos = Array.isArray(item.photos) ? item.photos.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)) : [];
    const gc = item.gc_code_detected || item.gc_code || '—';
    const cartons = Math.max(1, Number(item.carton_count || 1));
    const weight = Number(item.weight_actual || 0);
    return `<article class="item warehouse-receipt-evidence" data-receipt-id="${esc(item.id)}">
      <div class="row"><strong>${esc(gc)} · ${esc(item.batch_code || 'Receipt')}</strong><span class="pill">${esc(item.verification_status || 'pending')}</span></div>
      <div class="muted">کۆگا: <b>${esc(item.location || item.source_warehouse || item.warehouse || '—')}</b> · ${esc(item.stage || 'received')} · وەرگیرا: ${esc(date(item.received_at || item.photo_taken_at))}</div>
      <div class="row"><small>کارتۆن: ${esc(cartons)} · کێش: ${weight > 0 ? esc(num(weight)) + ' kg' : '—'}</small><small>${esc(item.created_by_name || '')}</small></div>
      ${item.scan_code ? `<small>کۆدی سکەن: ${esc(item.scan_code)}</small>` : ''}
      ${item.notes ? `<small class="muted">${esc(item.notes)}</small>` : ''}
      <small>بەڵگەی وێنە: ${photos.length} دانە${item.photo_taken_at ? ' · وێنەگیراو: ' + esc(date(item.photo_taken_at)) : ''}</small>
      ${photos.length ? `<div class="photo-grid">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img class="receipt-photo" src="${esc(url)}" alt="بەڵگەی وەرگرتنی ${esc(gc)} · ${index + 1}" loading="lazy"></a>`).join('')}</div>` : '<small class="muted">وێنەی بەستراو بەردەست نییە؛ کونسۆڵی ستاف دەتوانێت بەڵگەکە بپشکنێت.</small>'}
    </article>`;
  }).join('');
  setHtml('receipts', html || emptyState(EMPTY.file, 'هێشتا warehouse evidence نییە', 'کاتێک بار لە کۆگا وەردەگیرێت، بەڵگە و وێنەکان لێرە دەردەکەون.'));
};

const renderPayments = (invoices, payments, customerTransactions = []) => {
  const invoiceRows = invoices.map((item) => {
    const due = Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0));
    const paymentAction = due > 0 && item.status !== 'paid'
      ? `<a class="btn primary payment-action" href="./payment-checkout.html?invoice_id=${encodeURIComponent(item.id)}">پارەدان</a>`
      : '';
    return `<div class="item">
      <div class="row"><strong>${esc(item.invoice_number)}</strong><span class="pill">${esc(item.status)}</span></div>
      <div class="muted">${esc(item.shipment_id)} · ${money(item.total, item.currency)}</div>
      <small>Paid: ${money(item.paid_total, item.currency)} · Due: ${money(due, item.currency)}</small>
      ${paymentAction ? `<div class="actions">${paymentAction}</div>` : ''}
    </div>`;
  });
  const paymentRows = payments.map((item) => `<div class="item">
    <div class="row"><strong>${money(item.amount, item.currency)}</strong><span class="pill">${esc(item.status)}</span></div>
    <div class="muted">${esc(item.provider)} · ${esc(item.method || '—')}</div>
    <small>${esc(date(item.paid_at || item.created_at))}</small>
  </div>`);
  const labels = {customer_charge:'قەرزی کڕیار',customer_payment:'پارەدانی کڕیار',refund:'گەڕاندنەوەی پارە',adjustment:'ڕێکخستنی باڵانس'};
  const customerRows = (customerTransactions || []).map((item) => {
    const sign = item.type === 'customer_charge' ? '+' : (item.type === 'customer_payment' || item.type === 'refund' ? '−' : '');
    return `<div class="item"><div class="row"><strong>${sign}${money(item.amount_usd, 'USD')}</strong><span class="pill">${esc(labels[item.type] || 'مامەڵە')}</span></div><div class="muted">${esc(item.reference || 'GC ' + (item.gc_code || ''))}</div><small>${esc(date(item.created_at))}</small></div>`;
  });
  setHtml('payments', invoiceRows.concat(paymentRows, customerRows).join('') || emptyState(EMPTY.money, 'هیچ مامەڵەیەکی دارایی نییە', 'لە کاتی دروستبوونی invoice یان payment، مێژووی مامەڵەکان لێرە دەردەکەوێت.'));
};

const totalsByCurrency = (items, amountKey) => items.reduce((out, item) => {
  const currency = String(item.currency || 'USD').toUpperCase();
  out[currency] = (out[currency] || 0) + Number(item[amountKey] || 0);
  return out;
}, {});

const formatBuckets = (buckets) => Object.entries(buckets).map(([currency, amount]) => money(amount, currency)).join(' · ') || '0';

const renderFinance = (invoices, payments, ledger) => {
  const billed = totalsByCurrency(invoices, 'total');
  const paid = totalsByCurrency(invoices, 'paid_total');
  const balance = Object.fromEntries(Object.keys({...billed, ...paid}).map((currency) => [
    currency,
    Math.max(0, Number(billed[currency] || 0) - Number(paid[currency] || 0))
  ]));
  const expenseRows = ledger.filter((item) => ['charge', 'adjustment'].includes(item.entry_type));
  const expenseTotals = totalsByCurrency(expenseRows, 'amount');

  // KPI tiles are optional in the unified workspace layout. Render finance records
  // even when an older shell does not include the four legacy summary elements.
  const billedKpi = $('billedKpi');
  const paidKpi = $('paidKpi');
  const balanceKpi = $('balanceKpi');
  const expenseKpi = $('expenseKpi');
  if (billedKpi) billedKpi.textContent = formatBuckets(billed);
  if (paidKpi) paidKpi.textContent = formatBuckets(paid);
  if (balanceKpi) balanceKpi.textContent = formatBuckets(balance);
  if (expenseKpi) expenseKpi.textContent = formatBuckets(expenseTotals);

  const invoiceHtml = invoices.map((item) => {
    const due = Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0));
    const action = due > 0 && item.status !== 'paid'
      ? `<a class="btn primary payment-action" href="./payment-checkout.html?invoice_id=${encodeURIComponent(item.id)}">پارەدان</a>`
      : '';
    return `<div class="item">
      <div class="row"><strong>${esc(item.invoice_number)}</strong><span class="pill">${esc(item.status)}</span></div>
      <div class="muted">${esc(item.shipment_id)} · ${money(item.total, item.currency)}</div>
      <small>دراو: ${money(item.paid_total, item.currency)} · ماوە: ${money(due, item.currency)}</small>
      ${action ? `<div class="actions">${action}</div>` : ''}
    </div>`;
  }).join('');
  const expenseHtml = expenseRows.map((item) => `<div class="item">
    <div class="row"><strong>${money(item.amount, item.currency)}</strong><span class="pill">${esc(item.entry_type)}</span></div>
    <div class="muted">${esc(item.shipment_id)}</div>
    <small>${esc(item.note || item.reference || 'خەرجیی تۆمارکراو')} · ${esc(date(item.created_at))}</small>
  </div>`).join('');

  setHtml('invoices', invoiceHtml || emptyState(EMPTY.file, 'هیچ invoice ـێک نییە', 'کاتێک invoice ـێک بۆ هەژمارەکەت دروست بکرێت، لێرە دەبینرێت.'));
  setHtml('expenses', expenseHtml || emptyState(EMPTY.money, 'هیچ خەرجییەکی تۆمارکراو نییە', 'خەرجییەکان کاتێک لە ledger تۆمار بکرێن لێرە دەردەکەون.'));
};

const renderShipmentDetail = (shipment, events, pods) => { const detail = $('shipmentDetail'); if (!detail || !shipment) return; $('detailTitle').textContent = shipment.id || 'Shipment'; $('detailRoute').textContent = `${shipment.origin_key || '—'} → ${shipment.dest_key || '—'}`; $('detailLocation').textContent = shipment.current_location_label || 'شوێنی ئێستا بەردەست نییە'; $('detailStatus').textContent = shipment.operational_status || 'لە پڕۆسەدایە'; $('detailUpdated').textContent = shipment.tracking_updated_at ? `نوێکراوەتەوە: ${date(shipment.tracking_updated_at)}` : `ETA: ${date(shipment.eta)}`; const lat = Number(shipment.current_lat), lng = Number(shipment.current_lng); const map = $('detailMap'); if (map && Number.isFinite(lat) && Number.isFinite(lng)) { map.href = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`; map.classList.remove('hidden'); } else if (map) { map.classList.add('hidden'); } const shipmentEvents = events.filter((event) => event.shipment_id === shipment.id); const proof = pods.find((item) => item.shipment_id === shipment.id); const media = [...shipmentEvents.flatMap((event) => Array.isArray(event.photos) ? event.photos : []), ...(proof && Array.isArray(proof.photo_urls) ? proof.photo_urls : [])].filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)); setHtml('detailPhotos', media.map((url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="وێنەی بار ${esc(shipment.id)}" loading="lazy"></a>`).join('') || '<div class="muted">هێشتا وێنەیەک بۆ ئەم بارە نییە.</div>'); setHtml('detailTimeline', shipmentEvents.map((event) => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(event.title || event.status_key || 'Shipment update')}</strong><div class="muted">${esc(event.location_label || '—')} · ${esc(date(event.occurred_at))}</div>${event.note ? `<small>${esc(event.note)}</small>` : ''}</div></div>`).join('') || '<div class="muted">مێژووی هەنگاوەکان بەردەست نییە.</div>'); detail.classList.remove('hidden'); detail.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

const renderShipmentRelated = (shipment, related = {}) => {
  if (!shipment) return;
  const byShipment = (key) => (Array.isArray(related[key]) ? related[key] : []).filter((item) => item.shipment_id === shipment.id);
  const packages = byShipment('packages');
  const documents = byShipment('documents');
  const invoices = byShipment('invoices');
  const payments = byShipment('payments');
  const receipts = byShipment('receipts');
  const pods = byShipment('pods');
  setHtml('detailPackages', packages.map((item) => `<div class="item"><div class="row"><strong>${esc(item.package_code || 'Package')}</strong><span class="pill">${esc(item.status || 'created')}</span></div><div class="muted">${esc(item.current_hub || '—')} · ${esc(item.package_type || 'carton')}</div><small>${item.weight_kg == null ? 'وزن بەردەست نییە' : `${esc(item.weight_kg)} kg`}${item.barcode ? ` · ${esc(item.barcode)}` : ''}</small></div>`).join('') || '<div class="muted">هیچ package ـێک بۆ ئەم shipment ـە نییە.</div>');
  setHtml('detailDocuments', documents.map((item) => `<div class="item"><div class="row"><strong>${esc(item.title || item.document_type || 'Document')}</strong><span class="pill">${esc(item.document_status || 'uploaded')}</span></div><small>${esc(date(item.created_at))}</small>${item.file_url ? ` <a class="download" href="${esc(item.file_url)}" data-document-id="${esc(item.id)}" target="_blank" rel="noopener noreferrer" download>داگرتن</a>` : ''}</div>`).join('') || '<div class="muted">هیچ document ـێکی ئەم shipment ـە نییە.</div>');
  const invoiceRows = invoices.map((item) => { const due = Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0)); return `<div class="item"><div class="row"><strong>${esc(item.invoice_number || 'Invoice')}</strong><span class="pill">${esc(item.status || 'pending')}</span></div><div class="muted">${money(item.total, item.currency)} · ماوە ${money(due, item.currency)}</div><small>${esc(date(item.due_at))}</small></div>`; });
  const paymentRows = payments.map((item) => `<div class="item"><div class="row"><strong>${money(item.amount, item.currency)}</strong><span class="pill">${esc(item.status || 'pending')}</span></div><small>${esc(item.provider || 'Payment')} · ${esc(date(item.paid_at || item.created_at))}</small></div>`);
  setHtml('detailFinance', [...invoiceRows, ...paymentRows].join('') || '<div class="muted">هیچ invoice یان payment ـێکی ئەم shipment ـە نییە.</div>');
  const receiptRows = receipts.map((item) => `<div class="item"><div class="row"><strong>${esc(item.batch_code || 'Warehouse receipt')}</strong><span class="pill">${esc(item.verification_status || item.stage || 'received')}</span></div><small>${esc(item.location || '—')} · ${esc(date(item.received_at))}</small></div>`);
  const podRows = pods.map((item) => `<div class="item"><div class="row"><strong>Proof of delivery</strong><span class="pill">${item.delivered_at ? 'Delivered' : 'Pending'}</span></div><small>${esc(item.receiver_name || '—')} · ${esc(date(item.delivered_at || item.created_at))}</small></div>`);
  setHtml('detailEvidence', [...receiptRows, ...podRows].join('') || '<div class="muted">هێشتا warehouse receipt یان POD نییە.</div>');
};

const load = async () => {
  const { data: sessionResult } = await sb.auth.getSession();
  const session = sessionResult.session;
  if (!session) {
    $('loginBtn').classList.remove('hidden');
    $('logoutBtn').classList.add('hidden');
    $('portalStatus')?.classList.remove('hidden');
    return;
  }
  $('loginBtn').classList.add('hidden');
  $('logoutBtn').classList.remove('hidden');
  $('portalStatus')?.classList.add('hidden');
  $('hello').textContent = 'بەخێربێیت بۆ ناوەندی کڕیار';
  const welcome = $('customerWelcome');
  if (welcome) {
    const displayName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
    welcome.textContent = displayName || session.user.email || 'Customer';
    welcome.title = session.user.email || '';
  }
  const dashboard = await customerApi();
  const rows = dashboard.shipments || [];
  const invoicesRows = dashboard.invoices || [];
  $('shipKpi').textContent = String(rows.length);
  $('movingKpi').textContent = String(rows.filter((item) => Number(item.current_step_index || 0) > 0 && Number(item.current_step_index || 0) < 5).length);
  const dueByCurrency = invoicesRows.reduce((out,item) => {
    const cur = String(item.currency || 'USD').toUpperCase();
    out[cur] = (out[cur] || 0) + Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0));
    return out;
  }, {});
  $('dueKpi').textContent = Object.entries(dueByCurrency).map(([cur,v]) => `${Number(v).toLocaleString('en-US',{maximumFractionDigits:2})} ${cur}`).join(' · ') || '0 USD';
  $('notifKpi').textContent = (dashboard.notifications || []).filter((item) => !item.read_at).length;
  renderCustomerIdentity(dashboard.profile); renderWarehouseAddresses(dashboard.warehouse_addresses || []); renderShipments(rows, dashboard.cargo_items || []); renderNotifications(dashboard.notifications || []); renderCustomerChat(dashboard.chat_threads || []); renderQuotes(dashboard.quotes || []); renderDocuments(dashboard.documents || []); renderPods(dashboard.pods || []); renderReceipts(dashboard.receipts || []); renderPayments(invoicesRows, dashboard.payments || [], dashboard.customer_transactions || []); renderFinance(invoicesRows, dashboard.payments || [], dashboard.ledger || []);
  window.__customerShipments = rows; window.__customerQuotes = dashboard.quotes || []; window.__customerNotifications = dashboard.notifications || []; window.__customerEvents = dashboard.events || []; window.__customerPods = dashboard.pods || []; window.__customerRelated = { packages: dashboard.packages || [], documents: dashboard.documents || [], invoices: dashboard.invoices || [], payments: dashboard.payments || [], receipts: dashboard.receipts || [], pods: dashboard.pods || [] }; window.dispatchEvent(new CustomEvent('gc:customer-loaded', { detail: dashboard }));
  window.gcCustomerReload = () => load().catch((error) => console.warn('[gc-realtime] customer reload', error));
};

const submitQuote = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton?.disabled) return;
  const { data: userResult } = await sb.auth.getUser();
  const user = userResult.user;
  if (!user) { showMessage('تکایە سەرەتا login بکە', 'error'); return; }
  syncQuoteMeasurements();
  if (!form.reportValidity()) return;
  const transportMode = $('quoteMode').value;
  const readOptionalNumber = (id) => {
    const raw = String($(id)?.value ?? '').trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : Number.NaN;
  };
  const weight = readOptionalNumber('quoteWeight');
  const volume = readOptionalNumber('quoteVolume');
  const quantityValid = transportMode === 'sea'
    ? Number.isFinite(volume) && volume > 0
    : Number.isFinite(weight) && weight > 0;
  if (!quantityValid) {
    showMessage(transportMode === 'sea' ? 'بۆ بارە دەریاییەکان قەبارەی CBM پڕبکەرەوە.' : 'کێشی بار دەبێت لە سفر زیاتر بێت.', 'error');
    (transportMode === 'sea' ? $('quoteVolume') : $('quoteWeight'))?.focus();
    return;
  }
  if (submitButton) { submitButton.disabled = true; submitButton.setAttribute('aria-busy', 'true'); submitButton.dataset.originalLabel = submitButton.textContent; submitButton.textContent = 'لە ناردندایە…'; }
  showMessage('داواکاری نێردراوە…');
  const payload = {
    customer_user_id: user.id,
    customer_name: user.user_metadata?.full_name || user.email || 'Customer',
    customer_phone: user.phone || null,
    origin_key: $('quoteOrigin').value.trim(),
    dest_key: $('quoteDestination').value.trim(),
    transport_mode: transportMode,
    weight_kg: weight,
    volume_cbm: volume,
    items_count: Number($('quoteItems').value || 0) || null,
    service_level: $('quoteService').value,
    incoterm: $('quoteIncoterm').value,
    notes: $('quoteNotes').value.trim() || null,
    status: 'pending',
  };
  try {
    const result = await customerApi({ method: 'POST', body: { action: 'request_quote', data: payload } });
    showMessage(`سەرکەوتوو بوو؛ ژمارەی داواکاری ${String(result.request?.id || '').slice(0, 8).toUpperCase()} ـە.`, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
    if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); submitButton.textContent = submitButton.dataset.originalLabel || 'ناردنی داواکاری نرخ'; }
    return;
  }
  form.reset();
  syncQuoteMeasurements();
  if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); submitButton.textContent = submitButton.dataset.originalLabel || 'ناردنی داواکاری نرخ'; }
  await load();
};

const downloadDocument = async (link) => {
  const documentId = link.dataset.documentId;
  if (!documentId) return;
  const { data: sessionResult } = await sb.auth.getSession();
  const token = sessionResult.session?.access_token;
  if (!token) return;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/document-access?document_id=${encodeURIComponent(documentId)}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (response.ok && body.url) { link.href = body.url; return; }
  throw new Error(body.error || 'Document access failed');
};

const markNotificationRead = async (notificationId) => {
  const { data: userResult } = await sb.auth.getUser();
  if (!userResult.user || !notificationId) return;
  try { await customerApi({ method: 'POST', body: { action: 'mark_notification_read', data: { id: notificationId } } }); }
  catch (error) { showMessage(error.message, 'error'); return; }
  await load();
};

const acceptQuote = async (quoteId) => {
  const { data: userResult } = await sb.auth.getUser();
  if (!userResult.user) return;
  try { await customerApi({ method: 'POST', body: { action: 'accept_quote', data: { id: quoteId } } }); }
  catch (error) { showMessage(error.message, 'error'); return; }
  showMessage('Quote پەسەندکرا.', 'success'); await load();
};

$('loginBtn').addEventListener('click', () => { $('auth').classList.remove('hidden'); $('email')?.focus(); });
$('loginPromptBtn')?.addEventListener('click', () => { $('auth').classList.remove('hidden'); $('email')?.focus(); });
$('close').addEventListener('click', () => { $('auth').classList.add('hidden'); $('loginBtn')?.focus(); });
$('auth').addEventListener('click', (event) => { if (event.target === $('auth')) $('close').click(); });
$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const identifier = $('email').value.trim();
  const password = $('password').value;
  const button = $('signIn');
  const msg = $('msg');
  if (!identifier || !password) { msg.textContent = 'کۆدی GC یان ئیمەیل و وشەی نهێنی پڕبکەرەوە.'; return; }
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  msg.textContent = 'چوونەژوورەوە پشتڕاست دەکرێتەوە…';
  try {
    if (identifier.includes('@')) {
      const result = await sb.auth.signInWithPassword({ email: identifier, password });
      if (result.error) throw result.error;
    } else {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-gc-login`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: identifier, gc_code: identifier, password }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.session?.access_token || !payload.session?.refresh_token) {
        throw new Error(payload.error || 'چوونەژوورەوە سەرکەوتوو نەبوو.');
      }
      const sessionResult = await sb.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (sessionResult.error) throw sessionResult.error;
    }
    msg.textContent = 'چوونەژوورەوە سەرکەوتوو بوو.';
    $('auth').classList.add('hidden');
    // Enter the private workspace as soon as Auth issues a session. Data loading
    // errors must not send the customer back to the login/home screen.
    if (window.location.hash !== '#overview') window.location.hash = '#overview';
    if (typeof window.gcEnterCustomerMode === 'function') window.gcEnterCustomerMode({showAuth:false});
    document.body.classList.add('gc-customer-app');
    $('loginBtn')?.focus();
    try {
      await load();
    } catch (loadError) {
      console.error('[gc-customer] signed in but dashboard data failed to load', loadError);
      const status = $('portalStatus');
      const accountLinkRequired = Number(loadError?.status) === 403;
      const supportLink = 'https://wa.me/9647507577137';
      if (status) {
        status.classList.remove('hidden');
        if (accountLinkRequired) {
          status.innerHTML = '<strong>هەژماری کڕیار پێویستی بە پشتڕاستکردنەوە هەیە</strong><span>چوونەژوورەوە سەرکەوتوو بوو، بەڵام ئەم هەژمارە بە هەژماری کڕیار/کۆدی GC پەیوەست نەکراوە یان چالاک نییە. بۆ پاراستنی زانیارییەکانت، تا پشتڕاستکردنەوەی ستاف بارەکان و داتاکانی هەژمار نیشان نادرێن.</span><a class="app-secondary-action gc-account-help-action" href="' + supportLink + '" target="_blank" rel="noopener noreferrer">پەیوەندی بە پشتیوانی Globall Cloud لە WhatsApp ↗</a>';
        } else {
          status.textContent = 'چوونەژوورەوە سەرکەوتوو بوو، بەڵام بارکردنی داتای کونسۆڵ سەرکەوتوو نەبوو. تکایە refresh بکە یان پەیوەندی بە پشتیوانی بکە.';
        }
      }
      if (accountLinkRequired) {
        setHtml('notifications', '<div class="alert"><strong>پێویستە هەژمارەکەت پشتڕاست بکرێتەوە.</strong><p>تکایە GC Code ـەکەت بە تیمی پشتیوانی بدە تا بەستەری هەژمار و چالاکبوونی کڕیار بپشکنن.</p><a href="' + supportLink + '" target="_blank" rel="noopener noreferrer">پەیوەندی بە پشتیوانی لە WhatsApp ↗</a></div>');
      } else {
        setHtml('notifications', '<div class="alert">هەژمارەکەت چووەتە ژوورەوە؛ بەڵام داتاکانی کونسۆڵ نەهاتن. تکایە جارێکی تر refresh بکەرەوە.</div>');
      }
    }
  } catch (error) {
    const raw = String(error?.message || error || '');
    msg.textContent = /invalid login credentials|invalid gc code or password/i.test(raw)
      ? 'کۆدی GC یان ئیمەیڵ یان وشەی نهێنی هەڵەیە؛ دڵنیابە کۆد و وشەی نهێنی دروستن.'
      : /too many login attempts|rate limit/i.test(raw)
        ? 'زۆر هەوڵی چوونەژوورەوەت داوە؛ تکایە ١٠ خولەک چاوەڕێ بکە پاشان جارێکی تر هەوڵ بدەوە.'
        : /account is not ready/i.test(raw)
          ? 'هەژماری GC ـەکەت هێشتا بە تەواوی ئامادە نییە؛ تکایە پەیوەندی بە ستافی Globall Cloud بکە.'
          : /failed to fetch|networkerror|load failed/i.test(raw)
            ? 'پەیوەندی ئینتەرنێت یان سێرڤەر کێشەی هەیە؛ ئینتەرنێتەکەت بپشکنە و دواتر هەوڵ بدەوە.'
            : raw || 'چوونەژوورەوە سەرکەوتوو نەبوو.';
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('auth').classList.contains('hidden')) $('close').click(); });
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('/#auth'); });
$('trackBtn')?.addEventListener('click', () => { location.href = '/#shipmentsSection'; });
$('quoteBtn')?.addEventListener('click', () => { $('quoteForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('quoteOrigin')?.focus(); });
$('quoteMode')?.addEventListener('change', syncQuoteMeasurements);
syncQuoteMeasurements();
$('quoteForm').addEventListener('submit', (event) => submitQuote(event).catch((error) => showMessage(error.message, 'error')));
$('customerChatForm')?.addEventListener('submit', sendCustomerChat);
$('closeShipmentDetail')?.addEventListener('click', () => $('shipmentDetail')?.classList.add('hidden'));
document.addEventListener('click', (event) => { const shipmentCard = event.target.closest('[data-shipment-id]'); if (shipmentCard) { const shipment = (window.__customerShipments || []).find((item) => item.id === shipmentCard.dataset.shipmentId); renderShipmentDetail(shipment, window.__customerEvents || [], window.__customerPods || []); renderShipmentRelated(shipment, window.__customerRelated || {}); } });
document.addEventListener('click', (event) => { const notificationButton = event.target.closest('[data-read-notification]'); if (notificationButton) { notificationButton.disabled = true; markNotificationRead(notificationButton.dataset.readNotification).catch((error) => { notificationButton.disabled = false; showMessage(error.message, 'error'); }); return; } const documentLink = event.target.closest('[data-document-id]'); if (documentLink) { event.preventDefault(); downloadDocument(documentLink).then(() => window.open(documentLink.href, '_blank', 'noopener,noreferrer')).catch((error) => showMessage(error.message, 'error')); return; } const button = event.target.closest('[data-accept-quote]'); if (button) acceptQuote(button.dataset.acceptQuote).catch((error) => showMessage(error.message, 'error')); });
sb.auth.onAuthStateChange(() => window.setTimeout(() => load().catch((error) => showMessage(error.message, 'error')), 100));
load().catch((error) => {
  console.error(error);
  if (Number(error?.status) === 403) {
    $('portalStatus')?.classList.remove('hidden');
    renderClaimPrompt();
    $('shipKpi').textContent = '—';
    $('movingKpi').textContent = '—';
    $('dueKpi').textContent = '—';
    $('notifKpi').textContent = '—';
    return;
  }
  $('portalStatus')?.classList.remove('hidden');
  setHtml('notifications', '<div class="alert">هەڵە لە هێنانی داتا؛ تکایە دواتر هەوڵ بدەرەوە.</div>');
});
