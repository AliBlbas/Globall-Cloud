(function(){
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const API_URL = `${SUPABASE_URL}/functions/v1/account-admin`;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  if (sb) window.sb = sb;
  const adminDashboard = typeof AdminDashboard !== 'undefined' ? new AdminDashboard(sb) : null;
  const state = { tab: 'dashboard', session: null, role: 'guest', customers: [], staff: [], receipts: [], logs: [], lastLoadError: '' };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const badge = (active) => `<span class="${active ? 'ok' : 'warn'}">${active ? 'ACTIVE' : 'INACTIVE'}</span>`;

  const encodeRowData = (row) => encodeURIComponent(JSON.stringify(row || {}));
  const decodeRowData = (value) => { if (!value) return {}; try { return JSON.parse(decodeURIComponent(value)); } catch { return {}; } };

  function setMsg(el, text, ok = false) { el.textContent = text || ''; el.style.color = ok ? 'var(--good)' : 'var(--muted)'; }
  function setLoadError(text) { state.lastLoadError = text || ''; const el = $('loadStatus'); if (el) { el.textContent = text || ''; el.classList.toggle('warn', Boolean(text)); el.classList.toggle('muted', !text); } }
  function showRole(role) { const el = $('roleBadge'); if (!el) return; el.className = `badge ${role === 'super_admin' ? 'badge-super' : role === 'accountant' ? 'badge-accountant' : 'badge-admin'}`; el.textContent = `${role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'accountant' ? 'Accountant' : role} access`; el.classList.remove('hidden'); }

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

  const VALID_TABS = ['dashboard', 'customers', 'staff', 'receipts', 'logs', 'quote'];
  function setActiveTab(tab) {
    state.tab = tab;
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const dashboardPane = $('dashboardPane'); if (dashboardPane) dashboardPane.classList.toggle('hidden', tab !== 'dashboard');
    if ($('customerForm')) $('customerForm').classList.toggle('hidden', tab !== 'customers');
    if ($('staffForm')) $('staffForm').classList.toggle('hidden', tab !== 'staff');
    if ($('receiptForm')) $('receiptForm').classList.toggle('hidden', tab !== 'receipts');
    if ($('quotePane')) $('quotePane').classList.toggle('hidden', tab !== 'quote');
    if ($('listPanel')) $('listPanel').classList.toggle('hidden', tab === 'quote');
    if ($('listTitle')) $('listTitle').textContent = tab === 'customers' ? 'Customer accounts' : tab === 'staff' ? 'Staff accounts' : tab === 'receipts' ? 'Warehouse receipts' : tab === 'logs' ? 'Activity logs' : 'Overview';
    if ($('listSubtitle')) $('listSubtitle').textContent = tab === 'customers' ? 'Create, edit, archive, and link customer accounts' : tab === 'staff' ? 'Manage staff roles and access' : tab === 'receipts' ? 'Goods receipts and warehouse intake' : tab === 'logs' ? 'Recent admin activity' : 'Account overview';
    if (tab !== 'quote') renderList();
  }

  function runQuickQuote() {
    if (!window.priceCalculator) { if ($('quoteResult')) $('quoteResult').textContent = 'price-calculator.js failed to load.'; return; }
    const type = $('quoteType').value; const weight = Number($('quoteWeight').value) || 0; const origin = $('quoteOrigin').value; const destination = $('quoteDest').value; const useSeasonal = $('quoteSeasonal').checked;
    const result = window.priceCalculator.calculateShippingCost(type, weight, origin, destination, { useSeasonal });
    const time = window.priceCalculator.calculateDeliveryTime(type);
    if (!result) { $('quoteResult').textContent = 'Could not calculate — check inputs.'; return; }
    $('quoteResult').innerHTML = `\n      <div class="stats">\n        <div class="stat"><b>${money(result.totalCost)}</b><span>Estimated total (USD)</span></div>\n        <div class="stat"><b>${money(result.baseCost)}</b><span>Base cost</span></div>\n        <div class="stat"><b>${time ? `${time.min}–${time.max} ${time.unit}` : '—'}</b><span>Est. delivery time</span></div>\n      </div>`;
  }

  function loadManagerOptions() { if (!$('customerManager')) return; $('customerManager').innerHTML = '<option value="">Unassigned</option>' + state.staff.map((s) => `<option value="${esc(s.id)}">${esc(s.full_name)} (${esc(s.role)})</option>`).join(''); }
  function resetCustomerForm() { if (window.formValidator) window.formValidator.resetForm('customerForm'); if ($('customerId')) $('customerId').value=''; if ($('customerName')) $('customerName').value=''; if ($('customerEmail')) $('customerEmail').value=''; if ($('customerGcCode')) $('customerGcCode').value=''; if ($('customerManager')) $('customerManager').value=''; }
  function resetStaffForm() { if (window.formValidator) window.formValidator.resetForm('staffForm'); if ($('staffId')) $('staffId').value=''; if ($('staffFullName')) $('staffFullName').value=''; if ($('staffEmail')) $('staffEmail').value=''; if ($('staffRole')) $('staffRole').value='admin'; if ($('staffBranch')) $('staffBranch').value=''; }
  function resetReceiptForm() { if (window.formValidator) window.formValidator.resetForm('receiptForm'); if ($('receiptBatch')) $('receiptBatch').value=''; if ($('receiptLocation')) $('receiptLocation').value='Dubai'; if ($('receiptCustomerCode')) $('receiptCustomerCode').value=''; if ($('receiptCargoType')) $('receiptCargoType').value=''; if ($('receiptCustomerPhone')) $('receiptCustomerPhone').value=''; if ($('receiptPhotos')) $('receiptPhotos').value=''; if ($('receiptPreview')) $('receiptPreview').innerHTML=''; }

  function renderList() {
    if (state.tab === 'quote') return;
    const q = ($('searchBox') && $('searchBox').value) ? $('searchBox').value.trim().toLowerCase() : '';
    if (state.tab === 'customers') {
      const rows = state.customers.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
      if ($('tableHead')) $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Manager</th><th>Shipments</th><th>Status</th><th>Actions</th></tr>';
      if ($('tableBody')) $('tableBody').innerHTML = rows.map((r) => {
        const manager = state.staff.find((s) => s.id === r.manager_staff_id);
        const code = r.display_gc || r.gc_code || r.code || '—';
        return `<tr>\n        <td class="mono">${esc(code)}</td>\n        <td><b>${esc(r.name || '—')}</b><div class="muted">${esc(r.city || '')}</div></td>\n        <td>${esc(r.phone || '')}<div class="muted">${esc(r.phone2 || '')}</div></td>\n        <td>${esc(r.email || '')}</td>\n        <td>${esc(manager?.full_name || '—')}<div class="muted">${esc(manager?.role || '')}</div></td>\n        <td><b>${r.shipment_count || 0}</b><div class="muted">${money(r.outstanding_amount || 0)} due</div></td>\n        <td>${badge(r.is_active)}</td>\n        <td><div class="toolbar"><button class="btn btn-outline" type="button" data-action="edit-customer" data-row="${encodeRowData(r)}">Edit</button><button class="btn btn-danger" type="button" data-action="archive-customer" data-id="${esc(String(r.id || ''))}">Archive</button></div></td>\n      </tr>`;
      }).join('') || '<tr><td colspan="8">No customers found.</td></tr>';
    } else if (state.tab === 'staff') {
      const rows = state.staff.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
      if ($('tableHead')) $('tableHead').innerHTML = '<tr><th>Name</th><th>Email / ID</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr>';
      if ($('tableBody')) $('tableBody').innerHTML = rows.map((r) => `<tr>\n      <td><b>${esc(r.full_name || '—')}</b><div class="muted mono">${(String(r.full_name || '?').split(' ').slice(0,2).map((s) => s[0] || '').join('')).toUpperCase()}</div></td>\n      <td class="mono">${esc(r.email || r.id)}</td>\n      <td><span class="ok">${esc(r.role || '')}</span></td>\n      <td>${esc(r.branch || '')}</td>\n      <td>${badge(r.is_active)}</td>\n      <td><div class="toolbar"><button class="btn btn-outline" type="button" data-action="edit-staff" data-row="${encodeRowData(r)}">Edit</button><button class="btn btn-danger" type="button" data-action="archive-staff" data-id="${esc(String(r.id || ''))}">Disable</button></div></td>\n    </tr>`).join('') || '<tr><td colspan="6">No staff found.</td></tr>';
    } else if (state.tab === 'receipts') {
      const rows = state.receipts.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
      if ($('tableHead')) $('tableHead').innerHTML = '<tr><th>Batch</th><th>Location</th><th>Customer</th><th>Photos</th><th>Received</th><th>Notes</th></tr>';
      if ($('tableBody')) $('tableBody').innerHTML = rows.map((r) => {
        const photos = Array.isArray(r.photos) ? r.photos : [];
        return `<tr>\n        <td class="mono">${esc(r.batch_code || '')}</td>\n        <td>${esc(r.location || '')}</td>\n        <td>${esc(r.directory_phone || '')}<div class="muted mono">${esc(r.directory_customer_id || '')}</div></td>\n        <td>${photos.length} photos<div class="receipt-files">${photos.slice(0,3).map((p) => `<a href="${esc(p)}" target="_blank" rel="noreferrer"><img src="${esc(p)}" alt="receipt"></a>`).join('')}</div></td>\n        <td>${esc(r.received_at || '')}<div class="muted">${esc(r.created_by_name || '')}</div></td>\n        <td>${esc(r.notes || '')}</td>\n      </tr>`;
      }).join('') || '<tr><td colspan="6">No receipts yet.</td></tr>';
    } else if (state.tab === 'logs') {
      const rows = state.logs.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
      if ($('tableHead')) $('tableHead').innerHTML = '<tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr>';
      if ($('tableBody')) $('tableBody').innerHTML = rows.map((r) => `<tr>\n      <td class="mono">${esc(r.created_at || '')}</td>\n      <td>${esc(r.staff_name || '—')}<div class="muted mono">${esc(r.staff_id || '')}</div></td>\n      <td><span class="warn">${esc(r.action || '')}</span></td>\n      <td class="mono">${esc(r.target_id || '—')}</td>\n      <td class="muted">${esc(r.details || '')}</td>\n    </tr>`).join('') || '<tr><td colspan="5">No logs yet.</td></tr>';
    } else {
      const rows = state.customers.slice(0, 6);
      if ($('tableHead')) $('tableHead').innerHTML = '<tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Manager</th><th>Status</th></tr>';
      if ($('tableBody')) $('tableBody').innerHTML = rows.map((r) => {
        const manager = state.staff.find((s) => s.id === r.manager_staff_id);
        const code = r.display_gc || r.gc_code || r.code || '—';
        return `<tr>\n        <td class="mono">${esc(code)}</td>\n        <td><b>${esc(r.name || '—')}</b><div class="muted">${esc(r.city || '')}</div></td>\n        <td>${esc(r.phone || '—')}</td>\n        <td>${esc(r.email || '—')}</td>\n        <td>${esc(manager?.full_name || '—')}</td>\n        <td>${badge(r.is_active)}</td>\n      </tr>`;
      }).join('') || '<tr><td colspan="6">No customer accounts loaded yet.</td></tr>';
    }
  }

  async function refreshAnalytics() {
    if (!adminDashboard || !$('analyticsStatsRow')) return;
    const metrics = await adminDashboard.calculateMetrics().catch(() => null);
    if (!metrics) return; const g = (k) => metrics.get(k);
    $('analyticsStatsRow').innerHTML = `\n      <div class="stat"><b>${money(g('totalRevenue')?.value)}</b><span>Revenue (30d)</span></div>\n      <div class="stat"><b>${money(g('outstandingBalance')?.value)}</b><span>Outstanding</span></div>\n      <div class="stat"><b>${g('activeShipments')?.value ?? 0}</b><span>Active shipments</span></div>\n      <div class="stat"><b>${g('deliveredToday')?.value ?? 0}</b><span>Delivered today</span></div>\n      <div class="stat"><b>${g('newCustomers')?.value ?? 0}</b><span>New customers (30d)</span></div>\n      <div class="stat"><b>${g('avgDeliveryTime')?.value ?? 0}</b><span>Avg delivery (days)</span></div>\n      <div class="stat"><b>${g('deliverySuccessRate')?.value ?? 0}%</b><span>Success rate</span></div>\n      <div class="stat"><b>${g('totalMessages')?.value ?? 0}</b><span>Messages (30d)</span></div>\n    `;
  }

  async function refreshAll() {
    if (!state.session) return; if ($('refreshBtn')) $('refreshBtn').classList.add('loading'); setLoadError('');
    try {
      const settled = await Promise.allSettled([
        authFetch('/?kind=customer'), authFetch('/?kind=staff'), authFetch('/?kind=receipt'), authFetch('/?kind=log'),
      ]);
      const [customers, staff, receipts, logs] = settled;
      if (customers.status === 'fulfilled') state.customers = customers.value.items || []; else console.error(customers.reason);
      if (staff.status === 'fulfilled') state.staff = staff.value.items || []; else console.error(staff.reason);
      if (receipts.status === 'fulfilled') state.receipts = receipts.value.items || []; else console.error(receipts.reason);
      if (logs.status === 'fulfilled') state.logs = logs.value.items || []; else console.error(logs.reason);
      const failed = settled.map((r, i) => (r.status === 'rejected' ? ['customers','staff','receipts','logs'][i] : null)).filter(Boolean);
      if (failed.length) setLoadError(`Some panels failed to load: ${failed.join(', ')}`);
      loadManagerOptions();
      if ($('statsRow')) $('statsRow').innerHTML = `<div class="stat"><b>${state.customers.length}</b><span>Customers</span></div><div class="stat"><b>${state.staff.length}</b><span>Staff</span></div><div class="stat"><b>${state.receipts.length}</b><span>Receipts</span></div><div class="stat"><b>${state.logs.length}</b><span>Logs</span></div>`;
      const name = state.session.user.user_metadata?.full_name || state.session.user.email?.split('@')[0] || 'Staff'; if ($('whoami')) $('whoami').textContent = `${name} · ${state.session.user.email || ''}`; if ($('whoamiSub')) $('whoamiSub').textContent = `${state.role || 'guest'} access active`;
      renderList(); refreshAnalytics();
    } finally { if ($('refreshBtn')) $('refreshBtn').classList.remove('loading'); }
  }

  async function resolveCurrentRole(user) {
    const freshUser = user || (await sb.auth.getUser()).data.user; let role = freshUser?.app_metadata?.role || freshUser?.user_metadata?.role || 'guest';
    try { const staffRes = await authFetch('/?kind=staff'); const row = (staffRes.items || []).find((s) => s.id === freshUser?.id); if (row?.role) role = row.role; } catch {}
    state.role = role; showRole(role); return role;
  }

  async function syncSessionUI() {
    await sb.auth.refreshSession().catch(() => null); const { data: { session } } = await sb.auth.getSession(); state.session = session || null;
    if (session) {
      if ($('logoutBtn')) $('logoutBtn').classList.remove('hidden');
      try { const { data: { user } } = await sb.auth.getUser(); if (user) state.session = { ...session, user }; await resolveCurrentRole(user); if ($('authGate')) $('authGate').classList.add('hidden'); await refreshAll(); }
      catch (err) { await sb.auth.signOut(); state.session = null; state.role = 'guest'; if ($('authGate')) $('authGate').classList.remove('hidden'); if ($('logoutBtn')) $('logoutBtn').classList.add('hidden'); if ($('roleBadge')) $('roleBadge').classList.add('hidden'); if ($('whoami')) $('whoami').textContent = 'Not signed in'; if ($('whoamiSub')) $('whoamiSub').textContent = 'Waiting for staff authentication'; setMsg($('loginMsg'), 'Your session expired — please sign in again.'); }
    } else { if ($('authGate')) $('authGate').classList.remove('hidden'); if ($('logoutBtn')) $('logoutBtn').classList.add('hidden'); if ($('roleBadge')) $('roleBadge').classList.add('hidden'); if ($('whoami')) $('whoami').textContent = 'Not signed in'; if ($('whoamiSub')) $('whoamiSub').textContent = 'Waiting for staff authentication'; }
  }

  if ($('staffLoginForm')) $('staffLoginForm').addEventListener('submit', async (e) => { e.preventDefault(); setMsg($('loginMsg'), 'Signing in...'); try { const email = $('loginEmail').value.trim(); const password = $('loginPassword').value; const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; setMsg($('loginMsg'), 'Signed in', true); await syncSessionUI(); } catch (err) { setMsg($('loginMsg'), err.message || 'Login failed'); } });
  if ($('logoutBtn')) $('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); await syncSessionUI(); });
  if ($('refreshBtn')) $('refreshBtn').addEventListener('click', refreshAll);
  if ($('searchBox')) $('searchBox').addEventListener('input', renderList);
  document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
  if ($('customerClearBtn')) $('customerClearBtn').addEventListener('click', resetCustomerForm);
  if ($('allocateGcBtn')) $('allocateGcBtn').addEventListener('click', async () => { try { $('allocateGcBtn').disabled = true; const { data: code, error } = await window.sb.rpc('generate_gc_customer_code'); if (error) throw error; if ($('customerGcCode')) $('customerGcCode').value = code || ''; } catch (err) { setMsg($('customerMsg'), err.message || 'Unable to generate code'); } finally { $('allocateGcBtn').disabled = false; } });
  if ($('staffClearBtn')) $('staffClearBtn').addEventListener('click', resetStaffForm);
  if ($('receiptClearBtn')) $('receiptClearBtn').addEventListener('click', resetReceiptForm);
  ['customerForm', 'staffForm', 'receiptForm'].forEach((id) => { try { window.formValidator.initializeForm(id, { manageSubmit: false }); } catch (e) {} });
  if ($('customerForm')) $('customerForm').addEventListener('submit', async (e) => { e.preventDefault(); if (!window.formValidator.validateForm('customerForm')) { setMsg($('customerMsg'), 'Please fix the highlighted fields'); return; } setMsg($('customerMsg'), 'Saving customer...'); try { const payload = { id: $('customerId').value || undefined, gc_code: $('customerGcCode').value.trim() || undefined, code: $('customerGcCode').value.trim() || undefined, name: $('customerName').value.trim(), email: $('customerEmail').value.trim(), manager_staff_id: $('customerManager').value || null }; const action = $('customerId').value ? 'update' : 'create'; const res = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'customer', action, data: payload }) }); setMsg($('customerMsg'), action === 'create' ? `Customer saved${res.warning ? ' · ' + res.warning : ''}` : 'Customer updated', true); resetCustomerForm(); await refreshAll(); setActiveTab('customers'); } catch (err) { setMsg($('customerMsg'), err.message || 'Failed to save customer'); } });
  if ($('staffForm')) $('staffForm').addEventListener('submit', async (e) => { e.preventDefault(); if (!window.formValidator.validateForm('staffForm')) { setMsg($('staffMsg'), 'Please fix the highlighted fields'); return; } setMsg($('staffMsg'), 'Saving staff...'); try { const payload = { id: $('staffId').value || undefined, full_name: $('staffFullName').value.trim(), email: $('staffEmail').value.trim(), role: $('staffRole').value, branch: $('staffBranch').value.trim() }; const action = $('staffId').value ? 'update' : 'create'; const res = await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'staff', action, data: payload }) }); setMsg($('staffMsg'), action === 'create' ? `Staff saved${res.warning ? ' · ' + res.warning : ''}` : 'Staff updated', true); resetStaffForm(); await refreshAll(); setActiveTab('staff'); } catch (err) { setMsg($('staffMsg'), err.message || 'Failed to save staff'); } });
  if ($('receiptPhotos')) $('receiptPhotos').addEventListener('change', () => { const files = Array.from($('receiptPhotos').files || []); if ($('receiptPreview')) $('receiptPreview').innerHTML = files.map((file) => `<div><img src="${URL.createObjectURL(file)}" alt=""><div class="small">${esc(file.name)}</div></div>`).join(''); });
  if ($('receiptForm')) $('receiptForm').addEventListener('submit', async (e) => { e.preventDefault(); if (!window.formValidator.validateForm('receiptForm')) { setMsg($('receiptMsg'), 'Please fix the highlighted fields'); return; } setMsg($('receiptMsg'), 'Uploading receipt...'); try { const formData = new FormData(); formData.append('kind', 'receipt'); formData.append('action', 'create'); formData.append('batch_code', $('receiptBatch').value.trim()); formData.append('location', $('receiptLocation').value); formData.append('customer_code', $('receiptCustomerCode').value.trim()); formData.append('customer_phone', $('receiptCustomerPhone').value.trim()); formData.append('cargo_type', $('receiptCargoType').value); for (const file of Array.from($('receiptPhotos').files || [])) formData.append('photos', file); const res = await authFetch('/', { method: 'POST', body: formData }); setMsg($('receiptMsg'), `Receipt saved: ${res.receipt.batch_code}${res.customer ? ' · linked to customer' : ''}`, true); resetReceiptForm(); await refreshAll(); setActiveTab('receipts'); } catch (err) { setMsg($('receiptMsg'), err.message || 'Failed to save receipt'); } });

  window.editCustomer = (row) => { try { if (!row) return; window.formValidator.resetForm('customerForm'); if ($('customerId')) $('customerId').value = row.id || ''; if ($('customerName')) $('customerName').value = row.name || ''; if ($('customerEmail')) $('customerEmail').value = row.email || ''; if ($('customerGcCode')) $('customerGcCode').value = row.gc_code || row.code || ''; if ($('customerManager')) $('customerManager').value = row.manager_staff_id || ''; } catch (e) { console.error(e); } };
  window.editStaff = (row) => { try { if (!row) return; window.formValidator.resetForm('staffForm'); if ($('staffId')) $('staffId').value = row.id || ''; if ($('staffFullName')) $('staffFullName').value = row.full_name || ''; if ($('staffEmail')) $('staffEmail').value = row.email || ''; if ($('staffRole')) $('staffRole').value = row.role || 'admin'; if ($('staffBranch')) $('staffBranch').value = row.branch || ''; } catch (e) { console.error(e); } };
  window.archiveCustomerAccount = async (id) => { if (!window.confirm('Archive this customer account?')) return; try { await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'customer', action: 'archive', data: { id } }) }); await refreshAll(); } catch (err) { window.alert(err.message || 'Unable to archive customer'); } };
  window.archiveStaffAccount = async (id) => { if (!window.confirm('Deactivate this staff account?')) return; try { await authFetch('/', { method: 'POST', body: JSON.stringify({ kind: 'staff', action: 'archive', data: { id } }) }); await refreshAll(); } catch (err) { window.alert(err.message || 'Unable to deactivate staff'); } };

  // Global action delegation for buttons with data-action
  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    try {
      switch (action) {
        case 'edit-customer': {
          const row = decodeRowData(btn.dataset.row);
          if (row && Object.keys(row).length) window.editCustomer(row);
          break;
        }
        case 'edit-staff': {
          const row = decodeRowData(btn.dataset.row);
          if (row && Object.keys(row).length) window.editStaff(row);
          break;
        }
        case 'archive-customer': {
          const id = btn.dataset.id; if (!id) return; await window.archiveCustomerAccount(id); break;
        }
        case 'archive-staff': {
          const id = btn.dataset.id; if (!id) return; await window.archiveStaffAccount(id); break;
        }
        default: break;
      }
    } catch (err) { console.error('Action handler failed', err); }
  });

  window.addEventListener('hashchange', () => { const tab = location.hash.replace('#', ''); if (VALID_TABS.includes(tab)) setActiveTab(tab); });
  const initialTab = location.hash.replace('#', ''); setActiveTab(VALID_TABS.includes(initialTab) ? initialTab : 'dashboard');
  syncSessionUI();
})();
