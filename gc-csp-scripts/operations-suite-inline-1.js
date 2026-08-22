const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API_URL = `${SUPABASE_URL}/functions/v1/account-admin`;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
window.sb = sb;
const dashboard = new AdminDashboard(sb);
const state = { session: null, role: 'guest', tab: 'overview', customers: [], staff: [], receipts: [], logs: [], settings: [], pricing: null, errors: [] };
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', accountant: 'Accountant' };
const roleClass = (r) => r === 'super_admin' ? 'badge-super' : r === 'accountant' ? 'badge-accountant' : 'badge-admin';
const badge = (active) => `<span class="${active ? 'ok' : 'warn'}">${active ? 'ACTIVE' : 'INACTIVE'}</span>`;

function setMsg(text, kind = '') {
  const el = $('loadStatus');
  el.textContent = text || '';
  el.className = 'status-line' + (kind ? ` ${kind}` : '');
}
function setLoginMsg(text, kind = '') {
  const el = $('loginMsg');
  el.textContent = text || '';
  el.className = 'status-line' + (kind ? ` ${kind}` : '');
}
function setRole(role) {
  state.role = role || 'guest';
  $('roleBadgeWrap').innerHTML = `<span class="badge ${roleClass(state.role)}">${roleLabel[state.role] || state.role || 'Guest'} access active</span>`;
}
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
async function resolveRole(user) {
  const fresh = user || (await sb.auth.getUser()).data.user;
  let role = fresh?.app_metadata?.role || fresh?.user_metadata?.role || 'guest';
  try {
    const staffRes = await authFetch('/?kind=staff');
    const row = (staffRes.items || []).find((s) => s.id === fresh?.id);
    if (row?.role) role = row.role;
  } catch (err) {
    console.warn('role lookup failed', err);
  }
  setRole(role);
  return role;
}
function setView(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const titles = {
    overview: ['Overview', 'A clean snapshot of the latest accounts and records.'],
    customers: ['Customer accounts', 'Create, edit, archive, and link customer accounts.'],
    staff: ['Staff accounts', 'Manage staff roles and access with one controlled flow.'],
    receipts: ['Warehouse receipts', 'Goods received in Dubai, China, or Erbil with photos.'],
    logs: ['Activity logs', 'Latest management activity and audit trail.'],
    settings: ['System settings', 'Live values and operational notes.'],
  };
  $('tableTitle').textContent = titles[tab][0];
  $('tableSubtitle').textContent = titles[tab][1];
  renderTable();
}
function renderTable() {
  const q = $('searchBox').value.trim().toLowerCase();
  if (state.tab === 'overview') {
    const rows = state.customers.slice(0, 6).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Manager</th><th>Status</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => {
      const manager = state.staff.find((s) => s.id === r.manager_staff_id);
      const code = r.display_gc || r.gc_code || r.code || '—';
      return `<tr><td class="mono">${esc(code)}</td><td><b>${esc(r.name || '—')}</b><div class="muted">${esc(r.city || '')}</div></td><td>${esc(r.phone || '—')}</td><td>${esc(r.email || '—')}</td><td>${esc(manager?.full_name || '—')}</td><td>${badge(r.is_active)}</td></tr>`;
    }).join('') || '<tr><td colspan="6">No customer accounts loaded yet.</td></tr>';
    return;
  }
  if (state.tab === 'customers') {
    const rows = state.customers.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Shipments</th><th>Status</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr><td class="mono">${esc(r.display_gc || r.gc_code || r.code || '—')}</td><td><b>${esc(r.name || '—')}</b></td><td>${esc(r.phone || '')}<div class="muted">${esc(r.phone2 || '')}</div></td><td>${esc(r.email || '')}</td><td>${esc(r.city || '')}</td><td><b>${r.shipment_count || 0}</b><div class="muted">${money(r.outstanding_amount || 0)} due</div></td><td>${badge(r.is_active)}</td></tr>`).join('') || '<tr><td colspan="7">No customers found.</td></tr>';
    return;
  }
  if (state.tab === 'staff') {
    const rows = state.staff.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Name</th><th>Email / ID</th><th>Role</th><th>Branch</th><th>Status</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr><td><b>${esc(r.full_name || '—')}</b></td><td class="mono">${esc(r.email || r.id)}</td><td><span class="ok">${esc(r.role || '')}</span></td><td>${esc(r.branch || '')}</td><td>${badge(r.is_active)}</td></tr>`).join('') || '<tr><td colspan="5">No staff found.</td></tr>';
    return;
  }
  if (state.tab === 'receipts') {
    const rows = state.receipts.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Batch</th><th>Location</th><th>Customer</th><th>Received</th><th>Consolidated</th><th>Notes</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr><td class="mono">${esc(r.batch_code || '')}</td><td>${esc(r.location || '')}</td><td>${esc(r.directory_phone || '')}<div class="muted mono">${esc(r.directory_customer_id || '')}</div></td><td>${esc(r.received_at || '')}<div class="muted">${esc(r.created_by_name || '')}</div></td><td>${badge(r.consolidated)}</td><td>${esc(r.notes || '')}</td></tr>`).join('') || '<tr><td colspan="6">No receipts yet.</td></tr>';
    return;
  }
  if (state.tab === 'logs') {
    const rows = state.logs.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr><td class="mono">${esc(r.created_at || '')}</td><td>${esc(r.staff_name || '—')}<div class="muted mono">${esc(r.staff_id || '')}</div></td><td><span class="warn">${esc(r.action || '')}</span></td><td class="mono">${esc(r.target_id || '—')}</td><td class="muted">${esc(r.details || '')}</td></tr>`).join('') || '<tr><td colspan="5">No logs yet.</td></tr>';
    return;
  }
  if (state.tab === 'settings') {
    const rows = state.settings.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $('tableHead').innerHTML = '<tr><th>Key</th><th>Value</th><th>Updated At</th><th>Updated By</th></tr>';
    $('tableBody').innerHTML = rows.map((r) => `<tr><td class="mono">${esc(r.key)}</td><td><b>${esc(r.value)}</b></td><td class="mono">${esc(r.updated_at || '')}</td><td class="mono">${esc(r.updated_by || '')}</td></tr>`).join('') || '<tr><td colspan="4">No settings loaded.</td></tr>';
    return;
  }
}
function renderPricing(pricing) { const consoleEl = $('pricingConsole'); if (!consoleEl) return; const allowed = ['admin','super_admin','accountant'].includes(state.role); consoleEl.classList.toggle('hidden', !allowed); if (!allowed || !pricing) return; const rows = (pricing.rates || []).map((r) => `<div class="rate-row"><label>${esc(r.product_type)}<small>${esc(`${r.origin_key} → ${r.destination_key} · ${r.transport_mode.toUpperCase()}`)}</small></label><input class="rate-input" type="number" min="0" step="0.01" value="${esc(r.amount)}" data-rate-id="${esc(r.id)}" aria-label="${esc(r.product_type)} rate"><span class="mono">${esc(r.currency)} / ${esc(r.unit)}</span><span class="rate-window">${esc(r.transit_min_days ?? '—')}–${esc(r.transit_max_days ?? '—')} days</span><button class="btn btn-primary rate-save" type="button" data-rate-save="${esc(r.id)}">Save</button></div>`).join(''); const fx = (pricing.exchange_rates || [])[0]; const fxRow = fx ? `<div class="rate-row"><label>USD → IQD exchange rate<small>${esc(fx.source_note || 'Current exchange rate')}</small></label><input class="rate-input" type="number" min="0.000001" step="0.000001" value="${esc(fx.rate)}" data-fx-id="${esc(fx.id)}" aria-label="USD to IQD rate"><span class="mono">IQD / USD</span><span class="rate-window">Effective ${esc(fx.effective_from || 'today')}</span><button class="btn btn-primary rate-save" type="button" data-fx-save="${esc(fx.id)}">Save</button></div>` : ''; $('rateList').innerHTML = fxRow + rows || '<div class="setting-card">No active rates found.</div>'; }
async function savePricing(kind, id, input) { const amount = Number(input.value); if (!Number.isFinite(amount) || amount <= 0) { setMsg('Enter a valid positive rate.', 'warn'); return; } input.disabled = true; try { await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'pricing', action: 'update', data: kind === 'exchange' ? { id, rate_type: 'exchange', rate: amount } : { id, amount } }) }); setMsg('Rate updated and audit logged.', 'ok'); await loadData(); } catch (err) { setMsg(err.message || 'Rate update failed.', 'warn'); } finally { input.disabled = false; } }

