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
  const fetchReceiptPhotoPreview = async (eventKey) => {
    if (!eventKey || !eventKey.startsWith('warehouse_received:') || !client) return [];
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return [];
    const response = await fetch(`${URL}/functions/v1/customer-self`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, apikey: KEY, Accept: 'application/json' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Receipt photo preview could not be loaded');
    const item = (Array.isArray(payload.notifications) ? payload.notifications : [])
      .find((notification) => String(notification.event_key || '') === eventKey);
    const photos = Array.isArray(item?.receipt_photos) ? item.receipt_photos : [];
    // The owner-scoped API signs this private bucket URL. Reject any other host/path.
    return [...new Set(photos.filter((photo) =>
      typeof photo === 'string' &&
      photo.startsWith(`${URL}/storage/v1/object/sign/warehouse-receipts/`)
    ))].slice(0, 4);
  };

  const attachReceiptPhotoPreview = (toastNode, eventKey, photoUrls) => {
    if (!toastNode?.isConnected || toastNode.dataset.eventKey !== eventKey || !Array.isArray(photoUrls) || !photoUrls.length) return;
    if (toastNode.querySelector('[data-gc-receipt-toast-photo-grid]')) return;
    const grid = document.createElement('div');
    grid.dataset.gcReceiptToastPhotoGrid = '1';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'وێنەکانی وەرگرتنی کاڵا');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${photoUrls.length > 1 ? 2 : 1},minmax(0,1fr));gap:6px;margin-top:10px;`;
    photoUrls.forEach((photoUrl, index) => {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.gcReceiptToastPhoto = String(index + 1);
      link.setAttribute('aria-label', `بینینی وێنەی ${index + 1}ی وەرگرتنی کاڵا`);
      link.style.cssText = 'display:block;overflow:hidden;border:1px solid rgba(88,229,239,.28);border-radius:9px;max-height:120px;background:#07192a;';
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = `وێنەی بەڵگەی وەرگرتنی کاڵا ${index + 1}`;
      img.loading = 'eager';
      img.decoding = 'async';
      img.style.cssText = 'display:block;width:100%;height:110px;object-fit:cover;';
      link.appendChild(img);
      grid.appendChild(link);
    });
    toastNode.appendChild(grid);
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
        const eventKey = String(n.event_key || '');
        const toastNode = showToast(n.title || 'ئاگادارییەکی نوێ', n.body || 'دۆخی بار نوێکرایەوە.', eventKey);
        if (n.kind === 'warehouse_received' && eventKey) {
          void fetchReceiptPhotoPreview(eventKey)
            .then((photoUrls) => attachReceiptPhotoPreview(toastNode, eventKey, photoUrls))
            .catch((error) => console.warn('[gc-realtime] receipt photo preview', error));
        }
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
