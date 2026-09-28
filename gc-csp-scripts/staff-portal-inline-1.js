const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
const API_URL = `${SUPABASE_URL}/functions/v1/account-admin`;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
window.sb = sb;
const adminDashboard = typeof AdminDashboard !== 'undefined' ? new AdminDashboard(sb) : null;
const state = { tab: 'dashboard', session: null, role: 'guest', customers: [], staff: [], receipts: [], logs: [], theme: localStorage.getItem('gc-theme') || 'dark' };
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const badge = (active) => `<span class="${active ? 'ok' : 'warn'}">${active ? 'ACTIVE' : 'INACTIVE'}</span>`;
const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', accountant: 'Accountant' };
const roleClass = (r) => r === 'super_admin' ? 'badge-super' : r === 'accountant' ? 'badge-accountant' : 'badge-admin';
function setMsg(el, text, ok = false) { el.textContent = text || ''; el.style.color = ok ? 'var(--good)' : 'var(--muted)'; }
function setLoadError(text) { const el = $('loadStatus'); el.textContent = text || ''; el.classList.toggle('warn', Boolean(text)); el.classList.toggle('ok', false); }
function showRole(role) { const el = $('roleBadge'); el.className = `badge ${roleClass(role)}`; el.textContent = `${roleLabel[role] || role || 'Guest'} access`; }
function setTheme(theme){ state.theme = theme === 'light' ? 'light' : 'dark'; localStorage.setItem('gc-theme', state.theme); document.documentElement.dataset.theme = state.theme; $('themeBtn').textContent = state.theme === 'light' ? '☀️ Light' : '🌙 Dark'; }
function greet(){
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
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
function setActiveTab(tab) {
  state.tab = tab;
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('listTitle').textContent = tab === 'customers' ? 'Customer accounts' : tab === 'staff' ? 'Staff accounts' : tab === 'receipts' ? 'Warehouse receipts' : tab === 'logs' ? 'Activity logs' : 'Overview';
  $('listSubtitle').textContent = tab === 'customers' ? 'Create, edit, archive, and link customer accounts' : tab === 'staff' ? 'Manage staff roles and access' : tab === 'receipts' ? 'Goods received in Dubai, China, or Erbil with photos' : tab === 'logs' ? 'Latest management activity' : 'Latest customer accounts and records';
  renderList();
}
function loadManagerOptions() {
  const options = '<option value="">Unassigned</option>' + state.staff.map((s) => `<option value="${esc(s.id)}">${esc(s.full_name)} (${esc(s.role)})</option>`).join('');
  if ($('customerManager')) $('customerManager').innerHTML = options;
}
function renderList() {
  const q = $('searchBox').value.trim().toLowerCase();
  if (state.tab === 'customers') {
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
        <td><div class="table-actions"><a class="btn btn-outline" href="./accounts-console.html#customers">Edit</a><a class="btn btn-danger" href="./accounts-console.html#customers">Archive</a></div></td>
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
      <td><div class="table-actions"><a class="btn btn-outline" href="./accounts-console.html#staff">Edit</a><a class="btn btn-danger" href="./accounts-console.html#staff">Deactivate</a></div></td>
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
function exportCsv(){
  const rows = state.customers.map((r) => ({
    code: r.display_gc || r.gc_code || r.code || '',
    name: r.name || '',
    phone: r.phone || '',
    phone2: r.phone2 || '',
    email: r.email || '',
    city: r.city || '',
    manager: state.staff.find((s) => s.id === r.manager_staff_id)?.full_name || '',
    active: r.is_active ? 'active' : 'inactive',
  }));
  const headers = ['code','name','phone','phone2','email','city','manager','active'];
  const csv = [headers.join(',')].concat(rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'globall-cloud-customers.csv';
  a.click();
  URL.revokeObjectURL(url);
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
      authFetch('/?kind=log'),
    ]);
    const [customers, staff, receipts, logs] = settled;
    if (customers.status === 'fulfilled') state.customers = customers.value.items || []; else console.error(customers.reason);
    if (staff.status === 'fulfilled') state.staff = staff.value.items || []; else console.error(staff.reason);
    if (receipts.status === 'fulfilled') state.receipts = receipts.value.items || []; else console.error(receipts.reason);
    if (logs.status === 'fulfilled') state.logs = logs.value.items || []; else console.error(logs.reason);

    const failed = settled.map((r, i) => (r.status === 'rejected' ? ['customers','staff','receipts','logs'][i] : null)).filter(Boolean);
    if (failed.length) setLoadError(`Some panels failed to load: ${failed.join(', ')}`);

    loadManagerOptions();
    $('statsRow').innerHTML = `<div class="stat"><b>${state.customers.length}</b><span>Customers</span></div><div class="stat"><b>${state.staff.length}</b><span>Staff</span></div><div class="stat"><b>${state.receipts.length}</b><span>Receipts</span></div><div class="stat"><b>${state.logs.length}</b><span>Logs</span></div>`;
    const name = state.session.user.user_metadata?.full_name || state.session.user.email?.split('@')[0] || 'Staff';
    $('heroName').textContent = `${greet()}, ${name}`;
    $('heroSub').textContent = `${state.role === 'guest' ? 'Guest' : (roleLabel[state.role] || state.role)} access active · ${state.session.user.email || ''}`;
    $('avatarBox').textContent = (name || 'GC').split(' ').slice(0,2).map((s) => s[0] || '').join('').toUpperCase().slice(0,2) || 'GC';
    $('syncText').textContent = `Synced ${new Date().toLocaleString()}`;
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
      console.error(err);
      await sb.auth.signOut();
      state.session = null; state.role = 'guest';
      $('authGate').classList.remove('hidden'); $('logoutBtn').classList.add('hidden'); $('heroName').textContent = 'Waiting for staff sign-in';
      $('heroSub').textContent = 'Use your staff email and password to unlock customer accounts, staff controls, warehouse receipts, and activity logs.';
      setLoadError('Unable to verify staff session.');
    }
  } else {
    $('authGate').classList.remove('hidden');
    $('logoutBtn').classList.add('hidden');
    $('heroName').textContent = 'Waiting for staff sign-in';
    $('heroSub').textContent = 'Use your staff email and password to unlock customer accounts, staff controls, warehouse receipts, and activity logs.';
    setLoadError('');
  }
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));
$('searchBox').addEventListener('input', renderList);
$('refreshBtn').addEventListener('click', () => refreshAll());
$('exportBtn').addEventListener('click', exportCsv);
$('themeBtn').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); state.session = null; await syncSessionUI(); });
$('staffLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('loginMsg');
  setMsg(msg, 'Signing in...');
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { setMsg(msg, error.message || 'Sign in failed'); return; }
  setMsg(msg, 'Signed in successfully', true);
  await syncSessionUI();
});
window.addEventListener('hashchange', () => {
  const tab = (location.hash || '#dashboard').slice(1);
  setActiveTab(['dashboard','customers','staff','receipts','logs'].includes(tab) ? tab : 'dashboard');
});
setTheme(state.theme);
setActiveTab((location.hash || '#dashboard').slice(1));
syncSessionUI();