async function refreshAnalytics() {
  const metrics = await dashboard.calculateMetrics().catch(() => null);
  if (!metrics) return;
  const g = (k) => metrics.get(k);
  $('statsRow').innerHTML = `
    <div class="stat"><b>${money(g('totalRevenue')?.value)}</b><span>Revenue (30d)</span></div>
    <div class="stat"><b>${money(g('outstandingBalance')?.value)}</b><span>Outstanding</span></div>
    <div class="stat"><b>${g('activeShipments')?.value ?? 0}</b><span>Active shipments</span></div>
    <div class="stat"><b>${g('deliveredToday')?.value ?? 0}</b><span>Delivered today</span></div>
  `;
}
async function loadData() {
  if (!state.session) return;
  $('refreshBtn').classList.add('loading');
  setMsg('Loading live data…');
  const settled = await Promise.allSettled([
    authFetch('/?kind=customer'),
    authFetch('/?kind=staff'),
    authFetch('/?kind=receipt'),
    authFetch('/?kind=log'),
    authFetch('/?kind=pricing'),
    sb.from('app_settings').select('key,value,updated_at,updated_by').order('key'),
  ]);
  const [customers, staff, receipts, logs, pricing, settings] = settled;
  state.customers = customers.status === 'fulfilled' ? (customers.value.items || []) : [];
  state.staff = staff.status === 'fulfilled' ? (staff.value.items || []) : [];
  state.receipts = receipts.status === 'fulfilled' ? (receipts.value.items || []) : [];
  state.logs = logs.status === 'fulfilled' ? (logs.value.items || []) : [];
  state.pricing = pricing.status === 'fulfilled' ? pricing.value : null;
  state.settings = settings.status === 'fulfilled' && !settings.value.error ? (settings.value.data || []) : [];
  renderPricing(state.pricing);
  $('rateValue').textContent = state.settings.find((r) => r.key === 'usd_iqd_rate')?.value ? `${Number(state.settings.find((r) => r.key === 'usd_iqd_rate').value).toLocaleString()} IQD` : 'Not set';
  $('sessionLine').innerHTML = `<span class="badge ${roleClass(state.role)}">${roleLabel[state.role] || state.role || 'Guest'}</span><span>Signed in as <span class="mono">${esc(state.session.user.email || '')}</span></span>`;
  $('avatar').textContent = (state.session.user.user_metadata?.full_name || state.session.user.email || 'GC').slice(0, 2).toUpperCase();
  $('heroName').textContent = state.session.user.user_metadata?.full_name || state.session.user.email || 'Staff member';
  $('heroSub').textContent = `${roleLabel[state.role] || state.role} access active · Live data loaded from Supabase`;
  $('logoutBtn').classList.remove('hidden');
  const errors = [customers, staff, receipts, logs, pricing, settings].filter((r) => r.status === 'rejected').map((r) => r.reason?.message || 'load failure');
  state.errors = errors;
  setMsg(errors.length ? `Loaded with ${errors.length} panel warning(s).` : 'Live data loaded successfully.', errors.length ? 'warn' : 'ok');
  await refreshAnalytics();
  renderTable();
  if (errors.length) console.warn('Some panels failed:', errors);
  $('refreshBtn').classList.remove('loading');
}
async function syncSessionUI() {
  await sb.auth.refreshSession().catch(() => null);
  const { data: { session } } = await sb.auth.getSession();
  state.session = session || null;
  if (session) {
    $('authPanel').classList.add('hidden');
    await resolveRole(session.user);
    await loadData();
  } else {
    $('authPanel').classList.remove('hidden');
    $('logoutBtn').classList.add('hidden');
    setRole('guest');
    $('heroName').textContent = 'Sign in to open the command center';
    $('heroSub').textContent = 'Use your staff account to load the full operations dashboard. Customers stay outside this portal.';
    $('statsRow').innerHTML = `<div class="stat"><b>—</b><span>Revenue (30d)</span></div><div class="stat"><b>—</b><span>Outstanding</span></div><div class="stat"><b>—</b><span>Active shipments</span></div><div class="stat"><b>—</b><span>Delivered today</span></div>`;
    setMsg('Waiting for staff authentication.');
  }
}
function exportCurrentView() {
  const rows = state[ state.tab === 'overview' ? 'customers' : state.tab ].slice();
  if (!rows.length) { setMsg('Nothing to export yet.', 'warn'); return; }
  let headers = [];
  if (state.tab === 'overview' || state.tab === 'customers') headers = ['code','name','phone','phone2','email','city','shipment_count','outstanding_amount','is_active'];
  else if (state.tab === 'staff') headers = ['id','full_name','email','role','branch','is_active'];
  else if (state.tab === 'receipts') headers = ['batch_code','location','directory_phone','directory_customer_id','received_at','consolidated','notes'];
  else if (state.tab === 'logs') headers = ['created_at','staff_name','action','target_id','details'];
  else if (state.tab === 'settings') headers = ['key','value','updated_at','updated_by'];
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `globall-cloud-${state.tab}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  setMsg(`Exported ${state.tab} as CSV.`, 'ok');
}

$('rateList')?.addEventListener('click', (e) => { const serviceButton = e.target.closest('[data-rate-save]'); const fxButton = e.target.closest('[data-fx-save]'); if (serviceButton) savePricing('service', serviceButton.dataset.rateSave, document.querySelector(`[data-rate-id="${CSS.escape(serviceButton.dataset.rateSave)}"]`)); if (fxButton) savePricing('exchange', fxButton.dataset.fxSave, document.querySelector(`[data-fx-id="${CSS.escape(fxButton.dataset.fxSave)}"]`)); });
$('tabsRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  setView(btn.dataset.tab);
});
$('searchBox').addEventListener('input', renderTable);
$('refreshBtn').addEventListener('click', async () => { if (state.session) await loadData(); else await syncSessionUI(); });
$('exportBtn').addEventListener('click', exportCurrentView);
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); state.session = null; await syncSessionUI(); });
$('demoBtn').addEventListener('click', () => {
  $('loginEmail').value = 'staff@example.com';
  $('loginPassword').value = '••••••••';
  setLoginMsg('Use your real staff email and password.');
});
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoginMsg('Signing in…');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { setLoginMsg(error.message || 'Sign in failed', 'warn'); return; }
  state.session = data.session || null;
  setLoginMsg('Signed in successfully.', 'ok');
  await syncSessionUI();
});
window.addEventListener('hashchange', () => {
  const hash = (location.hash || '').replace('#','');
  if (hash && document.querySelector(`[data-tab="${hash}"]`)) setView(hash);
});

setView('overview');
syncSessionUI();
