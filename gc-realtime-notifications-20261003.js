(() => {
  'use strict';
  const URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  let client;
  let channel;
  let lastRefresh = 0;
  const page = location.pathname;
  const isStaff = /staff-os-v5|staff-os|operations-command|accounts-console/i.test(page);
  const isCustomer = /customer-portal|dashboard/i.test(page) || (page === '/' && Boolean(document.querySelector('#gcCustomerWorkspace')));
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const showToast = (title, body, eventKey = '') => {
    let node = document.getElementById('gcRealtimeToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'gcRealtimeToast';
      node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;z-index:2147483000;inset:auto 18px 86px auto;max-width:min(360px,calc(100vw - 36px));padding:14px 16px;border:1px solid rgba(88,229,239,.45);border-radius:16px;background:rgba(3,18,35,.96);color:#f4fbff;box-shadow:0 16px 44px rgba(0,0,0,.34);font:600 13px/1.6 Vazirmatn,system-ui,sans-serif;direction:rtl;backdrop-filter:blur(14px)';
      document.body.appendChild(node);
    }
    node.dataset.eventKey = eventKey || '';
    node.innerHTML = `<strong style="display:block;color:#64e6ef">${escapeHtml(title)}</strong><span>${escapeHtml(body || 'نوێکردنەوەی ڕاستەوخۆ')}</span>`;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.remove(), 9000);
    return node;
  };
  const refresh = () => {
    const now = Date.now();
    if (now - lastRefresh < 2500) return;
    lastRefresh = now;
    window.dispatchEvent(new CustomEvent('gc:realtime-update'));
    if (typeof window.gcCustomerReload === 'function') window.gcCustomerReload();
    if (isStaff) document.getElementById('refreshBtn')?.click();
  };
  let activeChannelKey = '';

  const clearChannel = async () => {
    const old = channel;
    channel = null;
    activeChannelKey = '';
    if (old && client) {
      try { await client.removeChannel(old); } catch (error) { console.warn('[gc-realtime] channel cleanup', error); }
    }
  };

  const setupCustomer = async () => {
    const { data } = await client.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) { await clearChannel(); return; }
    const key = `customer:${uid}`;
    if (channel && activeChannelKey === key) return;
    await clearChannel();
    activeChannelKey = key;
    channel = client.channel(`gc-customer-live-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_notifications', filter: `customer_user_id=eq.${uid}` }, payload => {
        const n = payload.new || {};
        const isReceiptNotice = n.kind === 'warehouse_received';
        const receiptHint = String(n.title || '') + ' ' + String(n.body || '');
        const isDubaiReceipt = /dubai|uae|united arab emirates|دوبەی|دوبی/i.test(receiptHint);
        const title = isReceiptNotice
          ? (isDubaiReceipt ? 'کاڵاکەت لە کۆگای دوبەی وەرگیرا' : 'کاڵاکەت لە کۆگا وەرگیرا')
          : (n.title || 'ئاگادارییەکی نوێ');
        const body = isReceiptNotice
          ? (isDubaiReceipt ? 'وردەکاری، وێنە و ژمارەی کارتۆن لە بەشی بارەکان ببینە.' : 'وردەکاری و بەڵگەی کاڵاکەت لە بەشی بارەکان ببینە.')
          : (n.body || 'دۆخی بار نوێکرایەوە.');
        showToast(title, body);
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
    const { data } = await client.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) { await clearChannel(); return; }
    const key = `staff:${uid}`;
    if (channel && activeChannelKey === key) return;
    await clearChannel();
    activeChannelKey = key;
    channel = client.channel(`gc-staff-live-alerts-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_alerts' }, payload => {
        const a = payload.new || {};
        showToast(a.title || 'Staff alert', a.body || 'ئاگادارییەکی نوێ بۆ تیم هەیە.');
        refresh();
      })
      .subscribe();
  };

  const boot = async () => {
    if (!window.supabase?.createClient) { setTimeout(boot, 120); return; }
    // Staff OS creates its own namespaced Supabase client before this bridge runs.
    // Reuse that client instead of creating another client on the shared customer key.
    if (isStaff && !window.gcSupabase?.auth) { setTimeout(boot, 120); return; }
    if (isStaff) client = window.gcSupabase;
    else client = window.gcSupabase || window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

    if (isCustomer || isStaff) {
      client.auth.onAuthStateChange((event, session) => {
        // Defer Supabase calls until the auth callback has completed.
        if (!session?.user?.id) {
          if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
            setTimeout(() => { void clearChannel(); }, 0);
          }
          return;
        }
        setTimeout(() => {
          const task = isCustomer ? setupCustomer : setupStaff;
          void task().catch(error => console.warn('[gc-realtime] auth resubscribe', error));
        }, 0);
      });
    }
    if (isCustomer) await setupCustomer();
    else if (isStaff) await setupStaff();
  };
  window.addEventListener('beforeunload', () => { if (channel && client) void clearChannel(); });
  boot().catch(error => console.warn('[gc-realtime]', error));
})();
