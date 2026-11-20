/* Globall Cloud — production invoice workflow with selectable themes. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const API = `${SUPABASE_URL}/functions/v1/logistics-control-plane`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value, currency = 'USD') => `${n(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const authClient = () => window.gcSupabase || window.sb || null;
  const session = async () => {
    const client = authClient();
    if (!client?.auth?.getSession) throw new Error('Staff session ـی بەردەست نییە؛ تکایە دووبارە بچۆ ژوورەوە.');
    return (await client.auth.getSession())?.data?.session || null;
  };

  const request = async (url, options = {}) => {
    const current = await session();
    if (!current?.access_token) throw new Error('تکایە دووبارە بچۆ ژوورەوەی Staff Console.');
    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${current.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Invoice HTTP ${response.status}`);
    return result;
  };
  const get = (url) => request(url);
  const post = async (action, data) => {
    const result = await request(API, { method: 'POST', body: JSON.stringify({ action, data }) });
    return result.item || result;
  };

  const styles = `
    @page { size: A4; margin: 0; }
    :root { --navy:#0b2748; --navy2:#123b62; --teal:#0bb4ad; --gold:#e1b52b; --ink:#14243a; --muted:#6a7787; --line:#d8e2ea; --paper:#f5f9fc; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,"Noto Sans",Arial,sans-serif; }
    .invoice { width:210mm; min-height:297mm; margin:0 auto; background:var(--paper); overflow:hidden; }
    .invoice-header { min-height:52mm; padding:10mm 14mm 8mm; background:linear-gradient(120deg,var(--navy),var(--navy2)); color:#fff; position:relative; overflow:hidden; }
    .invoice-header:after { content:""; position:absolute; width:70mm; height:70mm; right:-25mm; top:-43mm; border-radius:50%; background:rgba(11,180,173,.16); }
    .brand { display:flex; align-items:center; gap:5mm; position:relative; z-index:1; }
    .brand img { width:22mm; height:22mm; border-radius:50%; background:#fff; object-fit:cover; }
    .brand h1 { margin:0; font-size:9mm; line-height:1; letter-spacing:.4px; }
    .brand p { margin:2.5mm 0 0; color:#c6dfeb; font-size:3mm; font-weight:700; letter-spacing:.45px; }
    .brand small { display:block; margin-top:1.5mm; color:#d6e9ef; font-size:2.7mm; }
    .invoice-badge { position:absolute; z-index:2; right:14mm; top:9mm; width:44mm; padding:5mm; text-align:center; color:var(--navy); background:#fff; border-radius:3mm; box-shadow:0 5px 18px rgba(0,0,0,.16); }
    .invoice-badge b { display:block; font-size:4mm; letter-spacing:1px; }
    .invoice-badge strong { display:block; margin-top:1.8mm; color:var(--teal); font-size:4mm; }
    .invoice-badge span { display:block; margin-top:1.5mm; color:var(--muted); font-size:2.5mm; }
    .accent { height:1mm; background:linear-gradient(90deg,var(--gold),#ff9e5a,var(--teal)); }
    .body { padding:6mm 14mm 9mm; }
    .contact { padding-bottom:5mm; color:var(--navy); font-size:2.9mm; font-weight:750; }
    .contact span:not(:last-child):after { content:"•"; margin:0 3.5mm; color:var(--teal); }
    .card { background:#fff; border:1px solid var(--line); border-radius:3mm; box-shadow:0 3px 12px rgba(16,40,68,.06); }
    .customer { display:grid; grid-template-columns:1.1fr 2fr; gap:5mm; padding:5mm; align-items:center; }
    .label { color:var(--teal); text-transform:uppercase; letter-spacing:.6px; font-size:2.8mm; font-weight:850; }
    .bill h2 { margin:2mm 0 2.5mm; color:var(--navy); font-size:6mm; }
    .bill p { margin:0; color:var(--muted); font-size:2.8mm; }
    .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; }
    .meta-box { min-height:20mm; padding:3.5mm 2.5mm; text-align:center; background:#f1f7fa; border:1px solid #dbe7ed; border-radius:2mm; }
    .meta-box label,.meta-box em { display:block; color:var(--muted); font-size:2.6mm; font-weight:750; }
    .meta-box em { margin-top:1mm; color:var(--teal); font-style:normal; }
    .meta-box strong { display:block; margin-top:2mm; color:var(--ink); font-size:3.5mm; }
    .status { display:flex; justify-content:space-between; margin-top:4mm; padding:3.5mm 5mm; border-radius:2.5mm; background:linear-gradient(100deg,var(--navy),#183c62); color:#fff; font-size:3mm; font-weight:850; }
    .status .total { color:var(--gold); }
    .items { margin-top:4mm; overflow:hidden; }
    .items-head,.item-row { display:grid; grid-template-columns:2fr .8fr .9fr 1fr .9fr; align-items:center; }
    .items-head { padding:3.5mm 4mm; border-radius:2.5mm 2.5mm 0 0; background:var(--navy); color:#fff; font-size:2.8mm; font-weight:850; }
    .items-head small { display:block; margin-top:1mm; color:var(--gold); font-size:2.4mm; }
    .item-row { min-height:14mm; padding:4mm; border:1px solid var(--line); border-top:0; background:#fff; font-size:3.2mm; }
    .item-row .item { border-left:2mm solid var(--teal); margin-left:-4mm; padding-left:4mm; font-weight:850; }
    .item-row .muted { color:var(--muted); }
    .item-row .amount { color:var(--navy); font-weight:850; }
    .financial { display:grid; grid-template-columns:1fr 1.05fr; gap:7mm; margin-top:6mm; padding:5mm; }
    .payment { padding-right:4mm; border-right:1px solid var(--line); }
    .payment .paid { margin:5mm 0 4mm; color:var(--navy); font-size:5mm; font-weight:900; }
    .mini { color:var(--muted); font-size:2.8mm; line-height:1.55; }
    .balance { display:inline-block; padding:3mm 4mm; border-radius:2mm; background:linear-gradient(100deg,var(--teal),#088fb8); color:#fff; font-size:2.7mm; font-weight:850; }
    .summary .sumline { display:flex; justify-content:space-between; padding:1.8mm 0; color:var(--muted); font-size:2.9mm; font-weight:750; }
    .summary .sumline b { color:var(--ink); font-size:3.3mm; }
    .summary .total-line { margin-top:2mm; padding:4mm; border-radius:2mm; background:linear-gradient(100deg,var(--navy),#183c62); color:#fff; }
    .summary .total-line b { color:#fff; font-size:5mm; }
    .bottom { display:grid; grid-template-columns:1.05fr 1fr; gap:5mm; margin-top:5mm; }
    .bottom .card { min-height:17mm; padding:4mm; }
    .iqd { margin-top:1.5mm; color:var(--navy); font-size:4mm; font-weight:900; }
    .signature { color:var(--muted); font-size:2.7mm; }
    .sigline { margin-top:6mm; border-bottom:1px solid #b9c8cf; }
    .footer { margin-top:5mm; padding-top:4mm; border-top:1px solid var(--line); color:var(--muted); font-size:2.6mm; }
    .footer strong { color:var(--navy); font-size:2.9mm; }
    .thanks { margin-top:2mm; color:var(--teal); font-weight:850; }
    .theme-dark { --navy:#071426; --navy2:#122554; --teal:#19e6d2; --gold:#ffd45a; --ink:#f2f8ff; --muted:#a5b7c9; --line:#294563; --paper:#091523; }
    .theme-dark .card,.theme-dark .item-row { background:#10263c; }
    .theme-dark .meta-box { background:#142d3d; border-color:#3e6384; }
    .theme-dark .bill h2,.theme-dark .item-row .amount,.theme-dark .payment .paid,.theme-dark .iqd,.theme-dark .summary .sumline b,.theme-dark .footer strong { color:#f2f8ff; }
    .theme-dark .contact { color:#dcecff; }
    .theme-gold { --navy:#111; --navy2:#26231d; --teal:#c7a44a; --gold:#e4bf5b; --ink:#f4efe3; --muted:#b8b0a0; --line:#4a4130; --paper:#151515; }
    .theme-gold .card,.theme-gold .item-row { background:#1a1a18; }
    .theme-gold .meta-box { background:#172a3a; border-color:#675832; }
    .theme-gold .bill h2,.theme-gold .item-row .amount,.theme-gold .payment .paid,.theme-gold .iqd,.theme-gold .summary .sumline b,.theme-gold .footer strong { color:#f4efe3; }
    .theme-sky { --navy:#28546b; --navy2:#6d9db0; --teal:#52b7a4; --gold:#a9a35c; --ink:#294253; --muted:#718590; --line:#d4e5e6; --paper:#f8fcfc; }
    .theme-sky .invoice-header { background:linear-gradient(120deg,#dff0f5,#e8f4ef); color:var(--navy); }
    .theme-sky .brand h1 { color:var(--navy); }.theme-sky .brand p,.theme-sky .brand small { color:#527386; }
    .theme-sky .card,.theme-sky .item-row { background:#fff; }.theme-sky .meta-box { background:#eff8f5; }
    @media print { body { background:var(--paper); } .invoice { margin:0; } }
  `;

  const openModal = (body, footer) => {
    document.getElementById('gcInvoiceModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'gcInvoiceModal';
    modal.className = 'gc-invoice-modal';
    modal.innerHTML = `<div class="gc-invoice-modal-card"><div class="gc-invoice-modal-head"><div><span>GLOBALL CLOUD · FINANCE</span><h2>دروستکردنی Invoice</h2></div><button type="button" data-invoice-close>×</button></div>${body}<div class="gc-invoice-modal-foot">${footer}</div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-invoice-close]')) modal.remove(); });
    return modal;
  };

  const line = () => `<div class="gc-invoice-line" data-invoice-line><input name="description" placeholder="Item / Description" aria-label="Item / Description"><input name="quantity" type="number" min="0" step="0.01" value="1" placeholder="Qty"><input name="basis" placeholder="Basis" aria-label="Basis"><input name="unit_price" type="number" min="0" step="0.01" value="0" placeholder="Unit price"><output data-line-amount>0.00</output><button type="button" data-remove-line aria-label="Remove">×</button></div>`;

  const printInvoice = (data) => {
    const theme = data.theme || 'modern';
    const currency = esc(data.currency || 'USD');
    const paid = n(data.paid_total);
    const total = n(data.total);
    const status = paid >= total && total > 0 ? 'PAID' : paid > 0 ? 'PARTIALLY PAID' : 'ISSUED';
    const items = (data.line_items || []).map((item) => `<div class="item-row"><div class="item">${esc(item.description || '')}</div><div>${esc(item.quantity || '')} ${esc(item.unit || '')}</div><div class="muted">${esc(item.basis || '')}</div><div>${money(item.unit_price, currency)}</div><div class="amount">${money(item.amount, currency)}</div></div>`).join('');
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { alert('Popup ـەکە ڕێگەپێنەدراوە؛ تکایە popup چالاک بکە.'); return; }
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(data.invoice_number || 'Invoice')}</title><style>${styles}</style></head><body><main class="invoice ${theme === 'dark' ? 'theme-dark' : theme === 'gold' ? 'theme-gold' : theme === 'sky' ? 'theme-sky' : ''}"><header class="invoice-header"><div class="brand"><img src="/logo-icon.png" alt="Global Cloud logo"><div><h1>GLOBAL CLOUD</h1><p>GLOBAL LOGISTICS • FOR GENERAL TRADING</p><small>IMPORT &amp; EXPORT • ERBIL</small></div></div><div class="invoice-badge"><b>INVOICE</b><strong>${esc(data.invoice_number || '')}</strong><span>Receipt • ${esc(data.receipt_no || '—')}</span></div></header><div class="accent"></div><section class="body"><div class="contact"><span>0772 944 1884</span><span>0750 768 1884</span><span>0750 429 1341</span><span>globallcloud@gmail.com</span></div><section class="card customer"><div class="bill"><div class="label">Bill to / کڕیار</div><h2>${esc(data.bill_to_name || '—')}</h2><p>Shipment: ${esc(data.shipment_id || '—')} • Address: ${esc(data.bill_to_address || '—')}</p></div><div class="meta"><div class="meta-box"><label>Invoice Date</label><em>بەرواری فاتورە</em><strong>${esc(data.invoice_date || '—')}</strong></div><div class="meta-box"><label>Due Date</label><em>بەرواری پارەدان</em><strong>${esc(data.due_at || '—')}</strong></div><div class="meta-box"><label>Status</label><em>دۆخ</em><strong>${status}</strong></div></div></section><div class="status"><span>${status} • ${esc(data.payment_method || 'Payment pending')}</span><span class="total">TOTAL ${currency} • ${money(total, currency)}</span></div><section class="card items"><div class="items-head"><div>ITEM<small>جۆری کاڵا</small></div><div>QUANTITY<small>کێش</small></div><div>BASIS<small>بنەما</small></div><div>UNIT PRICE<small>نرخی یەکە</small></div><div>AMOUNT<small>بڕی پارە</small></div></div>${items || '<div class="item-row"><div class="item">—</div><div>—</div><div>—</div><div>—</div><div class="amount">—</div></div>'}</section><section class="card financial"><div class="payment"><div class="label">Payment / پارەدان</div><div class="mini">Amount Paid / پارەی دراو</div><div class="paid">${money(paid, currency)}</div><span class="balance">BALANCE • ${money(Math.max(0,total-paid), currency)}</span></div><div class="summary"><div class="sumline"><span>SUBTOTAL</span><b>${money(data.subtotal, currency)}</b></div><div class="sumline"><span>DISCOUNT</span><b>${money(data.discount, currency)}</b></div><div class="sumline"><span>ADDITIONAL</span><b>${money(data.additional_charges, currency)}</b></div><div class="sumline total-line"><span>TOTAL ${currency}</span><b>${money(total, currency)}</b></div></div></section><section class="bottom"><div class="card"><div class="label">TOTAL IN IQD</div><div class="iqd">${n(data.total_iqd) ? `${n(data.total_iqd).toLocaleString('en-US')} IQD` : '—'}</div></div><div class="card signature">Customer Signature / واژووی کڕیار<div class="sigline"></div></div></section><footer class="footer"><strong>GLOBAL CLOUD • ERBIL - HAWLERI NWE, NEXT TO GASHA INSTITUTE</strong><br>Hawler - Hawleri Nwe, Tanisht Paymangay Gasha • globalcloud@gmail.com<div class="thanks">Thank you for your business with Globall Cloud.</div></footer></section></main><script>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  };

  const open = () => {
    const modal = openModal(`<form id="gcInvoiceForm" class="gc-invoice-form"><div class="gc-invoice-grid"><label>Invoice number<input name="invoice_number" required value="INV/${new Date().getFullYear()}/"></label><label>Shipment ID<input name="shipment_id" required placeholder="GC-338"></label><label>Invoice date<input name="invoice_date" type="date" value="${today()}"></label><label>Due date<input name="due_at" type="date"></label><label>Receipt No.<input name="receipt_no" placeholder="Receipt reference"></label><label>Currency<select name="currency"><option>USD</option><option>IQD</option><option>AED</option><option>CNY</option><option>EUR</option></select></label><label>Bill to / Customer<input name="bill_to_name" placeholder="Customer name"></label><label>Shipping address<input name="bill_to_address" placeholder="Address"></label><label>Invoice design<select name="theme"><option value="modern">Modern Formal</option><option value="light">Light Simple</option><option value="dark">Dark Vivid</option><option value="sky">Sky &amp; Mint</option><option value="gold">Classic Black &amp; Gold</option></select></label></div><div class="gc-invoice-lines-head"><strong>ITEM / DESCRIPTION</strong><strong>QTY</strong><strong>BASIS</strong><strong>UNIT PRICE</strong><strong>AMOUNT</strong><span></span></div><div id="gcInvoiceLines">${line()}</div><button type="button" class="btn" id="gcAddInvoiceLine">+ زیادکردنی item</button><div class="gc-invoice-totals"><label>Subtotal<input name="subtotal" type="number" step="0.01" value="0" readonly></label><label>Discount<input name="discount" type="number" min="0" step="0.01" value="0"></label><label>Additional charges<input name="additional_charges" type="number" min="0" step="0.01" value="0"></label><label>Amount paid<input name="amount_paid" type="number" min="0" step="0.01" value="0"></label><strong>Total <output id="gcInvoiceTotal">0.00</output></strong></div><div class="gc-invoice-grid"><label>Payment method / Notes<textarea name="payment_method" rows="2" placeholder="Cash, bank transfer, QiCard…"></textarea></label><label>Internal notes<textarea name="notes" rows="2" placeholder="Notes"></textarea></label></div><p id="gcInvoiceMsg" class="gc-invoice-msg" role="status"></p></form>`, '<button type="button" class="btn" data-invoice-close>هەڵوەشاندنەوە</button><button type="button" class="btn primary" id="gcSaveInvoice">پاشەکەوتکردن و چاپکردن</button>');
    const form = modal.querySelector('#gcInvoiceForm');
    const lines = modal.querySelector('#gcInvoiceLines');
    const calc = () => { let subtotal = 0; lines.querySelectorAll('[data-invoice-line]').forEach((row) => { const amount = n(row.querySelector('[name=quantity]').value) * n(row.querySelector('[name=unit_price]').value); subtotal += amount; row.querySelector('[data-line-amount]').textContent = amount.toFixed(2); }); form.elements.subtotal.value = subtotal.toFixed(2); const total = Math.max(0, subtotal - n(form.elements.discount.value) + n(form.elements.additional_charges.value)); modal.querySelector('#gcInvoiceTotal').textContent = total.toFixed(2); return { subtotal, total }; };
    form.addEventListener('input', calc);
    modal.querySelector('#gcAddInvoiceLine').onclick = () => { lines.insertAdjacentHTML('beforeend', line()); calc(); };
    lines.addEventListener('click', (event) => { if (event.target.closest('[data-remove-line]')) { event.target.closest('[data-invoice-line]').remove(); calc(); } });
    calc();
    modal.querySelector('#gcSaveInvoice').onclick = async () => {
      const button = modal.querySelector('#gcSaveInvoice'); const message = modal.querySelector('#gcInvoiceMsg'); button.disabled = true; message.textContent = 'خەریکی پاشەکەوتکردنە…';
      try {
        const { subtotal, total } = calc(); const formData = new FormData(form);
        const items = [...lines.querySelectorAll('[data-invoice-line]')].map((row) => ({ description: row.querySelector('[name=description]').value.trim(), quantity: n(row.querySelector('[name=quantity]').value), basis: row.querySelector('[name=basis]').value.trim(), unit_price: n(row.querySelector('[name=unit_price]').value), amount: n(row.querySelector('[data-line-amount]').textContent) })).filter((item) => item.description || item.amount);
        const data = { invoice_number: formData.get('invoice_number'), shipment_id: formData.get('shipment_id'), invoice_date: formData.get('invoice_date') || today(), due_at: formData.get('due_at') || null, receipt_no: formData.get('receipt_no'), bill_to_name: formData.get('bill_to_name'), bill_to_address: formData.get('bill_to_address'), currency: formData.get('currency'), payment_method: formData.get('payment_method'), notes: formData.get('notes'), line_items: items, subtotal, discount: n(formData.get('discount')), additional_charges: n(formData.get('additional_charges')), tax: 0, status: 'issued' };
        const invoice = await post('upsert_invoice', data); const paid = n(formData.get('amount_paid'));
        if (paid > 0 && invoice?.id) await post('record_payment', { invoice_id: invoice.id, amount: paid, transaction_type: 'payment', status: 'succeeded', provider: 'manual', method: formData.get('payment_method') || 'manual', idempotency_key: `invoice-${invoice.id}-${Date.now()}` });
        message.textContent = 'Invoice پاشەکەوت کرا و ئامادەی چاپە.'; printInvoice({ ...data, ...invoice, paid_total: paid, total, theme: formData.get('theme') });
      } catch (error) { message.textContent = error.message || 'Invoice دروست نەکرا.'; button.disabled = false; }
    };
  };

  const mount = () => { const view = document.getElementById('view'); if (!view || !/FINANCE CONTROL|دارایی/.test(view.textContent) || document.getElementById('gcInvoiceTemplateBtn')) return; const actions = view.querySelector('.section-head .actions'); if (!actions) return; const button = document.createElement('button'); button.id = 'gcInvoiceTemplateBtn'; button.className = 'btn primary'; button.textContent = '+ Invoice ـی نوێ'; button.onclick = open; actions.prepend(button); };
  new MutationObserver(mount).observe(document.body, { subtree: true, childList: true });
  setInterval(mount, 1200);
  mount();
})();
