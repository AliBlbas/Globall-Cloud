(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const ACCOUNT_FN = `${SUPABASE_URL}/functions/v1/account-admin`;
  const OPS_FN = `${SUPABASE_URL}/functions/v1/operations-admin`;
  const state = { client: null, session: null, user: null, me: null, busy: false, observer: null };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (value) => value == null || value === '' ? '—' : esc(value);
  const dt = (value) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  function injectStyles() {
    if ($('#saEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'saEnhancementStyles';
    style.textContent = `
      .sa-admin-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:rgba(22,199,229,.12);border:1px solid rgba(139,234,246,.25);color:#9ff0fb;font:800 10px/1 var(--mono,monospace);letter-spacing:.08em;white-space:nowrap}
      .sa-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
      .sa-action-row{display:flex;gap:6px;flex-wrap:wrap;min-width:170px}
      .sa-btn{min-height:34px;padding:7px 10px;border-radius:10px;border:1px solid rgba(126,195,232,.18);background:rgba(255,255,255,.035);color:inherit;font-weight:800;font-size:11px}
      .sa-btn:hover{border-color:rgba(139,234,246,.45);transform:translateY(-1px)}
      .sa-btn.primary{border-color:transparent;background:linear-gradient(135deg,#8beaf6,#16c7e5);color:#03151b}
      .sa-btn.danger{border-color:rgba(255,107,122,.35);color:#ffd1d7}
      .sa-btn.ghost{background:transparent}
      .sa-notice{padding:12px 14px;margin-bottom:12px;border-radius:14px;border:1px solid rgba(88,230,176,.18);background:rgba(88,230,176,.06);color:#c6f5e2;font-size:12px;line-height:1.75}
      .sa-notice.warn{border-color:rgba(255,211,122,.22);background:rgba(255,211,122,.06);color:#ffe3a7}
      .sa-modal-backdrop{position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:18px}
      .sa-modal{width:min(760px,100%);max-height:min(90vh,900px);overflow:auto;border-radius:22px;border:1px solid rgba(139,234,246,.2);background:linear-gradient(155deg,#0a223a,#04111e);box-shadow:0 35px 100px rgba(0,0,0,.55);padding:18px}
      .sa-modal h3{margin:0;font-size:20px}.sa-modal p{margin:4px 0;color:#93acc4;font-size:12px;line-height:1.7}.sa-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.sa-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sa-field-label{display:block;color:#9fb9d2;font-size:11px;font-weight:800}.sa-field-label.full{grid-column:1/-1}.sa-field{width:100%;margin-top:6px;padding:10px 11px;border-radius:11px;border:1px solid #214d75;background:#04111f;color:#f6fbff;outline:none}.sa-field:focus{border-color:#16c7e5;box-shadow:0 0 0 3px rgba(22,199,229,.1)}.sa-form-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}.sa-check{display:flex;align-items:center;gap:7px;padding:9px 10px;border:1px solid rgba(126,195,232,.12);border-radius:11px;background:rgba(255,255,255,.025);color:#d9e9f7;font-size:11px}.sa-danger-text{color:#ffb6c0}.sa-readonly{opacity:.78}
      .sa-access-denied{position:fixed;inset:0;z-index:6000;display:grid;place-items:center;padding:18px;background:#020914}
      .sa-access-card{width:min(520px,100%);padding:28px;border-radius:24px;border:1px solid rgba(255,107,122,.22);background:linear-gradient(155deg,#111d2b,#050b13);text-align:center;box-shadow:0 30px 100px rgba(0,0,0,.55)}
      .sa-access-card h2{margin:10px 0 4px}.sa-access-card p{color:#9db6d3;line-height:1.8;font-size:13px}
      @media(max-width:700px){.sa-grid{grid-template-columns:1fr}.sa-field-label.full{grid-column:auto}.sa-modal{padding:14px}.sa-action-row{min-width:140px}}
    `;
    document.head.appendChild(style);
  }

  async function getClient() {
    if (state.client) return state.client;
    if (window.gcEnsureSupabase) {
      await window.gcEnsureSupabase();
      state.client = window.gcSupabase;
      if (state.client) return state.client;
    }
    if (window.gcSupabase) { state.client = window.gcSupabase; return state.client; }
    if (window.supabase?.createClient) {
      state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      return state.client;
    }
    throw new Error('Supabase client is not available');
  }

  async function refreshAuth() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) throw new Error('Unauthorized');
    state.session = data.session;
    state.user = data.session.user;
    const { data: me, error: meError } = await client.from('staff').select('id,full_name,role,branch,is_active,updated_at').eq('id', state.user.id).maybeSingle();
    if (meError || !me || !me.is_active || me.role !== 'super_admin') throw new Error('Super Admin access required');
    state.me = me;
    return state;
  }

  async function api(url, options = {}) {
    await refreshAuth();
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${state.session.access_token}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
    if (!response.ok) throw new Error(String(data.error || data.message || `Request failed (${response.status})`));
    return data;
  }

  async function accountApi(kind, action, data = {}) {
    return api(ACCOUNT_FN, { method: 'POST', body: { kind, action, data } });
  }

  async function opsApi(action, data = {}) {
    return api(OPS_FN, { method: 'POST', body: { kind: 'shipments', action, data } });
  }

  function jump(tab) {
    const btn = $(`.nav-item[data-tab="${CSS.escape(tab)}"]`);
    if (btn) btn.click();
  }

  function toast(message, bad = false) {
    let el = $('#saToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'saToast';
      Object.assign(el.style, { position: 'fixed', left: '18px', bottom: '18px', zIndex: '7000', maxWidth: 'min(520px,calc(100vw - 36px))', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(139,234,246,.2)', background: '#071727', color: '#eef7ff', boxShadow: '0 20px 60px rgba(0,0,0,.45)', fontWeight: '800', fontSize: '12px' });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.borderColor = bad ? 'rgba(255,107,122,.4)' : 'rgba(88,230,176,.3)';
    el.style.color = bad ? '#ffd0d6' : '#c6f5e2';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 3800);
  }

  function openModal(title, subtitle, body, onSubmit) {
    closeModal();
    const wrap = document.createElement('div');
    wrap.className = 'sa-modal-backdrop';
    wrap.id = 'saModal';
    wrap.innerHTML = `<form class="sa-modal" id="saForm"><div class="sa-modal-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle || '')}</p></div><button type="button" class="sa-btn ghost" id="saClose" aria-label="Close">✕</button></div>${body}<div class="sa-form-foot"><span id="saMsg" class="sa-readonly"></span><button type="button" class="sa-btn" id="saCancel">Cancel</button><button type="submit" class="sa-btn primary">Save</button></div></form>`;
    document.body.appendChild(wrap);
    $('#saClose').onclick = closeModal;
    $('#saCancel').onclick = closeModal;
    wrap.addEventListener('click', (event) => { if (event.target === wrap) closeModal(); });
    $('#saForm').onsubmit = async (event) => {
      event.preventDefault();
      const submit = $('#saForm button[type="submit"]');
      const msg = $('#saMsg');
      submit.disabled = true;
      msg.textContent = 'لە جێبەجێکردندایە…';
      try {
        await onSubmit(new FormData(event.target));
        closeModal();
        toast('کردارەکە بە سەرکەوتوویی تەواو بوو.');
      } catch (error) {
        msg.textContent = error?.message || 'هەڵەیەک ڕوویدا.';
        toast(error?.message || 'هەڵەیەک ڕوویدا.', true);
        submit.disabled = false;
      }
    };
  }

  function closeModal() { $('#saModal')?.remove(); }

  function addToolbar(tabId, html) {
    const panel = $(`#${tabId}`);
    if (!panel || $('.sa-toolbar', panel)) return;
    const sectionTools = $('.section-tools', panel);
    if (!sectionTools) return;
    sectionTools.insertAdjacentHTML('afterend', html);
  }

  function enhanceOverview() {
    const panel = $('#overview');
    if (!panel || $('.sa-overview-tools', panel)) return;
    const heroActions = $('.hero-actions', panel);
    if (!heroActions) return;
    heroActions.classList.add('sa-overview-tools');
    heroActions.insertAdjacentHTML('beforeend', `<button class="btn" type="button" data-sa-overview="new-staff">+ هەژماری ستاف</button><button class="btn" type="button" data-sa-overview="new-customer">+ هەژماری کڕیار</button><button class="btn" type="button" data-sa-overview="account-settings">ڕێکخستنی هەژمار</button>`);
    $$('[data-sa-overview]', heroActions).forEach((btn) => {
      btn.onclick = () => {
        const action = btn.dataset.saOverview;
        if (action === 'new-staff') { jump('staff'); setTimeout(newStaffModal, 80); }
        if (action === 'new-customer') { jump('customers'); setTimeout(newCustomerModal, 80); }
        if (action === 'account-settings') jump('settings');
      };
    });
  }

  function enhanceHeader() {
    const actions = $('.top-actions');
    if (!actions || $('.sa-admin-badge', actions)) return;
    const badge = document.createElement('span');
    badge.className = 'sa-admin-badge';
    badge.innerHTML = '<span aria-hidden="true">◆</span> SUPER ADMIN · FULL CONTROL';
    actions.prepend(badge);
  }

  function ensureStaffToolbar() {
    addToolbar('staff', `<div class="sa-toolbar"><button class="sa-btn primary" type="button" id="saNewStaff">+ زیادکردنی هەژماری ستاف</button><button class="sa-btn" type="button" id="saRefreshStaff">نوێکردنەوەی ستاف</button></div>`);
    $('#saNewStaff')?.addEventListener('click', newStaffModal);
    $('#saRefreshStaff')?.addEventListener('click', () => renderStaff(true));
  }

  function ensureCustomerToolbar() {
    addToolbar('customers', `<div class="sa-toolbar"><button class="sa-btn primary" type="button" id="saNewCustomer">+ زیادکردنی هەژماری کڕیار</button><button class="sa-btn" type="button" id="saRefreshCustomers">نوێکردنەوەی کڕیاران</button></div>`);
    $('#saNewCustomer')?.addEventListener('click', newCustomerModal);
    $('#saRefreshCustomers')?.addEventListener('click', () => renderCustomers(true));
  }

  function ensureOperationsToolbar() {
    addToolbar('operations', `<div class="sa-toolbar"><button class="sa-btn primary" type="button" id="saNewShipment">+ زیادکردنی shipment</button><button class="sa-btn" type="button" id="saRefreshOps">نوێکردنەوەی shipment ـەکان</button></div>`);
    $('#saNewShipment')?.addEventListener('click', newShipmentModal);
    $('#saRefreshOps')?.addEventListener('click', () => renderOperations(true));
  }

  function staffBody(row = {}) {
    const roles = ['admin','super_admin','accountant','finance','warehouse','warehouse_china','warehouse_uae','warehouse_erbil','operations','driver','delivery'];
    const branches = ['all','erbil','dubai','china','uae'];
    return `<div class="sa-grid">
      <label class="sa-field-label">ناو<input class="sa-field" name="full_name" required maxlength="160" value="${esc(row.full_name || '')}"></label>
      <label class="sa-field-label">ئیمەیڵ<input class="sa-field" name="email" type="email" ${row.id ? '' : 'required'} autocomplete="off" value="${esc(row.email || '')}"></label>
      <label class="sa-field-label">Role<select class="sa-field" name="role" ${row.id && row.id === state.user?.id ? 'disabled' : ''}>${roles.map((r) => `<option value="${r}" ${r === (row.role || 'staff') ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label class="sa-field-label">Branch<select class="sa-field" name="branch">${branches.map((r) => `<option value="${r}" ${r === (row.branch || 'all') ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label class="sa-field-label">${row.id ? 'وشەی نهێنیی نوێ (ئارەزوومەندانە)' : 'وشەی نهێنی (بەجێبهێڵە بۆ Invite)'}<input class="sa-field" name="password" type="password" autocomplete="new-password" minlength="12"></label>
      ${row.id ? `<label class="sa-check"><input name="is_active" type="checkbox" ${row.is_active ? 'checked' : ''} ${row.id === state.user?.id ? 'disabled' : ''}> چالاک</label>` : `<label class="sa-check"><input name="send_invite" type="checkbox" checked> ناردنی Invite بۆ ئیمەیڵ</label>`}
      <div class="sa-notice" style="grid-column:1/-1">هەموو گۆڕانکارییەک لەسەر staff بە &quot;account-admin&quot; ـی پارێزراو و audit trail ـەوە جێبەجێ دەکرێت.</div>
    </div>`;
  }

  async function newStaffModal() {
    openModal('زیادکردنی هەژماری ستاف', 'تەنها Super Admin دەتوانێت هەژماری staff دروست بکات.', staffBody(), async (form) => {
      const payload = {
        full_name: String(form.get('full_name') || '').trim(),
        email: String(form.get('email') || '').trim(),
        role: String(form.get('role') || 'admin'),
        branch: String(form.get('branch') || 'all'),
        password: String(form.get('password') || ''),
        send_invite: form.get('send_invite') === 'on',
      };
      await accountApi('staff', 'create', payload);
      await renderStaff(true);
    });
  }

  async function editStaffModal(id) {
    const data = await api(`${ACCOUNT_FN}?kind=staff`);
    const row = (data.items || []).find((x) => String(x.id) === String(id));
    if (!row) throw new Error('Staff member not found');
    openModal('دەستکاری هەژماری ستاف', 'Role و access ـی هەژمار بە شێوەی پارێزراو دەگۆڕدرێت.', staffBody(row), async (form) => {
      const payload = {
        id: row.id,
        full_name: String(form.get('full_name') || '').trim(),
        email: String(form.get('email') || '').trim(),
        role: String(form.get('role') || row.role),
        branch: String(form.get('branch') || row.branch || 'all'),
        password: String(form.get('password') || ''),
      };
      if (row.id !== state.user?.id) payload.is_active = form.get('is_active') === 'on';
      await accountApi('staff', 'update', payload);
      await renderStaff(true);
    });
  }

  async function deleteStaffConfirm(id, name) {
    const message = `هەژماری «${name || id}» ناچالاک دەکرێت و چوونەژوورەوەی Auth ـی لابردرێت. دڵنیایت؟`;
    if (!confirm(message)) return;
    await accountApi('staff', 'delete', { id });
    toast('هەژماری ستاف ناچالاک کرا.');
    await renderStaff(true);
  }

  async function renderStaff(force = false) {
    if (state.busy && !force) return;
    const tbody = $('#staffRows');
    if (!tbody) return;
    state.busy = true;
    try {
      const data = await api(`${ACCOUNT_FN}?kind=staff`);
      const term = String($('#staffSearch')?.value || '').trim().toLowerCase();
      const branch = $('#staffBranchFilter')?.value || 'all';
      const rows = (data.items || []).filter((x) => (branch === 'all' || x.branch === branch) && (!term || `${x.full_name || ''} ${x.role || ''} ${x.branch || ''}`.toLowerCase().includes(term)));
      const table = tbody.closest('table');
      if (table && !$('th[data-sa-actions]', table)) table.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th data-sa-actions>کردارەکانی Super Admin</th>');
      tbody.innerHTML = rows.map((row) => `<tr><td><b>${fmt(row.full_name)}</b></td><td><span class="badge">${fmt(row.role)}</span></td><td>${fmt(row.branch)}</td><td><span class="status ${row.is_active ? 'ok' : 'off'}">${row.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td><td>${dt(row.updated_at)}</td><td><div class="sa-action-row"><button type="button" class="sa-btn" data-sa-staff-edit="${esc(row.id)}">دەستکاری</button>${String(row.id) === String(state.user?.id) ? '<span class="sa-readonly">هەژماری خۆت</span>' : `<button type="button" class="sa-btn danger" data-sa-staff-delete="${esc(row.id)}" data-sa-staff-name="${esc(row.full_name || '')}">${row.is_active ? 'ناچالاککردن' : 'ڕێکخستن'}</button>`}</div></td></tr>`).join('') || '<tr><td colspan="6">هیچ ئەنجامێک نییە.</td></tr>';
      $$('[data-sa-staff-edit]', tbody).forEach((btn) => btn.onclick = () => editStaffModal(btn.dataset.saStaffEdit).catch((e) => toast(e.message, true)));
      $$('[data-sa-staff-delete]', tbody).forEach((btn) => btn.onclick = () => deleteStaffConfirm(btn.dataset.saStaffDelete, btn.dataset.saStaffName).catch((e) => toast(e.message, true)));
      tbody.dataset.saEnhanced = String(Date.now());
    } finally { state.busy = false; }
  }

  function customerBody(row = {}, isCreate = false) {
    return `<div class="sa-grid">
      ${isCreate ? '<label class="sa-field-label">GC Code<input class="sa-field" name="gc_code" placeholder="GC-001" maxlength="40"></label>' : '<label class="sa-field-label sa-readonly">GC Code<input class="sa-field" name="gc_code" value="' + esc(row.gc_code || row.code || '') + '" readonly></label>'}
      <label class="sa-field-label">ناوی کڕیار<input class="sa-field" name="name" required maxlength="180" value="${esc(row.name || '')}"></label>
      <label class="sa-field-label">ئیمەیڵ<input class="sa-field" name="email" type="email" value="${esc(row.email || '')}"></label>
      <label class="sa-field-label">تەلەفۆن<input class="sa-field" name="phone" inputmode="tel" value="${esc(row.phone || '')}"></label>
      <label class="sa-field-label">تەلەفۆنی ٢<input class="sa-field" name="phone2" inputmode="tel" value="${esc(row.phone2 || '')}"></label>
      <label class="sa-field-label">شار<input class="sa-field" name="city" value="${esc(row.city || '')}"></label>
      <label class="sa-field-label">شوێنی دابەشکردن<input class="sa-field" name="delivery_location" value="${esc(row.delivery_location || '')}"></label>
      <label class="sa-field-label full">تێبینی<textarea class="sa-field" name="note" rows="3">${esc(row.note || '')}</textarea></label>
      <label class="sa-field-label">Manager Staff ID<input class="sa-field" name="manager_staff_id" value="${esc(row.manager_staff_id || '')}"></label>
      ${isCreate ? '<label class="sa-field-label">وشەی نهێنی (ئارەزوومەندانە)<input class="sa-field" name="password" type="password" minlength="12" autocomplete="new-password"></label><label class="sa-check"><input name="send_invite" type="checkbox" checked> Invite ـی ئیمەیڵ</label>' : '<label class="sa-field-label">وشەی نهێنیی نوێ (ئارەزوومەندانە)<input class="sa-field" name="password" type="password" minlength="12" autocomplete="new-password"></label><label class="sa-check"><input name="is_active" type="checkbox" ' + (row.is_active ? 'checked' : '') + '> چالاک</label>'}
      <div class="sa-notice" style="grid-column:1/-1">سڕینەوەی customer لەم سیستەمەدا بە شێوەی <b>ناچالاککردن + لابردنی Auth access</b> ـە، بۆ ئەوەی مێژووی shipment پارێزراو بێت.</div>
    </div>`;
  }

  async function newCustomerModal() {
    openModal('زیادکردنی هەژماری کڕیار', 'هەژماری customer و GC Code لە یەک workflow ـدا دروست دەکرێت.', customerBody({}, true), async (form) => {
      const payload = {
        gc_code: String(form.get('gc_code') || '').trim(),
        name: String(form.get('name') || '').trim(),
        email: String(form.get('email') || '').trim(),
        phone: String(form.get('phone') || '').trim(),
        phone2: String(form.get('phone2') || '').trim(),
        city: String(form.get('city') || '').trim(),
        delivery_location: String(form.get('delivery_location') || '').trim(),
        note: String(form.get('note') || '').trim(),
        manager_staff_id: String(form.get('manager_staff_id') || '').trim(),
        password: String(form.get('password') || ''),
        send_invite: form.get('send_invite') === 'on',
      };
      await accountApi('customer', 'create', payload);
      await renderCustomers(true);
    });
  }

  async function editCustomerModal(id) {
    const data = await api(`${ACCOUNT_FN}?kind=customer`);
    const row = (data.items || []).find((x) => String(x.id) === String(id));
    if (!row) throw new Error('Customer not found');
    openModal('دەستکاری هەژماری کڕیار', 'زانیاریی customer و Auth access ـی هەژمار دەتوانرێت بگۆڕدرێت.', customerBody(row, false), async (form) => {
      const payload = {
        id: row.id,
        name: String(form.get('name') || '').trim(),
        email: String(form.get('email') || '').trim(),
        phone: String(form.get('phone') || '').trim(),
        phone2: String(form.get('phone2') || '').trim(),
        city: String(form.get('city') || '').trim(),
        delivery_location: String(form.get('delivery_location') || '').trim(),
        note: String(form.get('note') || '').trim(),
        manager_staff_id: String(form.get('manager_staff_id') || '').trim(),
        password: String(form.get('password') || ''),
        is_active: form.get('is_active') === 'on',
      };
      await accountApi('customer', 'update', payload);
      await renderCustomers(true);
    });
  }

  async function deleteCustomerConfirm(id, name) {
    const message = `کڕیاری «${name || id}» ناچالاک دەکرێت و Auth access ـی دەسڕێتەوە. مێژووی shipment ـەکە دەمێنێتەوە. دڵنیایت؟`;
    if (!confirm(message)) return;
    await accountApi('customer', 'delete', { id, hard_delete_auth: true });
    toast('کڕیار ناچالاک کرا و Auth access ـی لابرا.');
    await renderCustomers(true);
  }

  async function renderCustomers(force = false) {
    if (state.busy && !force) return;
    const tbody = $('#customerRows');
    if (!tbody) return;
    state.busy = true;
    try {
      const data = await api(`${ACCOUNT_FN}?kind=customer`);
      const term = String($('#customerSearch')?.value || '').trim().toLowerCase();
      const rows = (data.items || []).filter((x) => !term || `${x.name || ''} ${x.code || ''} ${x.phone || ''} ${x.city || ''} ${x.email || ''}`.toLowerCase().includes(term));
      const managers = new Map((await api(`${ACCOUNT_FN}?kind=staff`)).items?.map((x) => [String(x.id), x.full_name]) || []);
      const table = tbody.closest('table');
      if (table && !$('th[data-sa-actions]', table)) table.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th data-sa-actions>کردارەکانی Super Admin</th>');
      tbody.innerHTML = rows.slice(0, 250).map((row) => `<tr><td class="mono">${fmt(row.code || row.gc_code)}</td><td><b>${fmt(row.name)}</b><div class="muted">${fmt(row.email)}</div></td><td>${fmt(row.phone)}</td><td>${fmt(row.city)}</td><td>${fmt(managers.get(String(row.manager_staff_id)) || row.manager_staff_id)}</td><td><span class="status ${row.is_active ? 'ok' : 'off'}">${row.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td><td><div class="sa-action-row"><button type="button" class="sa-btn" data-sa-customer-edit="${esc(row.id)}">دەستکاری</button><button type="button" class="sa-btn danger" data-sa-customer-delete="${esc(row.id)}" data-sa-customer-name="${esc(row.name || '')}">${row.is_active ? 'سڕینەوە / ناچالاک' : 'ناچالاک'}</button></div></td></tr>`).join('') || '<tr><td colspan="7">هیچ کڕیارێک نییە.</td></tr>';
      $$('[data-sa-customer-edit]', tbody).forEach((btn) => btn.onclick = () => editCustomerModal(btn.dataset.saCustomerEdit).catch((e) => toast(e.message, true)));
      $$('[data-sa-customer-delete]', tbody).forEach((btn) => btn.onclick = () => deleteCustomerConfirm(btn.dataset.saCustomerDelete, btn.dataset.saCustomerName).catch((e) => toast(e.message, true)));
      tbody.dataset.saEnhanced = String(Date.now());
    } finally { state.busy = false; }
  }

  function shipmentBody(row = {}, isCreate = false) {
    const statuses = ['pending','in_transit','arrived','out_for_delivery','delivered','archived'];
    const modes = ['air','sea','land'];
    const statusesField = `<select class="sa-field" name="operational_status">${statuses.map((s) => `<option value="${s}" ${s === (row.operational_status || 'pending') ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
    return `<div class="sa-grid">
      <label class="sa-field-label">Tracking / ID<input class="sa-field" name="id" ${isCreate ? '' : 'readonly'} value="${esc(row.id || '')}" ${isCreate ? 'placeholder="GC-2026-0001"' : ''}></label>
      <label class="sa-field-label">Customer<input class="sa-field" name="customer_name" value="${esc(row.customer_name || '')}"></label>
      <label class="sa-field-label">Customer phone<input class="sa-field" name="customer_phone" inputmode="tel" value="${esc(row.customer_phone || '')}"></label>
      <label class="sa-field-label">Customer email<input class="sa-field" name="customer_email" type="email" value="${esc(row.customer_email || '')}"></label>
      <label class="sa-field-label">Origin<input class="sa-field" name="origin_key" value="${esc(row.origin_key || 'china')}"></label>
      <label class="sa-field-label">Destination<input class="sa-field" name="dest_key" value="${esc(row.dest_key || 'erbil')}"></label>
      <label class="sa-field-label">Transport<select class="sa-field" name="type">${modes.map((s) => `<option value="${s}" ${s === (row.type || 'air') ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="sa-field-label">ETA<input class="sa-field" name="eta" type="datetime-local" value="${row.eta ? new Date(row.eta).toISOString().slice(0,16) : ''}"></label>
      <label class="sa-field-label">Weight kg<input class="sa-field" name="weight_kg" type="number" step="0.01" min="0" value="${row.weight_kg ?? ''}"></label>
      <label class="sa-field-label">Volume CBM<input class="sa-field" name="volume_cbm" type="number" step="0.0001" min="0" value="${row.volume_cbm ?? ''}"></label>
      <label class="sa-field-label">Items count<input class="sa-field" name="items_count" type="number" step="1" min="0" value="${row.items_count ?? ''}"></label>
      <label class="sa-field-label">Total amount<input class="sa-field" name="total_amount" type="number" step="0.01" min="0" value="${row.total_amount ?? 0}"></label>
      <label class="sa-field-label">Paid amount<input class="sa-field" name="paid_amount" type="number" step="0.01" min="0" value="${row.paid_amount ?? 0}"></label>
      <label class="sa-field-label">Current step<input class="sa-field" name="current_step_index" type="number" step="1" min="0" value="${row.current_step_index ?? 0}"></label>
      <label class="sa-field-label">Branch<input class="sa-field" name="branch" value="${esc(row.branch || 'all')}"></label>
      <label class="sa-field-label">Priority<select class="sa-field" name="priority"><option value="normal" ${row.priority === 'normal' || !row.priority ? 'selected' : ''}>normal</option><option value="high" ${row.priority === 'high' ? 'selected' : ''}>high</option><option value="critical" ${row.priority === 'critical' ? 'selected' : ''}>critical</option></select></label>
      <label class="sa-field-label">Assigned staff ID<input class="sa-field" name="assigned_staff_id" value="${esc(row.assigned_staff_id || '')}"></label>
      <label class="sa-field-label">Batch code<input class="sa-field" name="batch_code" value="${esc(row.batch_code || '')}"></label>
      <label class="sa-field-label full">Status${statusesField}</label>
      <label class="sa-field-label full">Notes<textarea class="sa-field" name="notes" rows="3">${esc(row.notes || '')}</textarea></label>
      ${isCreate ? '' : '<div class="sa-notice" style="grid-column:1/-1">دەستکاریی shipment lifecycle events ـەکان ناچالاک ناکات؛ ئەم action ـە snapshot ـی shipment دەگۆڕێت و audit log ـی هەیە.</div>'}
    </div>`;
  }

  function formShipmentPayload(form) {
    const numeric = ['weight_kg','volume_cbm','items_count','total_amount','paid_amount','current_step_index'];
    const payload = {};
    for (const [key, value] of form.entries()) {
      if (key === 'id') payload.id = String(value).trim();
      else if (numeric.includes(key)) payload[key] = value === '' ? null : Number(value);
      else if (key === 'eta') payload[key] = value ? new Date(String(value)).toISOString() : null;
      else payload[key] = String(value).trim();
    }
    return payload;
  }

  async function newShipmentModal() {
    openModal('زیادکردنی shipment', 'Super Admin دەتوانێت shipment ـی نوێ لە operations control دروست بکات.', shipmentBody({}, true), async (form) => {
      const payload = formShipmentPayload(form);
      await opsApi('create', payload);
      await renderOperations(true);
    });
  }

  async function editShipmentModal(id) {
    const data = await api(`${OPS_FN}?kind=shipments`);
    const row = (data.items || []).find((x) => String(x.id) === String(id));
    if (!row) throw new Error('Shipment not found');
    openModal('دەستکاری shipment', 'زانیاریی shipment دەتوانێت بگۆڕدرێت بە audit trail ـی تەواو.', shipmentBody(row, false), async (form) => {
      const payload = formShipmentPayload(form);
      await opsApi('update', payload);
      await renderOperations(true);
    });
  }

  async function deleteShipmentConfirm(id) {
    const message = `Shipment «${id}» دەخرێتە دۆخی archived و لە operational flow ـی چالاک دەردەکرێت. دڵنیایت؟`;
    if (!confirm(message)) return;
    await opsApi('delete', { id });
    toast('Shipment archive کرا.');
    await renderOperations(true);
  }

  async function renderOperations(force = false) {
    if (state.busy && !force) return;
    const tbody = $('#opsRows');
    if (!tbody) return;
    state.busy = true;
    try {
      const data = await api(`${OPS_FN}?kind=shipments`);
      const filter = $('#opsFilter')?.value || 'all';
      let rows = data.items || [];
      if (filter === 'unpaid') rows = rows.filter((x) => Number(x.total_amount || 0) > Number(x.paid_amount || 0));
      if (filter === 'late') rows = rows.filter((x) => x.eta && new Date(x.eta) < new Date() && String(x.operational_status || '') !== 'delivered');
      const table = tbody.closest('table');
      if (table && !$('th[data-sa-actions]', table)) table.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th data-sa-actions>کردارەکانی Super Admin</th>');
      tbody.innerHTML = rows.slice(0, 300).map((row) => { const due = Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)); return `<tr><td class="mono">${fmt(row.id)}</td><td>${fmt(row.customer_name)}</td><td>${fmt(row.origin_key)} → ${fmt(row.dest_key)}</td><td>${dt(row.eta)}</td><td>${due.toLocaleString('en-US',{style:'currency',currency:'USD'})}</td><td><span class="status ${String(row.operational_status || '').toLowerCase() === 'delivered' ? 'ok' : due > 0 ? 'warn' : 'ok'}">${fmt(row.operational_status || (due > 0 ? 'DUE' : 'PAID'))}</span></td><td><div class="sa-action-row"><button type="button" class="sa-btn" data-sa-shipment-edit="${esc(row.id)}">دەستکاری</button><button type="button" class="sa-btn danger" data-sa-shipment-delete="${esc(row.id)}">ئەرشیڤ / سڕینەوە</button></div></td></tr>`; }).join('') || '<tr><td colspan="7">هیچ shipment ـێک نییە.</td></tr>';
      $$('[data-sa-shipment-edit]', tbody).forEach((btn) => btn.onclick = () => editShipmentModal(btn.dataset.saShipmentEdit).catch((e) => toast(e.message, true)));
      $$('[data-sa-shipment-delete]', tbody).forEach((btn) => btn.onclick = () => deleteShipmentConfirm(btn.dataset.saShipmentDelete).catch((e) => toast(e.message, true)));
      tbody.dataset.saEnhanced = String(Date.now());
    } finally { state.busy = false; }
  }

  function enhanceSettings() {
    const panel = $('#settings');
    if (!panel || $('.sa-settings-card', panel)) return;
    const grid = $('.settings-grid', panel);
    if (!grid) return;
    const card = document.createElement('section');
    card.className = 'card sa-settings-card';
    card.innerHTML = `<div class="card-head"><div><div class="mono">SUPER ADMIN ACCOUNT</div><h3>ڕێکخستنی هەژمار</h3></div><span class="badge">FULL CONTROL</span></div><form id="saAccountSettings"><div class="sa-grid"><label class="sa-field-label">ناو<input class="sa-field" name="full_name" value="${esc(state.me?.full_name || '')}" required maxlength="160"></label><label class="sa-field-label">ژمارەی تەلەفۆن<input class="sa-field" name="phone" inputmode="tel" value="${esc(state.user?.user_metadata?.phone || '')}"></label><label class="sa-field-label">زمان<select class="sa-field" name="preferred_language"><option value="ku" ${state.user?.user_metadata?.preferred_language === 'ku' || !state.user?.user_metadata?.preferred_language ? 'selected' : ''}>کوردی</option><option value="en" ${state.user?.user_metadata?.preferred_language === 'en' ? 'selected' : ''}>English</option></select></label><label class="sa-field-label">ئیمەیڵ<input class="sa-field sa-readonly" value="${esc(state.user?.email || '')}" readonly></label></div><div class="sa-form-foot"><span id="saProfileMsg" class="sa-readonly"></span><button class="sa-btn primary" type="submit">پاشەکەوتکردنی ڕێکخستن</button></div></form><div style="height:10px"></div><div class="card-head"><div><div class="mono">SECURITY</div><h3>گۆڕینی وشەی نهێنی</h3></div></div><form id="saPasswordForm"><div class="sa-grid"><label class="sa-field-label">وشەی نهێنیی نوێ<input class="sa-field" name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><label class="sa-field-label">دووبارەی وشەی نهێنی<input class="sa-field" name="confirm" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label></div><div class="sa-form-foot"><span id="saPasswordMsg" class="sa-readonly"></span><button class="sa-btn" type="submit">گۆڕین</button></div></form><p class="hint">وشەی نهێنی لە audit log ـدا تۆمار ناکرێت.</p>`;
    grid.prepend(card);
    $('#saAccountSettings').onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const msg = $('#saProfileMsg');
      msg.textContent = 'لە پاشەکەوتکردندایە…';
      try {
        const fullName = String(form.get('full_name') || '').trim();
        const phone = String(form.get('phone') || '').trim();
        const preferredLanguage = String(form.get('preferred_language') || 'ku');
        await accountApi('staff', 'update', { id: state.user.id, full_name: fullName, branch: state.me.branch || 'all', role: state.me.role });
        await refreshAuth();
        await state.client.auth.updateUser({ data: { ...(state.user.user_metadata || {}), full_name: fullName, phone, preferred_language: preferredLanguage } });
        msg.textContent = 'پاشەکەوت کرا ✓';
        toast('ڕێکخستنەکانی هەژمار نوێ کرانەوە.');
      } catch (error) { msg.textContent = error.message || 'هەڵە'; toast(error.message || 'هەڵە', true); }
    };
    $('#saPasswordForm').onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const password = String(form.get('password') || '');
      const confirmPassword = String(form.get('confirm') || '');
      const msg = $('#saPasswordMsg');
      if (password.length < 12 || password.length > 128) { msg.textContent = 'وشەی نهێنی دەبێت 12–128 پیت بێت.'; return; }
      if (password !== confirmPassword) { msg.textContent = 'دوو وشەی نهێنی یەکسان نین.'; return; }
      msg.textContent = 'لە گۆڕیندایە…';
      try {
        await refreshAuth();
        const { error } = await state.client.auth.updateUser({ password });
        if (error) throw error;
        event.target.reset(); msg.textContent = 'وشەی نهێنی گۆڕدرا ✓'; toast('وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.');
      } catch (error) { msg.textContent = error.message || 'گۆڕینی وشەی نهێنی سەرکەوتوو نەبوو'; toast(error.message || 'گۆڕینی وشەی نهێنی سەرکەوتوو نەبوو', true); }
    };
  }

  function wireObservers() {
    if (state.observer) return;
    state.observer = new MutationObserver(() => scheduleEnhance());
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  let enhanceTimer = null;
  function scheduleEnhance() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(() => {
      try {
        enhanceHeader();
        enhanceOverview();
        ensureStaffToolbar();
        ensureCustomerToolbar();
        ensureOperationsToolbar();
        enhanceSettings();
        const staffRows = $('#staffRows');
        if (staffRows && !staffRows.querySelector('[data-sa-staff-edit]') && !state.busy) renderStaff();
        const customerRows = $('#customerRows');
        if (customerRows && !customerRows.querySelector('[data-sa-customer-edit]') && !state.busy) renderCustomers();
        const opsRows = $('#opsRows');
        if (opsRows && !opsRows.querySelector('[data-sa-shipment-edit]') && !state.busy) renderOperations();
      } catch (error) { console.warn('[GC Super Admin Enhancements]', error); }
    }, 120);
  }

  function accessDenied() {
    if ($('#saAccessDenied')) return;
    const wrap = document.createElement('div');
    wrap.id = 'saAccessDenied';
    wrap.className = 'sa-access-denied';
    wrap.innerHTML = `<div class="sa-access-card"><div class="sa-admin-badge" style="justify-content:center">SUPER ADMIN ONLY</div><h2>دەستڕاگەیشتن ڕەتکرایەوە</h2><p>ئەم بەشە تەنها بۆ هەژماری <b>super_admin</b> ـی چالاکە. هەژماری ئێستات دەسەڵاتی Super Admin ـی نییە.</p><a class="sa-btn" href="./staff-os.html">گەڕانەوە بۆ Staff OS</a></div>`;
    document.body.appendChild(wrap);
  }

  async function boot() {
    try {
      injectStyles();
      await refreshAuth();
      enhanceHeader();
      enhanceOverview();
      ensureStaffToolbar();
      ensureCustomerToolbar();
      ensureOperationsToolbar();
      enhanceSettings();
      wireObservers();
      scheduleEnhance();
    } catch (error) {
      console.warn('[GC Super Admin Enhancements]', error);
      if (String(error.message || '').toLowerCase().includes('super admin')) accessDenied();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
  else void boot();
})();
