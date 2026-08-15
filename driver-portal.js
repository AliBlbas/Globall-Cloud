(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const DRIVER_GPS_URL = `${SUPABASE_URL}/functions/v1/driver-gps`;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  let assignments = [];
  let selected = null;
  let watchId = null;
  let lastSentAt = 0;
  let lastCoords = null;
  let sending = false;

  function setMessage(text, good = false) {
    $('message').textContent = text || '';
    $('message').style.color = good ? 'var(--green)' : '';
  }
  function setLoginMessage(text) { $('loginMsg').textContent = text || ''; }

  async function authHeaders() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) throw new Error('Session نەدۆزرایەوە.');
    return { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  }

  async function driverRequest(url, options = {}) {
    const headers = await authHeaders();
    const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) }, credentials: 'omit', cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
    return body;
  }

  function render() {
    const root = $('assignments');
    if (!assignments.length) {
      root.innerHTML = '<div class="empty wide">هیچ delivery assignment ـێکی چالاکت نییە.</div>';
      return;
    }
    root.innerHTML = assignments.map((item, i) => {
      const s = item.shipment || {};
      const active = selected?.id === item.id ? ' active' : '';
      const status = item.status || 'assigned';
      const buttonLabel = status === 'assigned' ? 'Pick Up' : status === 'picked_up' ? 'Start Route' : 'GPS Live';
      const disabled = selected?.id === item.id && watchId ? 'disabled' : '';
      return `<article class="panel assignment${active}" data-index="${i}">
        <div class="code">${escapeHtml(s.id || item.shipment_id || '—')}</div>
        <div class="route">${escapeHtml(s.origin_key || '—')} → ${escapeHtml(s.dest_key || '—')}</div>
        <div class="muted" style="font-size:12px;margin-top:5px">${escapeHtml(s.customer_name || 'Customer')} · ${escapeHtml(s.type || '—')}</div>
        <div class="meta">
          <div><span>Status</span><b>${escapeHtml(status)}</b></div>
          <div><span>ETA</span><b>${escapeHtml(formatDate(s.eta))}</b></div>
          <div><span>Weight</span><b>${s.weight_kg != null ? `${escapeHtml(s.weight_kg)} kg` : '—'}</b></div>
          <div><span>Items</span><b>${s.items_count != null ? escapeHtml(s.items_count) : '—'}</b></div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="button" data-action="advance" data-index="${i}" ${disabled}>${buttonLabel}</button>
          <button class="btn" type="button" data-action="select" data-index="${i}">Select</button>
          <button class="btn wide" type="button" data-action="stop" data-index="${i}">Stop GPS</button>
        </div>
      </article>`;
    }).join('');
  }

  function escapeHtml(value) { return String(value ?? '—').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
  function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ku-IQ', { dateStyle:'medium', timeStyle:'short' }); }

  async function loadAssignments() {
    $('gpsStatus').textContent = 'Checking assignment…';
    const body = await driverRequest(DRIVER_GPS_URL, { method: 'GET' });
    assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (body.driver?.full_name) $('driverName').textContent = body.driver.full_name;
    render();
    $('gpsStatus').textContent = assignments.length ? 'Ready' : 'No active assignment';
  }

  async function sendLocation(position, status = '') {
    if (!selected || sending) return;
    const now = Date.now();
    if (!status && now - lastSentAt < 15000) return;
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    sending = true;
    try {
      const body = await driverRequest(DRIVER_GPS_URL, {
        method: 'POST',
        body: JSON.stringify({ shipment_id: selected.shipment_id, latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : null, location_label: null, status }),
      });
      lastSentAt = now;
      lastCoords = { latitude, longitude };
      $('gpsStatus').textContent = `Live · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      $('lastSent').textContent = new Date().toLocaleTimeString('ku-IQ');
      setMessage(status ? `دۆخەکە گۆڕدرا بۆ ${status}.` : 'GPS نوێکرایەوە.', true);
      if (body?.assignment?.status) {
        selected.status = body.assignment.status;
        const fresh = assignments.find((x) => x.id === selected.id);
        if (fresh) fresh.status = body.assignment.status;
        render();
      }
    } catch (error) {
      setMessage(error?.message || 'GPS update سەرکەوتوو نەبوو.');
    } finally {
      sending = false;
    }
  }

  function beginWatch(status) {
    if (!selected) return;
    if (!navigator.geolocation) {
      setMessage('ئەم device ـە geolocation پشتگیری ناکات.');
      return;
    }
    if (watchId) navigator.geolocation.clearWatch(watchId);
    $('gpsStatus').textContent = 'Requesting GPS permission…';
    watchId = navigator.geolocation.watchPosition(
      (position) => void sendLocation(position, status || ''),
      (error) => setMessage(`GPS error (${error.code}): ${error.message}`),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }

  function stopWatch() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    $('gpsStatus').textContent = lastCoords ? `Paused · ${lastCoords.latitude.toFixed(5)}, ${lastCoords.longitude.toFixed(5)}` : 'GPS stopped';
  }

  async function advance(index) {
    selected = assignments[index];
    const current = selected.status || 'assigned';
    const next = current === 'assigned' ? 'picked_up' : current === 'picked_up' ? 'out_for_delivery' : 'out_for_delivery';
    if (next === 'out_for_delivery') beginWatch(next);
    else beginWatch(next);
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy:true, timeout:20000, maximumAge:10000 }));
      await sendLocation(position, next);
      selected = assignments[index];
      render();
      if (next === 'out_for_delivery') beginWatch('');
    } catch (error) {
      setMessage(error?.message || 'نەتوانرا GPS وەرگیرێت.');
    }
  }

  $('assignments').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || !assignments[index]) return;
    const action = button.dataset.action;
    if (action === 'select') { selected = assignments[index]; render(); setMessage(`Assignment ـی ${selected.shipment_id} هەڵبژێردرا.`, true); return; }
    if (action === 'stop') { if (selected?.id === assignments[index].id) stopWatch(); else { selected = assignments[index]; stopWatch(); } return; }
    if (action === 'advance') { await advance(index); }
  });

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setLoginMessage('لە چوونەژوورەوە...');
    try {
      const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
      if (error) throw error;
      $('login').classList.add('hidden'); $('app').classList.remove('hidden');
      await loadAssignments();
    } catch (error) { setLoginMessage(error?.message || 'Login سەرکەوتوو نەبوو.'); }
  });

  $('refresh').addEventListener('click', () => void loadAssignments().catch((error) => setMessage(error?.message || 'نوێکردنەوە سەرکەوتوو نەبوو.')));
  $('logout').addEventListener('click', async () => { stopWatch(); await sb.auth.signOut(); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); });

  sb.auth.onAuthStateChange((_event, session) => {
    if (!session) { stopWatch(); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); }
  });

  (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) { $('login').classList.add('hidden'); $('app').classList.remove('hidden'); await loadAssignments(); }
    } catch (error) { setLoginMessage(error?.message || 'Session load failed.'); }
  })();
})();
