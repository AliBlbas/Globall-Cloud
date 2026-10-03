(() => {
  'use strict';
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  let client;
  let channel;
  let lastRefresh = 0;
  const page = location.pathname;
  const isStaff = /staff-os-v5|staff-os|operations-command|accounts-console/i.test(page);
  const isCustomer = /customer-portal|dashboard/i.test(page);
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const showToast = (title, body) => {
    let node = document.getElementById('gcRealtimeToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'gcRealtimeToast';
      node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;z-index:2147483000;inset:auto 18px 86px auto;max-width:min(360px,calc(100vw - 36px));padding:14px 16px;border:1px solid rgba(88,229,239,.45);border-radius:16px;background:rgba(3,18,35,.96);color:#f4fbff;box-shadow:0 16px 44px rgba(0,0,0,.34);font:600 13px/1.6 Vazirmatn,system-ui,sans-serif;direction:rtl;backdrop-filter:blur(14px)';
      document.body.appendChild(node);
    }
    node.innerHTML = `<strong style="display:block;color:#64e6ef">${escapeHtml(title)}</strong><span>${escapeHtml(body || 'نوێکردنەوەی ڕاستەوخۆ')}</span>`;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.remove(), 5200);
  };
  const refresh = () => {
    const now = Date.now();
    if (now - lastRefresh < 2500) return;
    lastRefresh = now;
    window.dispatchEvent(new CustomEvent('gc:realtime-update'));
    if (typeof window.gcCustomerReload === 'function') window.gcCustomerReload();
    if (isStaff) document.getElementById('refreshBtn')?.click();
  };
  const setupCustomer = async () => {
    const { data } = await client.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    channel = client.channel(`gc-customer-live-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_notifications', filter: `customer_user_id=eq.${uid}` }, payload => {
        const n = payload.new || {};
        showToast(n.title || 'ئاگادارییەکی نوێ', n.body || 'دۆخی بار نوێکرایەوە.');
        refresh();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_chat_messages' }, payload => {
        const m = payload.new || {};
        if (m.sender_user_id && String(m.sender_user_id) === String(uid)) return;
        showToast('پەیامی نوێی پشتیوانی', m.body || 'پەیامێکی نوێ هەیە.');
        refresh();
      })
      .subscribe();
  };
  const setupStaff = async () => {
    channel = client.channel('gc-staff-live-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_alerts' }, payload => {
        const a = payload.new || {};
        showToast(a.title || 'Staff alert', a.body || 'ئاگادارییەکی نوێ بۆ تیم هەیە.');
        refresh();
      })
      .subscribe();
  };
  const boot = async () => {
    if (!window.supabase?.createClient) { setTimeout(boot, 120); return; }
    client = window.gcSupabase || window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    if (isCustomer) await setupCustomer();
    else if (isStaff) await setupStaff();
  };
  window.addEventListener('beforeunload', () => { if (channel && client) client.removeChannel(channel); });
  boot().catch(error => console.warn('[gc-realtime]', error));
})();
