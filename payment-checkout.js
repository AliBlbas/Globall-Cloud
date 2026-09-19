(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/payment-checkout`;
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('invoice_id') || '';
  const state = { provider: 'qicard', invoice: null, session: null, idempotencyKey: null, poller: null };
  const $ = (id) => document.getElementById(id);

  const client = () => {
    if (!window.supabase?.createClient) throw new Error('Payment client is not ready');
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  };
  const authHeaders = async () => {
    const session = (await client().auth.getSession()).data.session;
    if (!session?.access_token) throw new Error('تکایە سەرەتا بچۆ ژوورەوە');
    return { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  };
  const api = async (path, options = {}) => {
    const headers = await authHeaders();
    const response = await fetch(`${FUNCTION_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Payment service error ${response.status}`);
    return body;
  };
  const showAlert = (message) => { $('alert').textContent = message; $('alert').classList.remove('hidden'); };
  const clearAlert = () => { $('alert').textContent = ''; $('alert').classList.add('hidden'); };
  const formatMoney = (value, currency = 'IQD') => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
  const setLoading = (visible, message = 'دۆخی invoice دەخوێندرێتەوە…') => { $('loading').textContent = message; $('loading').classList.toggle('hidden', !visible); };
  const statusClass = (status) => String(status || '').toLowerCase().replace(/[^a-z]/g, '');
  const statusText = (status) => ({ pending: 'چاوەڕوانی پارەدان', created: 'ئامادەکراوە', succeeded: 'سەرکەوتوو', failed: 'سەرنەکەوت', cancelled: 'هەڵوەشێنراوە', expired: 'بەسەرچوو' })[String(status || '').toLowerCase()] || String(status || 'pending');
  const newIdempotencyKey = () => {
    const key = `gc-${state.provider}-${invoiceId}`;
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
    const value = `${crypto.randomUUID()}-${Date.now()}`;
    sessionStorage.setItem(key, value);
    return value;
  };
  const stopPolling = () => { if (state.poller) window.clearInterval(state.poller); state.poller = null; };
  const setResultStatus = (status) => { const pill = $('statusPill'); pill.textContent = statusText(status); pill.className = `status-pill ${statusClass(status)}`; };

  const renderInvoice = (invoice) => {
    state.invoice = invoice;
    $('invoiceNumber').textContent = invoice.invoice_number || '—';
    $('shipmentId').textContent = invoice.shipment_id || '—';
    $('invoiceTotal').textContent = formatMoney(invoice.total, invoice.currency);
    $('invoiceBalance').textContent = formatMoney(Math.max(0, Number(invoice.total || 0) - Number(invoice.paid_total || 0)), invoice.currency);
    $('amount').value = Math.max(0, Number(invoice.total || 0) - Number(invoice.paid_total || 0)).toFixed(2);
    $('invoiceSummary').classList.remove('hidden');
    $('paymentForm').classList.remove('hidden');
    setLoading(false);
    if (String(invoice.status || '').toLowerCase() === 'paid') { $('paymentForm').classList.add('hidden'); showAlert('ئەم invoice ـە پێشتر بە تەواوی پارەدراوە.'); }
  };

  const renderResult = (payload) => {
    state.session = payload.session || payload;
    const session = state.session;
    const provider = payload.provider || {};
    const status = session.status || 'pending';
    setResultStatus(status);
    $('paymentResult').classList.remove('hidden');
    $('resultTitle').textContent = status === 'succeeded' ? 'پارەدان سەرکەوتوو بوو' : status === 'failed' ? 'پارەدان سەرنەکەوت' : 'پارەدان ئامادەیە';
    const content = $('resultContent');
    content.replaceChildren();
    const summary = document.createElement('div');
    summary.textContent = `Provider: ${session.provider || state.provider} · بڕ: ${formatMoney(session.amount, session.currency)} · دۆخ: ${statusText(status)}`;
    content.appendChild(summary);
    const qr = session.qr_code || provider.qrCode;
    if (qr) { const image = document.createElement('img'); image.src = qr; image.alt = 'QR code ـی payment'; content.appendChild(image); }
    const code = session.readable_code || provider.readableCode;
    if (code) { const codeText = document.createElement('strong'); codeText.textContent = `کۆدی payment: ${code}`; content.appendChild(codeText); }
    if (session.failure_reason) { const failure = document.createElement('div'); failure.textContent = session.failure_reason; content.appendChild(failure); }
    const url = session.checkout_url || provider.checkoutUrl;
    const link = $('checkoutLink');
    if (url) { link.href = url; link.classList.remove('hidden'); } else { link.classList.add('hidden'); link.removeAttribute('href'); }
    $('cancelPayment').disabled = ['succeeded', 'failed', 'cancelled', 'expired'].includes(status);
    $('refreshStatus').disabled = ['succeeded', 'failed', 'cancelled', 'expired'].includes(status);
    if (['succeeded', 'failed', 'cancelled', 'expired'].includes(status)) stopPolling();
  };

  const refreshStatus = async () => {
    if (!state.session?.id) return;
    try { renderResult(await api('', { method: 'POST', body: JSON.stringify({ action: 'status', data: { session_id: state.session.id } }) })); } catch (error) { showAlert(error.message); }
  };
  const startPolling = () => { stopPolling(); state.poller = window.setInterval(refreshStatus, 10000); };

  const createPayment = async (event) => {
    event.preventDefault();
    clearAlert();
    const amount = Number($('amount').value);
    const balance = Math.max(0, Number(state.invoice?.total || 0) - Number(state.invoice?.paid_total || 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) { showAlert('بڕی پارەدان دەبێت لە نێوان 0 و balance ـی invoice بێت.'); return; }
    const button = $('payButton'); button.disabled = true; button.textContent = 'لە دروستکردنی payment ـدایە…';
    try {
      state.idempotencyKey = state.idempotencyKey || newIdempotencyKey();
      const result = await api('', { method: 'POST', headers: { 'x-idempotency-key': state.idempotencyKey }, body: JSON.stringify({ action: 'create', data: { provider: state.provider, invoice_id: invoiceId, amount, idempotency_key: state.idempotencyKey } }) });
      renderResult(result); startPolling();
    } catch (error) { showAlert(error.message); }
    finally { button.disabled = false; button.textContent = 'دروستکردنی پارەدان'; }
  };
  const cancelPayment = async () => {
    if (!state.session?.id || !window.confirm('دڵنیایت لە هەڵوەشاندنەوەی ئەم payment ـە؟')) return;
    $('cancelPayment').disabled = true;
    try { renderResult(await api('', { method: 'POST', body: JSON.stringify({ action: 'cancel', data: { session_id: state.session.id } }) })); } catch (error) { showAlert(error.message); $('cancelPayment').disabled = false; }
  };
  const selectProvider = (button) => {
    document.querySelectorAll('.provider').forEach((item) => item.classList.toggle('active', item === button));
    state.provider = button.dataset.provider;
    $('providerLabel').textContent = state.provider === 'fib' ? 'FIB' : 'QiCard';
    state.idempotencyKey = null;
  };

  const init = async () => {
    try {
      if (!invoiceId) throw new Error('invoice_id لە URL ـدا نییە');
      await authHeaders();
      const result = await api(`?invoice_id=${encodeURIComponent(invoiceId)}`);
      renderInvoice(result.invoice);
    } catch (error) { setLoading(false); showAlert(error.message); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.provider').forEach((button) => button.addEventListener('click', () => selectProvider(button)));
    $('paymentForm').addEventListener('submit', createPayment);
    $('refreshStatus').addEventListener('click', refreshStatus);
    $('cancelPayment').addEventListener('click', cancelPayment);
    init();
  });
})();
