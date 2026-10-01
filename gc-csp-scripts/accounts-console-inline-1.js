const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API_URL = `${SUPABASE_URL}/functions/v1/account-admin`;
const OPS_API_URL = `${SUPABASE_URL}/functions/v1/operations-admin`;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
if (sb) window.sb = sb;
const adminDashboard = typeof AdminDashboard !== 'undefined' ? new AdminDashboard(sb) : null;
const state = { tab: 'dashboard', session: null, role: 'guest', customers: [], staff: [], shipments: [], receipts: [], logs: [], lastLoadError: '' };
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const badge = (active) => `<span class="${active ? 'ok' : 'warn'}">${active ? 'ACTIVE' : 'INACTIVE'}</span>`;
const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', accountant: 'Accountant' };
const roleClass = (r) => r === 'super_admin' ? 'badge-super' : r === 'accountant' ? 'badge-accountant' : 'badge-admin';
function setMsg(el, text, ok = false) { el.textContent = text || ''; el.style.color = ok ? 'var(--good)' : 'var(--muted)'; }
function setLoadError(text) { state.lastLoadError = text || ''; const el = $('loadStatus'); if (el) { el.textContent = text || ''; el.classList.toggle('warn', Boolean(text)); el.classList.toggle('ok', false); el.style.display = text ? 'inline-flex' : 'none'; } }
function showRole(role) { const el = $('roleBadge'); el.className = `badge ${roleClass(role)}`; el.textContent = `${roleLabel[role] || role || 'Guest'} access`; el.classList.remove('hidden'); }
async function authFetch(path = '/', opts = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Please sign in first');
  const headers = new Headers(opts.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (opts.body && !(opts.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
async function opsFetch(path = '/', opts = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Please sign in first');
  const headers = new Headers(opts.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  if (opts.body && !(opts.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${OPS_API_URL}${path}`, { ...opts, headers });
  const text = await res.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.error || `Shipment request failed (${res.status})`);
  return data;
}
const VALID_TABS = ['dashboard', 'customers', 'shipments', 'staff', 'receipts', 'logs', 'quote'];
function setActiveTab(tab) {
  state.tab = tab;
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const dashboardPane = $('dashboardPane');
  if (dashboardPane) dashboardPane.classList.toggle('hidden', tab !== 'dashboard');
  $('customerForm').classList.toggle('hidden', tab !== 'customers');
  $('staffForm').classList.toggle('hidden', tab !== 'staff');
  $('receiptForm').classList.toggle('hidden', tab !== 'receipts');
  $('shipmentForm').classList.toggle('hidden', tab !== 'shipments');
  $('quotePane').classList.toggle('hidden', tab !== 'quote');
  $('listPanel').classList.toggle('hidden', tab === 'quote');
  $('listTitle').textContent = tab === 'customers' ? 'Customer accounts & GC codes' : tab === 'shipments' ? 'Shipment control' : tab === 'staff' ? 'Staff accounts' : tab === 'receipts' ? 'Warehouse receipts' : tab === 'logs' ? 'Activity logs' : 'Overview';
  $('listSubtitle').textContent = tab === 'customers' ? 'Create customers and assign immutable GC codes' : tab === 'shipments' ? 'Create, update status, costs, weight, and payment state' : tab === 'staff' ? 'Manage staff roles and access' : tab === 'receipts' ? 'Goods received in Dubai, China, or Erbil with photos' : tab === 'logs' ? 'Latest management activity' : 'Latest customer accounts and records';
  if (tab !== 'quote') renderList();
}
/* Staff-side quick quote tool, powered by price-calculator.js's generic
   rate/distance tables. Intentionally separate from index.html's own
   calcQuote() (see price-calculator.js header comment) — this is for a
   staff member to sanity-check a price internally, not the customer-facing
   quote form. */
async function runQuickQuote() {
  const resultEl = $('quoteResult');
  const breakdownEl = $('quoteWeightBreakdown');
  const type = $('quoteType').value;
  const actual = Number($('quoteWeight').value);
  const length = Number($('quoteLength').value || 0);
  const width = Number($('quoteWidth').value || 0);
  const height = Number($('quoteHeight').value || 0);
  if (!Number.isFinite(actual) || actual < 0 || [length, width, height].some((v) => !Number.isFinite(v) || v < 0)) { resultEl.textContent = 'Enter valid non-negative weight and dimensions.'; return; }
  resultEl.textContent = 'Calculating from the live rate catalog…';
  try {
    const quote = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'quote', action: 'calculate', data: { transport_mode: type, actual_weight: actual, length_cm: length, width_cm: width, height_cm: height, product_type: $('quoteProduct').value, origin: $('quoteOrigin').value, destination: $('quoteDest').value } }) });
    breakdownEl.innerHTML = `<b>Billing basis</b><br>Actual: ${quote.actual_weight_kg} kg · Volumetric: ${quote.volumetric_weight_kg} kg · Billable: ${quote.billable_weight_kg} kg · Volume: ${quote.volume_cbm} CBM<br><span class="muted">${esc(quote.formula)}</span>`;
    resultEl.innerHTML = `<div class="stats"><div class="stat"><b>${money(quote.total)} ${esc(quote.currency)}</b><span>Estimated total</span></div><div class="stat"><b>${quote.billable_units} ${quote.rate_snapshot.unit}</b><span>Billable units</span></div><div class="stat"><b>${quote.transit_min_days ?? '—'}–${quote.transit_max_days ?? '—'} days</b><span>Estimated delivery</span></div></div><div class="small" style="margin-top:10px">Rate snapshot: ${esc(quote.rate_snapshot.rate_key)} · ${esc(quote.rate_snapshot.amount)} ${esc(quote.currency)} / ${esc(quote.rate_snapshot.unit)}</div>`;
  } catch (err) { resultEl.textContent = err.message || 'Could not calculate — check route and rate inputs.'; }
}
function loadManagerOptions() {
  $('customerManager').innerHTML = '<option value="">Unassigned</option>' + state.staff.map((s) => `<option value="${esc(s.id)}">${esc(s.full_name)} (${esc(s.role)})</option>`).join('');
}
function resetCustomerForm() { window.formValidator.resetForm('customerForm'); $('customerId').value=''; $('customerName').value=''; $('customerEmail').value=''; $('customerPhone').value=''; $('customerPhone2').value=''; $('customerCity').value=''; $('customerDelivery').value=''; $('customerManager').value=''; $('customerStatus').value='true'; $('customerNote').value=''; $('customerInvite').value='true'; $('customerPassword').value=''; setMsg($('customerMsg'), ''); }
function resetStaffForm() { window.formValidator.resetForm('staffForm'); $('staffId').value=''; $('staffFullName').value=''; $('staffEmail').value=''; $('staffRole').value='admin'; $('staffBranch').value='all'; $('staffInvite').value='true'; $('staffPassword').value=''; setMsg($('staffMsg'), ''); }
function resetShipmentForm() { $('shipmentId').value=''; $('shipmentCustomerCode').value=''; $('shipmentBatch').value=''; $('shipmentOrigin').value='china'; $('shipmentDestination').value='erbil'; $('shipmentType').value='air'; ['shipmentWeight','shipmentVolume','shipmentItems','shipmentTotal','shipmentPaid'].forEach((id) => $(id).value=''); $('shipmentStatus').value='pending'; $('shipmentEta').value=''; $('shipmentPriority').value='normal'; $('shipmentBranch').value='all'; $('shipmentNotes').value=''; setMsg($('shipmentMsg'), ''); }
function resetReceiptForm() { window.formValidator.resetForm('receiptForm'); $('receiptBatch').value=''; $('receiptLocation').value='Dubai'; $('receiptCustomerCode').value=''; $('receiptCustomerPhone').value=''; $('receiptNotes').value=''; $('receiptPhotos').value=''; $('receiptPreview').innerHTML=''; setMsg($('receiptMsg'), ''); }
function renderList() {
  if (state.tab === 'quote') return;
  const q = $('searchBox').value.trim().toLowerCase();
  if (state.tab === 'shipments') {
    const rows = state.shipments.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Shipment</th><th>Customer</th><th>Route / type</th><th>Weight</th><th>Cost / paid</th><th>Status</th><th>ETA</th><th>Actions</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr>
      <td class="mono">${esc(r.id || '—')}<div class="muted">${esc(r.batch_code || '')}</div></td>
      <td><b>${esc(r.customer_name || '—')}</b><div class="muted mono">${esc(r.customer_phone || '')}</div></td>
      <td>${esc(r.origin_key || '')} → ${esc(r.dest_key || '')}<div class="muted">${esc(r.type || '')}</div></td>
      <td>${r.weight_kg == null ? '—' : esc(r.weight_kg + ' kg')}<div class="muted">${r.items_count == null ? '' : esc(r.items_count + ' items')}</div></td>
      <td>${money(r.total_amount)}<div class="muted">Paid ${money(r.paid_amount)}</div></td>
      <td><span class="${String(r.operational_status || '').toLowerCase() === 'delivered' ? 'ok' : 'warn'}">${esc(r.operational_status || 'pending')}</span></td>
      <td>${esc(r.eta || '—')}</td>
      <td><button class="btn btn-outline" data-gc-onclick='editShipment(${JSON.stringify(r).replace(/'/g,"&#39;")})'>Edit</button></td>
    </tr>`).join('') || '<tr><td colspan="8">No shipments found.</td></tr>';
  } else if (state.tab === 'customers') {
    const rows = state.customers.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Manager</th><th>Shipments</th><th>Status</th><th>Actions</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => {
      const manager = state.staff.find((s) => s.id === r.manager_staff_id);
      const code = r.display_gc || r.gc_code || r.code || '—';
      return `<tr>
        <td class="mono">${esc(code)}</td>
        <td><b>${esc(r.name || '—')}</b><div class="muted">${esc(r.city || '')}</div></td>
        <td>${esc(r.phone || '')}<div class="muted">${esc(r.phone2 || '')}</div></td>
        <td>${esc(r.email || '')}</td>
        <td>${esc(manager?.full_name || '—')}<div class="muted">${esc(manager?.role || '')}</div></td>
        <td><b>${r.shipment_count || 0}</b><div class="muted">${money(r.outstanding_amount || 0)} due</div></td>
        <td>${badge(r.is_active)}</td>
        <td><div class="toolbar"><button class="btn btn-outline" data-gc-onclick='editCustomer(${JSON.stringify(r).replace(/'/g,"&#39;")})'>Edit</button>${r.auth_user_id ? '<span class="ok">Linked</span>' : `<button class="btn btn-primary" data-gc-onclick="bindCustomerAccount('${esc(r.id)}')">Bind login</button>`}<button class="btn btn-danger" data-gc-onclick="archiveCustomerAccount('${esc(r.id)}')">Archive</button></div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8">No customers found.</td></tr>';
  } else if (state.tab === 'staff') {
    const rows = state.staff.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Name</th><th>Email / ID</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr>
      <td><b>${esc(r.full_name || '—')}</b><div class="muted mono">${(String(r.full_name || '?').split(' ').slice(0,2).map((s) => s[0] || '').join('')).toUpperCase()}</div></td>
      <td class="mono">${esc(r.email || r.id)}</td>
      <td><span class="ok">${esc(r.role || '')}</span></td>
      <td>${esc(r.branch || '')}</td>
      <td>${badge(r.is_active)}</td>
      <td><div class="toolbar"><button class="btn btn-outline" data-gc-onclick='editStaff(${JSON.stringify(r).replace(/'/g,"&#39;")})'>Edit</button><button class="btn btn-danger" data-gc-onclick="archiveStaffAccount('${esc(r.id)}')">Deactivate</button></div></td>
    </tr>`).join('') || '<tr><td colspan="6">No staff found.</td></tr>';
  } else if (state.tab === 'receipts') {
    const rows = state.receipts.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Batch</th><th>Location</th><th>Customer</th><th>Photos</th><th>Received</th><th>Notes</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => {
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return `<tr>
        <td class="mono">${esc(r.batch_code || '')}</td>
        <td>${esc(r.location || '')}</td>
        <td>${esc(r.directory_phone || '')}<div class="muted mono">${esc(r.directory_customer_id || '')}</div></td>
        <td>${photos.length} photos<div class="receipt-files">${photos.slice(0,3).map((p) => `<a href="${esc(p)}" target="_blank" rel="noreferrer"><img src="${esc(p)}" alt="receipt"></a>`).join('')}</div></td>
        <td>${esc(r.received_at || '')}<div class="muted">${esc(r.created_by_name || '')}</div></td>
        <td>${esc(r.notes || '')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">No receipts yet.</td></tr>';
  } else if (state.tab === 'logs') {
    const rows = state.logs.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr>
      <td class="mono">${esc(r.created_at || '')}</td>
      <td>${esc(r.staff_name || '—')}<div class="muted mono">${esc(r.staff_id || '')}</div></td>
      <td><span class="warn">${esc(r.action || '')}</span></td>
      <td class="mono">${esc(r.target_id || '—')}</td>
      <td class="muted">${esc(r.details || '')}</td>
    </tr>`).join('') || '<tr><td colspan="5">No logs yet.</td></tr>';
  } else {
    const rows = state.customers.slice(0, 6);
    $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Manager</th><th>Status</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => {
      const manager = state.staff.find((s) => s.id === r.manager_staff_id);
      const code = r.display_gc || r.gc_code || r.code || '—';
      return `<tr>
        <td class="mono">${esc(code)}</td>
        <td><b>${esc(r.name || '—')}</b><div class="muted">${esc(r.city || '')}</div></td>
        <td>${esc(r.phone || '—')}</td>
        <td>${esc(r.email || '—')}</td>
        <td>${esc(manager?.full_name || '—')}</td>
        <td>${badge(r.is_active)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">No customer accounts loaded yet.</td></tr>';
  }
}
async function refreshAnalytics() {
  if (!adminDashboard || !$('analyticsStatsRow')) return;
  const metrics = await adminDashboard.calculateMetrics().catch(() => null);
  if (!metrics) return;
  const g = (k) => metrics.get(k);
  $('analyticsStatsRow').innerHTML = `
    <div class="stat"><b>${money(g('totalRevenue')?.value)}</b><span>Revenue (30d)</span></div>
    <div class="stat"><b>${money(g('outstandingBalance')?.value)}</b><span>Outstanding</span></div>
    <div class="stat"><b>${g('activeShipments')?.value ?? 0}</b><span>Active shipments</span></div>
    <div class="stat"><b>${g('deliveredToday')?.value ?? 0}</b><span>Delivered today</span></div>
    <div class="stat"><b>${g('newCustomers')?.value ?? 0}</b><span>New customers (30d)</span></div>
    <div class="stat"><b>${g('avgDeliveryTime')?.value ?? 0}</b><span>Avg delivery (days)</span></div>
    <div class="stat"><b>${g('deliverySuccessRate')?.value ?? 0}%</b><span>Success rate</span></div>
    <div class="stat"><b>${g('totalMessages')?.value ?? 0}</b><span>Messages (30d)</span></div>
  `;
}
async function refreshAll() {
  if (!state.session) return;
  $('refreshBtn').classList.add('loading');
  setLoadError('');
  try {
    const settled = await Promise.allSettled([
      authFetch('/?kind=customer'),
      authFetch('/?kind=staff'),
      authFetch('/?kind=receipt'),
      opsFetch('/?kind=shipments'),
      authFetch('/?kind=log'),
    ]);
    const [customers, staff, receipts, logs, shipments] = settled;
    if (customers.status === 'fulfilled') state.customers = customers.value.items || []; else console.error(customers.reason);
    if (staff.status === 'fulfilled') state.staff = staff.value.items || []; else console.error(staff.reason);
    if (receipts.status === 'fulfilled') state.receipts = receipts.value.items || []; else console.error(receipts.reason);
    if (logs.status === 'fulfilled') state.logs = logs.value.items || []; else console.error(logs.reason);
    if (shipments.status === 'fulfilled') state.shipments = shipments.value.items || []; else console.error(shipments.reason);

    const failed = settled
      .map((r, i) => (r.status === 'rejected' ? ['customers','staff','receipts','logs','shipments'][i] : null))
      .filter(Boolean);
    if (failed.length) setLoadError(`Some panels failed to load: ${failed.join(', ')}`);

    loadManagerOptions();
    $('statsRow').innerHTML = `<div class="stat"><b>${state.customers.length}</b><span>Customers</span></div><div class="stat"><b>${state.staff.length}</b><span>Staff</span></div><div class="stat"><b>${state.shipments.length}</b><span>Shipments</span></div><div class="stat"><b>${state.receipts.length}</b><span>Receipts</span></div><div class="stat"><b>${state.logs.length}</b><span>Logs</span></div>`;
    const name = state.session.user.user_metadata?.full_name || state.session.user.email?.split('@')[0] || 'Staff';
    $('whoami').textContent = `${name} · ${state.session.user.email || ''}`;
    $('whoamiSub').textContent = `${roleLabel[state.role] || state.role} access active`;
    renderList();
    refreshAnalytics();
  } finally { $('refreshBtn').classList.remove('loading'); }
}
async function resolveCurrentRole(user) {
  const freshUser = user || (await sb.auth.getUser()).data.user;
  let role = freshUser?.app_metadata?.role || freshUser?.user_metadata?.role || 'guest';
  try {
    const staffRes = await authFetch('/?kind=staff');
    const row = (staffRes.items || []).find((s) => s.id === freshUser?.id);
    if (row?.role) role = row.role;
  } catch {}
  state.role = role; showRole(role); return role;
}
async function syncSessionUI() {
  await sb.auth.refreshSession().catch(() => null);
  const { data: { session } } = await sb.auth.getSession();
  state.session = session || null;
  if (session) {
    $('logoutBtn').classList.remove('hidden');
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user) state.session = { ...session, user };
      await resolveCurrentRole(user);
      $('authGate').classList.add('hidden');
      await refreshAll();
    } catch (err) {
      await sb.auth.signOut(); state.session = null; state.role = 'guest';
      $('authGate').classList.remove('hidden'); $('logoutBtn').classList.add('hidden'); $('roleBadge').classList.add('hidden');
      $('whoami').textContent = 'Not signed in'; $('whoamiSub').textContent = 'Waiting for staff authentication';
      setMsg($('loginMsg'), 'Your session expired — please sign in again.');
    }
  } else {
    $('authGate').classList.remove('hidden'); $('logoutBtn').classList.add('hidden'); $('roleBadge').classList.add('hidden');
    $('whoami').textContent = 'Not signed in'; $('whoamiSub').textContent = 'Waiting for staff authentication';
  }
}
$('staffLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); setMsg($('loginMsg'), 'Signing in...');
  try { const email = $('loginEmail').value.trim(); const password = $('loginPassword').value; const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; setMsg($('loginMsg'), 'Signed in successfully', true); await syncSessionUI(); }
  catch (err) { setMsg($('loginMsg'), err.message || 'Login failed'); }
});
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); await syncSessionUI(); });
$('refreshBtn').addEventListener('click', refreshAll);
$('searchBox').addEventListener('input', renderList);
function setDrawer(open){const tabs=$('consoleTabs');const backdrop=$('drawerBackdrop');const toggle=$('navToggle');if(!tabs)return;tabs.classList.toggle('drawer-open',open);backdrop?.classList.toggle('open',open);document.body.classList.toggle('drawer-locked',open);toggle?.setAttribute('aria-expanded',String(open));toggle?.setAttribute('aria-label',open?'Close navigation':'Open navigation');}
document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => { setActiveTab(btn.dataset.tab); setDrawer(false); }));
$('navToggle')?.addEventListener('click',()=>setDrawer(!$('consoleTabs')?.classList.contains('drawer-open')));
$('drawerClose')?.addEventListener('click',()=>setDrawer(false));
$('drawerBackdrop')?.addEventListener('click',()=>setDrawer(false));
$('customerClearBtn').addEventListener('click', resetCustomerForm);
$('staffClearBtn').addEventListener('click', resetStaffForm);
$('receiptClearBtn').addEventListener('click', resetReceiptForm);
$('shipmentClearBtn').addEventListener('click', resetShipmentForm);
['customerForm', 'staffForm', 'receiptForm'].forEach((id) => window.formValidator.initializeForm(id, { manageSubmit: false }));
$('customerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.formValidator.validateForm('customerForm')) { setMsg($('customerMsg'), 'Please fix the highlighted fields'); return; }
  setMsg($('customerMsg'), 'Saving customer...');
  try {
    const payload = { id: $('customerId').value || undefined, gc_code: $('customerGcCode').value.trim() || undefined, name: $('customerName').value.trim(), email: $('customerEmail').value.trim(), phone: $('customerPhone').value.trim(), phone2: $('customerPhone2').value.trim(), city: $('customerCity').value.trim(), delivery_location: $('customerDelivery').value.trim(), note: $('customerNote').value.trim(), manager_staff_id: $('customerManager').value || null, is_active: $('customerStatus').value === 'true', send_invite: $('customerInvite').value === 'true', password: $('customerPassword').value.trim() || undefined };
    const action = $('customerId').value ? 'update' : 'create';
    const res = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'customer', action, data: payload }) });
    const assignedCode = res.customer?.gc_code || res.customer?.code || $('customerGcCode').value.trim(); setMsg($('customerMsg'), action === 'create' ? `Customer saved${assignedCode ? ` · ${assignedCode}` : ''}${res.warning ? ' · ' + res.warning : ''}` : 'Customer updated', true);
    resetCustomerForm(); await refreshAll(); setActiveTab('customers');
  } catch (err) { setMsg($('customerMsg'), err.message || 'Failed to save customer'); }
});
$('staffForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.formValidator.validateForm('staffForm')) { setMsg($('staffMsg'), 'Please fix the highlighted fields'); return; }
  setMsg($('staffMsg'), 'Saving staff...');
  try {
    const payload = { id: $('staffId').value || undefined, full_name: $('staffFullName').value.trim(), email: $('staffEmail').value.trim(), role: $('staffRole').value, branch: $('staffBranch').value, send_invite: $('staffInvite').value === 'true', password: $('staffPassword').value.trim() || undefined };
    const action = $('staffId').value ? 'update' : 'create';
    const res = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'staff', action, data: payload }) });
    setMsg($('staffMsg'), action === 'create' ? `Staff saved${res.warning ? ' · ' + res.warning : ''}` : 'Staff updated', true);
    resetStaffForm(); await refreshAll(); setActiveTab('staff');
  } catch (err) { setMsg($('staffMsg'), err.message || 'Failed to save staff'); }
});
$('receiptPhotos').addEventListener('change', () => {
  const files = Array.from($('receiptPhotos').files || []);
  $('receiptPreview').innerHTML = files.map((file) => `<div><img src="${URL.createObjectURL(file)}" alt=""><div class="small">${esc(file.name)}</div></div>`).join('');
});
$('shipmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('shipmentCustomerCode').value.trim();
  const customer = state.customers.find((r) => String(r.gc_code || r.code || '').toLowerCase() === code.toLowerCase() || String(r.name || '').toLowerCase() === code.toLowerCase());
  if (!customer) { setMsg($('shipmentMsg'), 'Customer not found. Enter an existing GC code or exact customer name.'); return; }
  setMsg($('shipmentMsg'), $('shipmentId').value ? 'Updating shipment…' : 'Creating shipment…');
  const status = $('shipmentStatus').value;
  const stepMap = { pending: 0, warehouse: 1, in_transit: 2, erbil_arrived: 3, delivered: 4, cancelled: 0 };
  const payload = { id: $('shipmentId').value || undefined, directory_customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone, customer_email: customer.email, batch_code: $('shipmentBatch').value.trim() || undefined, origin_key: $('shipmentOrigin').value, dest_key: $('shipmentDestination').value, type: $('shipmentType').value, weight_kg: Number($('shipmentWeight').value || 0), volume_cbm: Number($('shipmentVolume').value || 0), items_count: Number($('shipmentItems').value || 0), total_amount: Number($('shipmentTotal').value || 0), paid_amount: Number($('shipmentPaid').value || 0), operational_status: status, current_step_index: stepMap[status] ?? 0, eta: $('shipmentEta').value || undefined, priority: $('shipmentPriority').value, branch: $('shipmentBranch').value, notes: $('shipmentNotes').value.trim() };
  try { const action = payload.id ? 'update' : 'create'; const res = await opsFetch('/', { method:'POST', body: JSON.stringify({ kind:'shipments', action, data:payload }) }); setMsg($('shipmentMsg'), `Shipment ${action === 'create' ? 'created' : 'updated'} successfully`, true); resetShipmentForm(); await refreshAll(); setActiveTab('shipments'); } catch (err) { setMsg($('shipmentMsg'), err.message || 'Could not save shipment'); }
});
$('receiptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.formValidator.validateForm('receiptForm')) { setMsg($('receiptMsg'), 'Please fix the highlighted fields'); return; }
  setMsg($('receiptMsg'), 'Uploading receipt...');
  try {
    const formData = new FormData();
    formData.append('kind', 'receipt'); formData.append('action', 'create');
    formData.append('batch_code', $('receiptBatch').value.trim()); formData.append('location', $('receiptLocation').value); formData.append('customer_code', $('receiptCustomerCode').value.trim()); formData.append('customer_phone', $('receiptCustomerPhone').value.trim()); formData.append('notes', $('receiptNotes').value.trim());
    for (const file of Array.from($('receiptPhotos').files || [])) formData.append('photos', file);
    const res = await authFetch('/', { method: 'POST', body: formData });
    setMsg($('receiptMsg'), `Receipt saved: ${res.receipt.batch_code}${res.customer ? ' · linked to customer' : ''}`, true);
    // Optional: notify the customer via WhatsApp (prefilled wa.me link — staff
    // taps Send). Uses whatsapp-messenger.js directly with the phone typed
    // into this form, so it doesn't depend on the edge function's response shape.
    const notifyPhone = $('receiptCustomerPhone').value.trim();
    if (notifyPhone && window.whatsappMessenger && confirm('Send a WhatsApp warehouse-arrival notice to this customer?')) {
      window.whatsappMessenger.sendMessage(notifyPhone, 'warehouseReceived', {
        location: $('receiptLocation').value,
        timestamp: new Date().toLocaleString(),
        orderId: $('receiptBatch').value.trim(),
      });
    }
    resetReceiptForm(); await refreshAll(); setActiveTab('receipts');
  } catch (err) { setMsg($('receiptMsg'), err.message || 'Failed to save receipt'); }
});
window.editShipment = (row) => { $('shipmentId').value=row.id||''; const c=state.customers.find((x)=>x.id===row.directory_customer_id); $('shipmentCustomerCode').value=c?.gc_code||c?.code||row.customer_name||''; $('shipmentBatch').value=row.batch_code||''; $('shipmentOrigin').value=row.origin_key||'china'; $('shipmentDestination').value=row.dest_key||'erbil'; $('shipmentType').value=row.type||'air'; $('shipmentWeight').value=row.weight_kg??''; $('shipmentVolume').value=row.volume_cbm??''; $('shipmentItems').value=row.items_count??''; $('shipmentTotal').value=row.total_amount??''; $('shipmentPaid').value=row.paid_amount??''; $('shipmentStatus').value=row.operational_status||'pending'; $('shipmentEta').value=row.eta?String(row.eta).slice(0,10):''; $('shipmentPriority').value=row.priority||'normal'; $('shipmentBranch').value=row.branch||'all'; $('shipmentNotes').value=row.notes||''; setActiveTab('shipments'); $('shipmentForm').scrollIntoView({behavior:'smooth',block:'start'}); };
window.editCustomer = (row) => {
  window.formValidator.resetForm('customerForm');
  $('customerId').value = row.id || ''; $('customerGcCode').value = row.gc_code || row.code || ''; $('customerName').value = row.name || ''; $('customerEmail').value = row.email || ''; $('customerPhone').value = row.phone || ''; $('customerPhone2').value = row.phone2 || ''; $('customerCity').value = row.city || ''; $('customerDelivery').value = row.delivery_location || ''; $('customerManager').value = row.manager_staff_id || ''; $('customerStatus').value = String(Boolean(row.is_active)); $('customerNote').value = row.note || ''; $('customerInvite').value = row.auth_user_id ? 'false' : 'true'; $('customerPassword').value = ''; setActiveTab('customers'); $('customerForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.editStaff = (row) => {
  window.formValidator.resetForm('staffForm');
  $('staffId').value = row.id || ''; $('staffFullName').value = row.full_name || ''; $('staffEmail').value = row.email || ''; $('staffRole').value = row.role || 'admin'; $('staffBranch').value = row.branch || 'all'; $('staffInvite').value = row.auth_user_id ? 'false' : 'true'; $('staffPassword').value = ''; setActiveTab('staff'); $('staffForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.bindCustomerAccount = async (id) => {
  const password = prompt('Optional password (minimum 12 characters). Leave empty to generate a temporary password:') || '';
  try {
    const row = state.customers.find((item) => String(item.id) === String(id)) || {}; const res = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'customer', action: 'create', data: { id, gc_code: row.gc_code || row.code, name: row.name, email: row.email || undefined, phone: row.phone || undefined, phone2: row.phone2 || undefined, city: row.city || undefined, delivery_location: row.delivery_location || undefined, manager_staff_id: row.manager_staff_id || null, is_active: true, send_invite: false, password: password || undefined } }) });
    alert(`GC: ${res.gc_code}\nLogin password: ${res.temporary_password}\n\nئەم وشەی نهێنییە تەنها ئێستا پیشان دەدرێت؛ بە شێوەی پارێزراو بۆ کڕیار بنێرە.`);
    await refreshAll();
  } catch (err) { alert(err.message || 'Unable to bind customer login'); }
};
window.archiveCustomerAccount = async (id) => {
  if (!confirm('Archive this customer account?')) return;
  try { await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'customer', action: 'archive', data: { id } }) }); await refreshAll(); }
  catch (err) { alert(err.message || 'Unable to archive customer'); }
};
window.archiveStaffAccount = async (id) => {
  if (!confirm('Deactivate this staff account?')) return;
  try { await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'staff', action: 'archive', data: { id } }) }); await refreshAll(); }
  catch (err) { alert(err.message || 'Unable to deactivate staff'); }
};
window.addEventListener('hashchange', () => {
  const tab = location.hash.replace('#', '');
  if (VALID_TABS.includes(tab)) setActiveTab(tab);
});
const initialTab = location.hash.replace('#', '');
setActiveTab(VALID_TABS.includes(initialTab) ? initialTab : 'dashboard');
syncSessionUI();
