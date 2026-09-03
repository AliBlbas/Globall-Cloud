(() => {
  'use strict';
  if (!/^\/warehouse(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;
  if (window.__gcWarehouseOfflineSync) return;
  window.__gcWarehouseOfflineSync = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const WAREHOUSE_API = `${SUPABASE_URL}/functions/v1/warehouse-receiving`;
  const DB_NAME = 'globall-cloud-offline';
  const STORE = 'warehouse-receipts';
  const DB_VERSION = 1;
  const originalFetch = window.fetch.bind(window);

  const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const isWarehouseRequest = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    return method === 'POST' && url.startsWith(WAREHOUSE_API);
  };

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB is not supported'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Offline database unavailable'));
    });
  }

  async function put(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Offline save failed')); };
    });
  }

  async function all() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error || new Error('Offline queue read failed')); };
    });
  }

  async function remove(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Offline queue delete failed')); };
    });
  }

  async function formToEntries(form) {
    const entries = [];
    for (const [name, value] of form.entries()) {
      if (typeof value === 'string') {
        entries.push({ name, kind: 'text', value });
      } else if (value instanceof Blob) {
        entries.push({
          name,
          kind: 'blob',
          value,
          filename: value.name || `${name}.bin`,
          type: value.type || 'application/octet-stream',
          lastModified: value.lastModified || Date.now(),
        });
      }
    }
    return entries;
  }

  function entriesToForm(entries) {
    const form = new FormData();
    for (const entry of entries || []) {
      if (entry.kind === 'blob') form.append(entry.name, new File([entry.value], entry.filename || 'upload.bin', { type: entry.type || 'application/octet-stream', lastModified: entry.lastModified || Date.now() }));
      else form.append(entry.name, String(entry.value ?? ''));
    }
    return form;
  }

  async function getToken() {
    try {
      const client = window.gcSupabase;
      if (!client?.auth) return null;
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || null;
    } catch (_) {
      return null;
    }
  }

  async function queueForm(form, reason = 'offline') {
    const entries = await formToEntries(form);
    const idempotency = String(form.get('idempotency_key') || crypto.randomUUID());
    const item = { id: idempotency, created_at: new Date().toISOString(), reason, attempts: 0, entries };
    await put(item);
    emit('gc:warehouse-offline-queued', { id: idempotency });
    return idempotency;
  }

  async function syncQueue() {
    let queue = [];
    try { queue = await all(); } catch (_) { return; }
    if (!queue.length) return;
    const token = await getToken();
    if (!token) return;
    let remaining = queue.length;
    for (const item of queue) {
      try {
        const form = entriesToForm(item.entries);
        const response = await originalFetch(WAREHOUSE_API, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
            'x-gc-offline-replay': '1',
          },
          body: form,
          cache: 'no-store',
        });
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
            await remove(item.id);
            emit('gc:warehouse-offline-rejected', { id: item.id, status: response.status });
            remaining -= 1;
          }
          continue;
        }
        await remove(item.id);
        remaining -= 1;
        emit('gc:warehouse-offline-synced', { id: item.id });
      } catch (_) {
        item.attempts = Number(item.attempts || 0) + 1;
        try { await put(item); } catch (_) {}
        break;
      }
    }
    emit('gc:warehouse-offline-state', { pending: remaining });
  }

  window.fetch = async (input, init = {}) => {
    if (!isWarehouseRequest(input, init) || init?.headers?.['x-gc-offline-replay']) return originalFetch(input, init);
    const request = input instanceof Request ? input : null;
    const body = init.body ?? request?.body;
    if (!(body instanceof FormData)) return originalFetch(input, init);
    if (navigator.onLine === false) {
      await queueForm(body, 'offline');
      return new Response(JSON.stringify({ ok: true, offline_queued: true, message: 'Warehouse receipt saved offline and will sync automatically.' }), { status: 202, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    try {
      return await originalFetch(input, init);
    } catch (error) {
      try {
        const id = await queueForm(body, 'network_error');
        return new Response(JSON.stringify({ ok: true, offline_queued: true, id, message: 'Network unavailable. Warehouse receipt saved locally for automatic sync.' }), { status: 202, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      } catch (_) {
        throw error;
      }
    }
  };

  window.addEventListener('online', () => { void syncQueue(); });
  window.addEventListener('load', () => { void syncQueue(); });
  window.addEventListener('gc:staff-auth-ready', () => { void syncQueue(); });
  emit('gc:warehouse-offline-ready');
  void syncQueue();
})();
