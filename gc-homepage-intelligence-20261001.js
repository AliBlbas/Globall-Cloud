/* Globall Cloud — Homepage Intelligence interactions */
(() => {
  const root = document.querySelector('[data-gc-intelligence]');
  if (!root) return;
  const values = {
    air: { from: 'Guangzhou', via: 'Dubai Hub', to: 'Erbil', eta: '2–5 days', progress: '68%', status: 'Air lane · priority handling' },
    sea: { from: 'Ningbo', via: 'Jebel Ali', to: 'Erbil', eta: '20–35 days', progress: '42%', status: 'Sea lane · consolidated cargo' },
    land: { from: 'Dubai', via: 'UAE Hub', to: 'Erbil', eta: '3–7 days', progress: '84%', status: 'Land lane · door-to-door' }
  };
  const update = (mode) => {
    const state = values[mode] || values.air;
    root.querySelectorAll('[data-corridor-tab]').forEach((tab) => {
      const active = tab.dataset.corridorTab === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const nodes = root.querySelectorAll('[data-corridor-node]');
    if (nodes[0]) nodes[0].querySelector('b').textContent = state.from;
    if (nodes[1]) nodes[1].querySelector('b').textContent = state.via;
    if (nodes[2]) nodes[2].querySelector('b').textContent = state.to;
    const eta = root.querySelector('[data-corridor-eta]');
    const status = root.querySelector('[data-corridor-status]');
    const progress = root.querySelector('[data-corridor-progress]');
    if (eta) eta.textContent = state.eta;
    if (status) status.textContent = state.status;
    if (progress) progress.style.width = state.progress;
  };
  root.querySelectorAll('[data-corridor-tab]').forEach((tab) => tab.addEventListener('click', () => update(tab.dataset.corridorTab)));
  const counters = root.querySelectorAll('[data-intelligence-counter]');
  const animate = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.intelligenceCounter || 0);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && counters.forEach(animate)), { threshold: .25 });
    observer.observe(root);
  } else counters.forEach(animate);
})();
