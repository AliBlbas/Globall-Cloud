const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const setHtml = (id, html) => { const element = $(id); if (element) element.innerHTML = html; };
const money = (amount, currency = 'USD') => `${Number(amount || 0).toLocaleString('en-US')} ${esc(currency)}`;
const date = (value) => value ? new Date(value).toLocaleString() : '—';
const showMessage = (message, kind = 'muted') => { $('quoteMessage').textContent = message; $('quoteMessage').className = kind; };

const renderShipments = (items) => setHtml('shipments', items.map((item) => `<div class="item"><div class="row"><strong>${esc(item.id)}</strong><span class="pill">${esc(item.operational_status || item.current_step_index || 0)}</span></div><div class="muted">${esc(item.origin_key)} → ${esc(item.dest_key)}</div><small>${esc(item.current_location_label || '—')} · ETA ${esc(date(item.eta))}</small></div>`).join('') || '<div class="muted">هیچ shipment نییە.</div>');
const renderNotifications = (items) => setHtml('notifications', items.map((item) => `<div class="item"><strong>${esc(item.title)}</strong><div class="muted">${esc(item.body)}</div><small>${esc(date(item.created_at))}</small></div>`).join('') || '<div class="muted">هیچ notification نییە.</div>');
const renderQuotes = (items) => setHtml('quotes', items.map((item) => {
  const canAccept = item.status === 'quoted' && item.valid_until && new Date(item.valid_until) > new Date();
  return `<div class="item"><div class="row"><strong>${esc(item.origin_key)} → ${esc(item.dest_key)}</strong><span class="pill">${esc(item.status)}</span></div><div class="muted">${esc(item.transport_mode)} · ${esc(item.weight_kg)} kg · ${esc(item.volume_cbm || 0)} CBM</div><div>${item.quoted_amount == null ? 'لەژێر پێداچوونەوە' : money(item.quoted_amount, item.currency)}</div><small>${item.valid_until ? `کاریگەر تا ${esc(date(item.valid_until))}` : ''}</small>${canAccept ? `<div class="actions"><button class="btn primary" type="button" data-accept-quote="${esc(item.id)}">پەسەندکردنی quote</button></div>` : ''}</div>`;
}).join('') || '<div class="muted">هیچ quote نییە.</div>');
const renderDocuments = (items) => setHtml('docs', items.map((item) => `<div class="item"><div class="row"><strong>${esc(item.title || item.document_type)}</strong><span class="pill">${item.is_public ? 'Public' : 'Private'}</span></div><div class="muted">${esc(item.shipment_id)} · ${esc(item.document_status || 'uploaded')}</div><small>${esc(date(item.created_at))}</small>${item.file_url ? ` <a class="download" href="${esc(item.file_url)}" data-document-id="${esc(item.id)}" target="_blank" rel="noopener noreferrer" download>داگرتن</a>` : ''}</div>`).join('') || '<div class="muted">هیچ document نییە.</div>');
const renderPods = (items) => setHtml('pods', items.map((item) => `<div class="item"><strong>${esc(item.shipment_id)}</strong><div class="muted">${item.delivered_at ? `گەیەنراو ${esc(date(item.delivered_at))}` : 'Pending'} · ${esc(item.receiver_name || '—')}</div><small>${esc(item.note || '')}</small></div>`).join('') || '<div class="muted">POD نییە.</div>');
const renderPayments = (invoices, payments) => {
  const invoiceRows = invoices.map((item) => `<div class="item"><div class="row"><strong>${esc(item.invoice_number)}</strong><span class="pill">${esc(item.status)}</span></div><div class="muted">${esc(item.shipment_id)} · ${money(item.total, item.currency)}</div><small>Paid: ${money(item.paid_total, item.currency)} · Due: ${money(Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0)), item.currency)}</small></div>`);
  const paymentRows = payments.map((item) => `<div class="item"><div class="row"><strong>${money(item.amount, item.currency)}</strong><span class="pill">${esc(item.status)}</span></div><div class="muted">${esc(item.provider)} · ${esc(item.method || '—')}</div><small>${esc(date(item.paid_at || item.created_at))}</small></div>`);
  setHtml('payments', [...invoiceRows, ...paymentRows].join('') || '<div class="muted">هیچ payment history نییە.</div>');
};

