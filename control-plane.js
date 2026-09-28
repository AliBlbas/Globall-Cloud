'use strict';

(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/logistics-control-plane`;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const $ = (id) => document.getElementById(id);
  const state = { session: null, staff: null, activeView: 'overview', lists: { shipments: [], packages: [], customs: [], consolidations: [], invoices: [], exceptions: [], outbox: [], quotes: [], documents: [], movements: [], route_legs: [], manifests: [] } };
  const text = (value) => String(value ?? '—');
  const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const statusClass = (value) => /delivered|cleared|sent|resolved|closed|processed|ok/i.test(text(value)) ? 'ok' : /failed|held|critical|lost|damaged/i.test(text(value)) ? 'bad' : /warning|open|pending|processing|inspection/i.test(text(value)) ? 'warn' : '';
  const showNotice = (message, kind = 'warn') => { const el = $('notice'); el.textContent = message; el.className = `notice ${kind === 'bad' ? 'error' : ''}`; el.classList.remove('hidden'); window.clearTimeout(showNotice.timer); showNotice.timer = window.setTimeout(() => el.classList.add('hidden'), 7000); };
  const hideLogin = () => { $('loginPanel').classList.add('hidden'); $('app').classList.remove('hidden'); $('signOutBtn').classList.remove('hidden'); };
  const showLogin = () => { $('loginPanel').classList.remove('hidden'); $('app').classList.add('hidden'); $('signOutBtn').classList.add('hidden'); };
  const requireSession = () => { if (!state.session) throw new Error('Session required'); return state.session; };
  const authHeaders = async () => { const session = requireSession(); return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }; };

  const api = async (query = '', options = {}) => {
    const headers = await authHeaders();
    if (options.body instanceof FormData) delete headers['Content-Type'];
    const response = await fetch(`${FUNCTION_URL}${query}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  };

  const renderMetrics = () => {
    $('metricShipments').textContent = state.lists.shipments.length;
    $('metricMoving').textContent = state.lists.shipments.filter((item) => Number(item.current_step_index || 0) > 0 && !/delivered|archived|cancelled/i.test(item.operational_status || '')).length;
    $('metricExceptions').textContent = state.lists.exceptions.filter((item) => !/resolved|closed/i.test(item.status || '')).length;
    $('metricOutbox').textContent = state.lists.outbox.filter((item) => /pending|processing/i.test(item.status || '')).length;
  };

  const renderShipments = () => {
    $('shipmentsTable').innerHTML = state.lists.shipments.length ? state.lists.shipments.map((item) => `<tr><td><span class="mono">${escapeHtml(item.id)}</span><br><small>${escapeHtml(item.customer_name)}</small></td><td>${escapeHtml(item.origin_key)} → ${escapeHtml(item.dest_key)}<br><small>${escapeHtml(item.origin_hub || '')} / ${escapeHtml(item.destination_hub || '')}</small></td><td><span class="status ${statusClass(item.operational_status)}">${escapeHtml(item.operational_status)}</span><br><small>v${escapeHtml(item.state_version)}</small></td><td>${escapeHtml(item.current_step_index)} / 5</td><td>${item.eta ? escapeHtml(new Date(item.eta).toLocaleString()) : '—'}</td><td><button class="btn small" type="button" data-transition="${escapeHtml(item.id)}" data-step="${Number(item.current_step_index || 0)}">پێشخستن</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">هیچ shipment ـێک نەدۆزرایەوە.</td></tr>';
  };
  const renderPackages = () => {
    $('packagesTable').innerHTML = state.lists.packages.length ? state.lists.packages.map((item) => `<tr><td class="mono">${escapeHtml(item.package_code)}<br><small>${escapeHtml(item.barcode || '')}</small></td><td class="mono">${escapeHtml(item.shipment_id)}</td><td>${escapeHtml(item.current_hub)}</td><td>${item.weight_kg == null ? '—' : `${escapeHtml(item.weight_kg)} kg`}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.updated_at ? escapeHtml(new Date(item.updated_at).toLocaleString()) : '—'}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">Package data نییە.</td></tr>';
  };
  const renderCustoms = () => {
    $('customsTable').innerHTML = state.lists.customs.length ? state.lists.customs.map((item) => `<tr><td class="mono">${escapeHtml(item.shipment_id)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.declaration_number)}</td><td>${escapeHtml(item.broker_name)}</td><td>${item.duty_amount == null ? '—' : `${escapeHtml(item.duty_amount)} ${escapeHtml(item.duty_currency || 'USD')}`}</td><td><span class="status ${item.documents_complete ? 'ok' : 'warn'}">${item.documents_complete ? 'تەواو' : 'ناتەواو'}</span></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Customs case نییە.</td></tr>';
  };
  const renderConsolidations = () => {
    $('consolidationsTable').innerHTML = state.lists.consolidations.length ? state.lists.consolidations.map((item) => `<tr><td class="mono">${escapeHtml(item.batch_code)}<br><small>${escapeHtml(item.seal_number || '')}</small></td><td>${escapeHtml(item.origin_hub)}</td><td>${escapeHtml(item.transit_hub)}</td><td>${escapeHtml(item.destination_hub)}</td><td>${escapeHtml(item.transport_mode)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.package_count)} / ${escapeHtml(item.total_weight_kg)} kg</td><td>${item.expected_departure ? escapeHtml(new Date(item.expected_departure).toLocaleString()) : '—'}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">Consolidation batch نییە.</td></tr>';
  };
  const renderInvoices = () => {
    $('invoicesTable').innerHTML = state.lists.invoices.length ? state.lists.invoices.map((item) => { const balance = Math.max(0, Number(item.total || 0) - Number(item.paid_total || 0)); return `<tr><td class="mono">${escapeHtml(item.invoice_number)}</td><td class="mono">${escapeHtml(item.shipment_id)}</td><td>${escapeHtml(item.total)} ${escapeHtml(item.currency)}</td><td>${escapeHtml(item.paid_total)} ${escapeHtml(item.currency)}</td><td>${escapeHtml(balance)} ${escapeHtml(item.currency)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.due_at ? escapeHtml(new Date(item.due_at).toLocaleDateString()) : '—'}</td><td><a class="btn small" href="/payment-checkout.html?invoice_id=${encodeURIComponent(item.id)}" target="_blank" rel="noopener">پارەدان</a></td></tr>`; }).join('') : '<tr><td colspan="8" class="empty">Invoice نییە یان دەستگەیشتن سنووردارە.</td></tr>';
  };
  const renderExceptions = () => {
    $('exceptionsTable').innerHTML = state.lists.exceptions.length ? state.lists.exceptions.map((item) => `<tr><td class="mono">${escapeHtml(item.id)}</td><td class="mono">${escapeHtml(item.shipment_id)}</td><td>${escapeHtml(item.title)}<br><small>${escapeHtml(item.note)}</small></td><td><span class="status ${statusClass(item.severity)}">${escapeHtml(item.severity)}</span></td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.due_at ? escapeHtml(new Date(item.due_at).toLocaleString()) : '—'}</td><td>${/resolved|closed/i.test(item.status || '') ? '—' : `<button class="btn small" type="button" data-resolve="${escapeHtml(item.id)}">چارەسەرکراو</button>`}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">هیچ exception ـێکی کراوە نییە.</td></tr>';
  };
  const renderOutbox = () => {
    $('outboxTable').innerHTML = state.lists.outbox.length ? state.lists.outbox.map((item) => `<tr><td class="mono">${escapeHtml(String(item.id).slice(0, 8))}</td><td>${escapeHtml(item.channel)}</td><td>${escapeHtml(item.event_key)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.attempts)}</td><td>${item.next_attempt_at ? escapeHtml(new Date(item.next_attempt_at).toLocaleString()) : '—'}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">Outbox بەتاڵە.</td></tr>';
  };
  const renderQuotes = () => {
    $('quotesTable').innerHTML = state.lists.quotes.length ? state.lists.quotes.map((item) => `<tr><td class="mono">${escapeHtml(String(item.id).slice(0, 8))}</td><td>${escapeHtml(item.customer_name)}<br><small>${escapeHtml(item.customer_phone)}</small></td><td>${escapeHtml(item.origin_key)} → ${escapeHtml(item.dest_key)}<br><small>${escapeHtml(item.transport_mode)}</small></td><td>${escapeHtml(item.weight_kg)} kg / ${escapeHtml(item.volume_cbm)} CBM<br><small>billable ${escapeHtml(item.billable_weight_kg)} kg</small></td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.quoted_amount == null ? '—' : `${escapeHtml(item.quoted_amount)} ${escapeHtml(item.currency)}`}</td><td>${item.valid_until ? escapeHtml(new Date(item.valid_until).toLocaleString()) : '—'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Quote request نییە.</td></tr>';
  };
  const renderDocuments = () => {
    $('documentsTable').innerHTML = state.lists.documents.length ? state.lists.documents.map((item) => `<tr><td>${escapeHtml(item.title)}<br><small>${escapeHtml(item.document_type)}</small></td><td class="mono">${escapeHtml(item.shipment_id)}</td><td>${escapeHtml(item.mime_type)}</td><td>${item.file_size_bytes == null ? '—' : `${Math.round(Number(item.file_size_bytes) / 1024)} KB`}</td><td class="mono">${escapeHtml(String(item.sha256 || '').slice(0, 16))}</td><td><span class="status ${statusClass(item.document_status)}">${escapeHtml(item.document_status)}</span></td><td>${item.created_at ? escapeHtml(new Date(item.created_at).toLocaleString()) : '—'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Document نییە.</td></tr>';
  };
  const renderMovements = () => {
    $('movementsTable').innerHTML = state.lists.movements.length ? state.lists.movements.map((item) => `<tr><td class="mono">${escapeHtml(item.shipment_id)}</td><td class="mono">${escapeHtml(item.package_id)}</td><td>${escapeHtml(item.from_hub || '—')} → ${escapeHtml(item.to_hub)}</td><td><span class="status ${statusClass(item.movement_type)}">${escapeHtml(item.movement_type)}</span></td><td class="mono">${escapeHtml(item.scan_code)}</td><td>${item.scanned_at ? escapeHtml(new Date(item.scanned_at).toLocaleString()) : '—'}</td><td class="mono">${escapeHtml(String(item.scanned_by || '').slice(0, 8))}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Warehouse movement نییە.</td></tr>';
  };
  const renderRouteLegs = () => {
    $('routeLegsTable').innerHTML = state.lists.route_legs.length ? state.lists.route_legs.map((item) => `<tr><td class="mono">${escapeHtml(item.shipment_id)}</td><td>${escapeHtml(item.leg_number)}</td><td>${escapeHtml(item.from_hub)} → ${escapeHtml(item.to_hub)}</td><td>${escapeHtml(item.transport_mode)}</td><td>${escapeHtml(item.carrier_name)}</td><td class="mono">${escapeHtml(item.tracking_number)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td></tr>`).join('') : '<tr><td colspan="7" class="empty">Route leg نییە.</td></tr>';
  };
  const renderAll = () => { renderMetrics(); renderShipments(); renderPackages(); renderCustoms(); renderConsolidations(); renderInvoices(); renderExceptions(); renderOutbox(); renderQuotes(); renderDocuments(); renderMovements(); renderRouteLegs(); };

  const load = async (kind) => {
    const result = await api(`?kind=${encodeURIComponent(kind)}&limit=200`);
    state.lists[kind] = result.items || [];
  };
  const loadAll = async () => {
    await Promise.all(['shipments', 'packages', 'customs', 'consolidations', 'exceptions', 'quotes', 'documents', 'movements', 'route_legs'].map(load));
    try { await load('invoices'); } catch (error) { state.lists.invoices = []; if (!['admin', 'super_admin', 'accountant'].includes(state.staff?.role)) console.info('finance restricted to finance roles'); }
    try { await load('outbox'); } catch (error) { state.lists.outbox = []; if (state.staff?.role !== 'admin' && state.staff?.role !== 'super_admin') console.info('outbox restricted to administrators'); }
    renderAll();
  };

  const setView = async (view) => {
    state.activeView = view;
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    document.querySelectorAll('.view').forEach((panel) => panel.classList.toggle('hidden', panel.id !== `view-${view}`));
    const titles = { overview: ['کورتەی عملیات', 'دۆخی زیندووی چین → دوبەی → هەولێر و عێراق.'], shipments: ['بارەکان', 'State version و SLA ـی هەر بار بە ڕوونی.'], packages: ['پەکەج و بارکۆد', 'Traceability لە package ـی تاکەوە تا shipment.'], customs: ['گومرگ', 'Declaration، HS codes و duty.'], consolidations: ['کۆکردنەوەی بار', 'Batch، seal، hub و package count.'], finance: ['دارایی و invoice', 'Invoice، paid total و balance.'], exceptions: ['کێشە و SLA', 'ETA breach و stale tracking.'], quotes: ['نرخی بارەکان', 'Quote lifecycle و approval بە audit trail.'], documents: ['بەڵگەنامەکان', 'Document vault، hash و storage status.'], movements: ['گواستنەوەی کۆگا', 'Chain-of-custody ledger بۆ هەر package و shipment.'], route_legs: ['Route legs', 'Multi-leg ڕێڕەوی چین → دوبەی → هەولێر.'], outbox: ['Notification outbox', 'Queue و retry state.'] };
    $('viewTitle').textContent = titles[view]?.[0] || titles.overview[0];
    $('viewSubtitle').textContent = titles[view]?.[1] || titles.overview[1];
    if (view !== 'overview') { try { await load(view === 'outbox' ? 'outbox' : view); renderAll(); } catch (error) { showNotice(error.message, 'bad'); } }
  };

  const signIn = async (event) => {
    event.preventDefault();
    $('loginError').textContent = '';
    try {
      const result = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
      if (result.error) throw result.error;
      await boot();
    } catch (error) { $('loginError').textContent = error.message || 'Login failed'; }
  };
  const boot = async () => {
    const session = (await client.auth.getSession()).data.session;
    if (!session) { showLogin(); return; }
    state.session = session;
    const user = (await client.auth.getUser()).data.user;
    const staff = await client.from('staff').select('id,full_name,role,branch,is_active').eq('id', user.id).maybeSingle();
    if (staff.error || !staff.data?.is_active) { await client.auth.signOut(); throw new Error('Active staff account required'); }
    state.staff = staff.data;
    $('staffIdentity').textContent = `${state.staff.full_name || user.email} · ${state.staff.role}`;
    hideLogin();
    await loadAll();
  };
  const signOut = async () => { await client.auth.signOut(); state.session = null; state.staff = null; showLogin(); };
  const transitionShipment = async (shipmentId, currentStep) => {
    const status = window.prompt('دۆخی نوێ بنووسە (in_transit/customs/out_for_delivery/delivered):', 'in_transit');
    if (!status) return;
    const nextStep = Math.min(5, Number(currentStep) + 1);
    const result = await api('', { method: 'POST', body: JSON.stringify({ action: 'transition_shipment', data: { shipment_id: shipmentId, to_status: status, to_step: nextStep, idempotency_key: `ui-${shipmentId}-${nextStep}-${Date.now()}` } }) });
    showNotice(`Shipment ${result.item?.id || shipmentId} نوێکرایەوە.`, 'ok');
    await loadAll();
  };
  const resolveException = async (exceptionId) => {
    const note = window.prompt('تێبینی چارەسەرکردن:', 'Reviewed by operations');
    if (note === null) return;
    await api('', { method: 'POST', body: JSON.stringify({ action: 'resolve_exception', data: { exception_id: exceptionId, status: 'resolved', resolution_note: note } }) });
    showNotice('Exception چارەسەرکرا.', 'ok');
    await load('exceptions'); renderAll();
  };
  const processOutbox = async () => {
    const result = await api('', { method: 'POST', body: JSON.stringify({ action: 'process_outbox', data: { limit: 20 } }) });
    showNotice(`${result.item?.claimed || 0} notification پردازش کرا.`, 'ok');
    await load('outbox'); renderAll();
  };
  const approveQuote = async (event) => {
    event.preventDefault();
    const payload = { quote_id: $('quoteId').value.trim(), quoted_amount: Number($('quoteAmount').value), currency: $('quoteCurrency').value, valid_until: $('quoteValidUntil').value ? new Date($('quoteValidUntil').value).toISOString() : null, notes: $('quoteNotes').value.trim() };
    const result = await api('', { method: 'POST', body: JSON.stringify({ action: 'approve_quote', data: payload }) });
    showNotice(`Quote ${String(result.item?.id || payload.quote_id).slice(0, 8)} پەسەندکرا.`, 'ok');
    event.target.reset(); await load('quotes'); renderAll();
  };
  const uploadDocument = async (event) => {
    event.preventDefault();
    const file = $('documentFile').files?.[0];
    if (!file) throw new Error('فایلێک هەڵبژێرە');
    const form = new FormData();
    form.append('shipment_id', $('documentShipmentId').value.trim());
    form.append('document_type', $('documentType').value);
    form.append('title', $('documentTitle').value.trim());
    form.append('is_public', $('documentPublic').checked ? 'true' : 'false');
    form.append('file', file);
    const result = await api('', { method: 'POST', body: form });
    showNotice(`Document بە hash ${String(result.item?.sha256 || '').slice(0, 12)} تۆمارکرا.`, 'ok');
    event.target.reset(); await load('documents'); renderAll();
  };
  const recordMovement = async (event) => {
    event.preventDefault();
    const payload = { shipment_id: $('movementShipmentId').value.trim(), package_id: $('movementPackageId').value.trim() || null, from_hub: $('movementFromHub').value.trim() || null, to_hub: $('movementToHub').value.trim(), movement_type: $('movementType').value, scan_code: $('movementScanCode').value.trim() || null, notes: $('movementNotes').value.trim() || null, idempotency_key: `ui-movement-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
    const result = await api('', { method: 'POST', body: JSON.stringify({ action: 'record_warehouse_movement', data: payload }) });
    showNotice(`Movement بۆ ${result.item?.to_hub || payload.to_hub} تۆمارکرا.`, 'ok');
    event.target.reset(); await load('movements'); renderAll();
  };
  const saveRouteLeg = async (event) => {
    event.preventDefault();
    const payload = { shipment_id: $('legShipmentId').value.trim(), leg_number: Number($('legNumber').value), from_hub: $('legFromHub').value.trim(), to_hub: $('legToHub').value.trim(), transport_mode: $('legMode').value, carrier_name: $('legCarrier').value.trim() || null, tracking_number: $('legTracking').value.trim() || null, status: $('legStatus').value };
    const result = await api('', { method: 'POST', body: JSON.stringify({ action: 'upsert_route_leg', data: payload }) });
    showNotice(`Route leg ${result.item?.leg_number || payload.leg_number} پاشەکەوتکرا.`, 'ok');
    await load('route_legs'); renderAll();
  };
  const loadReport = async () => {
    const params = new URLSearchParams();
    if ($('reportFrom').value) params.set('from', $('reportFrom').value);
    if ($('reportTo').value) params.set('to', $('reportTo').value);
    const result = await api(`?${params.toString()}`, { method: 'POST', body: JSON.stringify({ action: 'get_report' }) });
    $('reportOutput').textContent = JSON.stringify(result.item || {}, null, 2);
  };

  $('loginForm').addEventListener('submit', signIn);
  $('quoteApprovalForm').addEventListener('submit', (event) => approveQuote(event).catch((error) => showNotice(error.message, 'bad')));
  $('documentUploadForm').addEventListener('submit', (event) => uploadDocument(event).catch((error) => showNotice(error.message, 'bad')));
  $('movementForm').addEventListener('submit', (event) => recordMovement(event).catch((error) => showNotice(error.message, 'bad')));
  $('routeLegForm').addEventListener('submit', (event) => saveRouteLeg(event).catch((error) => showNotice(error.message, 'bad')));
  $('reportBtn').addEventListener('click', () => loadReport().catch((error) => showNotice(error.message, 'bad')));
  $('signOutBtn').addEventListener('click', signOut);
  $('refreshBtn').addEventListener('click', () => loadAll().catch((error) => showNotice(error.message, 'bad')));
  $('workerBtn').addEventListener('click', () => processOutbox().catch((error) => showNotice(error.message, 'bad')));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.addEventListener('click', (event) => {
    const transitionButton = event.target.closest('[data-transition]');
    if (transitionButton) transitionShipment(transitionButton.dataset.transition, transitionButton.dataset.step).catch((error) => showNotice(error.message, 'bad'));
    const resolveButton = event.target.closest('[data-resolve]');
    if (resolveButton) resolveException(resolveButton.dataset.resolve).catch((error) => showNotice(error.message, 'bad'));
    const reloadButton = event.target.closest('[data-action="reload"]');
    if (reloadButton) loadAll().catch((error) => showNotice(error.message, 'bad'));
  });
  window.addEventListener('load', () => boot().catch((error) => { showLogin(); $('loginError').textContent = error.message; }));
})();
