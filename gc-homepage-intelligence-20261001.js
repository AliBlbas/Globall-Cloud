/* Homepage route overview: illustrative corridors only; no shipment ETAs or progress claims. */
(() => {
  const root = document.querySelector('[data-gc-intelligence]');
  if (!root) return;
  const routes = {
    air: { from: 'China', via: 'Dubai', to: 'Erbil', note: 'Active rate catalog · final quote confirmed by staff', status: 'Air corridor · quote required' },
    sea: { from: 'China', via: 'Jebel Ali', to: 'Erbil', note: 'CBM-based quote · final quote confirmed by staff', status: 'Sea corridor · CBM quote required' },
    land: { from: 'Dubai', via: 'UAE', to: 'Erbil', note: 'Weight/category rate · final quote confirmed by staff', status: 'Land corridor · quote required' },
  };
  const update = (mode) => {
    const route = routes[mode] || routes.air;
    root.querySelectorAll('[data-corridor-tab]').forEach((tab) => {
      const active = tab.dataset.corridorTab === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const nodes = root.querySelectorAll('[data-corridor-node]');
    if (nodes[0]?.querySelector('b')) nodes[0].querySelector('b').textContent = route.from;
    if (nodes[1]?.querySelector('b')) nodes[1].querySelector('b').textContent = route.via;
    if (nodes[2]?.querySelector('b')) nodes[2].querySelector('b').textContent = route.to;
    const note = root.querySelector('[data-corridor-note]');
    const status = root.querySelector('[data-corridor-status]');
    if (note) note.textContent = route.note;
    if (status) status.textContent = route.status;
  };
  root.querySelectorAll('[data-corridor-tab]').forEach((tab) => tab.addEventListener('click', () => update(tab.dataset.corridorTab)));

  const healthBadge = root.querySelector('[data-intelligence-health]');
  const healthLabel = root.querySelector('[data-intelligence-health-label]');
  const syncLabel = root.querySelector('[data-intelligence-sync]');
  const formatTime = (value) => {
    try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Baghdad' }).format(new Date(value)); }
    catch (_) { return '—'; }
  };
  const setHealth = (state, label, detail) => {
    if (!healthBadge) return;
    healthBadge.dataset.state = state;
    if (healthLabel) healthLabel.textContent = label;
    if (syncLabel) syncLabel.textContent = detail;
  };
  const refreshHealth = async () => {
    if (!healthBadge) return;
    setHealth('checking', 'CHECKING SYSTEM', 'checking…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch('/api/ready', { headers: { accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
      const body = await response.json();
      if (!response.ok || body?.ok !== true || body?.status !== 'ready' || body?.supabase?.ok !== true) throw new Error('readiness degraded');
      setHealth('ready', 'SYSTEM READY', `last check · ${formatTime(body.timestamp)} · ${body.supabase.latency_ms}ms`);
      healthBadge.title = `Backend ready · request ${body.request_id || '—'}`;
    } catch (_) {
      setHealth('degraded', 'SYSTEM STATUS UNAVAILABLE', 'backend check did not complete');
      healthBadge.title = 'The backend readiness check did not complete successfully.';
    } finally { window.clearTimeout(timeout); }
  };
  update('air');
  refreshHealth();
  window.setInterval(refreshHealth, 60000);
})();