const load = async () => {
  const { data: sessionResult } = await sb.auth.getSession();
  const session = sessionResult.session;
  if (!session) {
    $('loginBtn').classList.remove('hidden');
    $('logoutBtn').classList.add('hidden');
    return;
  }
  $('loginBtn').classList.add('hidden');
  $('logoutBtn').classList.remove('hidden');
  const uid = session.user.id;
  $('hello').textContent = `بەخێربێیت — ${session.user.email || 'Customer'}`;
  const [shipments, notifications, quotes, documents, pods, invoices, payments] = await Promise.all([
    sb.from('shipments').select('id,origin_key,dest_key,current_step_index,operational_status,current_location_label,total_amount,paid_amount,eta').eq('customer_user_id', uid).order('created_at', { ascending: false }).limit(30),
    sb.from('customer_notifications').select('title,body,read_at,created_at').eq('customer_user_id', uid).order('created_at', { ascending: false }).limit(12),
    sb.from('quote_requests').select('id,origin_key,dest_key,transport_mode,weight_kg,volume_cbm,status,quoted_amount,currency,valid_until,created_at').eq('customer_user_id', uid).order('created_at', { ascending: false }).limit(12),
    sb.from('shipment_documents').select('id,shipment_id,document_type,title,file_url,is_public,document_status,created_at').eq('customer_user_id', uid).order('created_at', { ascending: false }).limit(12),
    sb.from('delivery_proofs').select('shipment_id,delivered_at,receiver_name,note,created_at').order('created_at', { ascending: false }).limit(12),
    sb.from('shipment_invoices').select('id,invoice_number,shipment_id,total,paid_total,currency,status,due_at,created_at').eq('customer_user_id', uid).order('created_at', { ascending: false }).limit(20),
    sb.from('payment_transactions').select('id,invoice_id,shipment_id,provider,status,amount,currency,method,paid_at,created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  if (shipments.error) throw shipments.error;
  const rows = shipments.data || [];
  const invoicesRows = invoices.data || [];
  $('shipKpi').textContent = rows.length;
  $('movingKpi').textContent = rows.filter((item) => Number(item.current_step_index || 0) > 0 && Number(item.current_step_index || 0) < 5).length;
  $('dueKpi').textContent = `${rows.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount || 0) - Number(item.paid_amount || 0)), 0).toLocaleString('en-US')} USD`;
  $('notifKpi').textContent = (notifications.data || []).filter((item) => !item.read_at).length;
  renderShipments(rows); renderNotifications(notifications.data || []); renderQuotes(quotes.data || []); renderDocuments(documents.data || []); renderPods(pods.data || []); renderPayments(invoicesRows, payments.data || []);
};

const submitQuote = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton?.disabled) return;
  const { data: userResult } = await sb.auth.getUser();
  const user = userResult.user;
  if (!user) { showMessage('تکایە سەرەتا login بکە', 'error'); return; }
  if (!form.reportValidity()) return;
  if (submitButton) { submitButton.disabled = true; submitButton.setAttribute('aria-busy', 'true'); submitButton.dataset.originalLabel = submitButton.textContent; submitButton.textContent = 'لە ناردندایە…'; }
  showMessage('داواکاری نێردراوە…');
  const payload = {
    customer_user_id: user.id,
    customer_name: user.user_metadata?.full_name || user.email || 'Customer',
    customer_phone: user.phone || null,
    origin_key: $('quoteOrigin').value.trim(),
    dest_key: $('quoteDestination').value.trim(),
    transport_mode: $('quoteMode').value,
    weight_kg: Number($('quoteWeight').value || 0),
    volume_cbm: Number($('quoteVolume').value || 0),
    items_count: Number($('quoteItems').value || 0) || null,
    service_level: $('quoteService').value,
    incoterm: $('quoteIncoterm').value,
    notes: $('quoteNotes').value.trim() || null,
    status: 'pending',
  };
  const { data, error } = await sb.from('quote_requests').insert(payload).select('id').single();
  if (error) {
    showMessage(error.message, 'error');
    if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); submitButton.textContent = submitButton.dataset.originalLabel || 'ناردنی داواکاری نرخ'; }
    return;
  }
  showMessage(`سەرکەوتوو بوو؛ ژمارەی داواکاری ${String(data.id).slice(0, 8).toUpperCase()} ـە.`, 'success');
  form.reset();
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

const acceptQuote = async (quoteId) => {
  const { data: userResult } = await sb.auth.getUser();
  if (!userResult.user) return;
  const { error } = await sb.rpc('accept_quote_request', { p_customer_id: userResult.user.id, p_quote_id: quoteId });
  if (error) { showMessage(error.message, 'error'); return; }
  showMessage('Quote پەسەندکرا.', 'success'); await load();
};

$('loginBtn').addEventListener('click', () => $('auth').classList.remove('hidden'));
$('close').addEventListener('click', () => $('auth').classList.add('hidden'));
$('signIn').addEventListener('click', async () => { $('msg').textContent = '…'; const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value }); $('msg').textContent = error ? error.message : 'سەرکەوتوو'; if (!error) { $('auth').classList.add('hidden'); await load(); } });
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
$('trackBtn').addEventListener('click', () => { location.href = './index.html#track'; });
$('quoteBtn').addEventListener('click', () => { $('quoteForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('quoteOrigin').focus(); });
$('quoteForm').addEventListener('submit', (event) => submitQuote(event).catch((error) => showMessage(error.message, 'error')));
document.addEventListener('click', (event) => { const documentLink = event.target.closest('[data-document-id]'); if (documentLink) { event.preventDefault(); downloadDocument(documentLink).then(() => window.open(documentLink.href, '_blank', 'noopener,noreferrer')).catch((error) => showMessage(error.message, 'error')); return; } const button = event.target.closest('[data-accept-quote]'); if (button) acceptQuote(button.dataset.acceptQuote).catch((error) => showMessage(error.message, 'error')); });
sb.auth.onAuthStateChange(() => window.setTimeout(() => load().catch((error) => showMessage(error.message, 'error')), 100));
load().catch((error) => { console.error(error); setHtml('notifications', '<div class="alert">هەڵە لە هێنانی داتا؛ تکایە دواتر هەوڵ بدەرەوە.</div>'); });
