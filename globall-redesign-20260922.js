(() => {
  const ensureStylesheet = (href, marker) => {
    const targetPath = new URL(href, document.baseURI).pathname;
    const samePath = (node) => {
      try { return new URL(node.href, document.baseURI).pathname === targetPath; }
      catch (_) { return false; }
    };
    const pathMatches = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(samePath);
    const markerMatches = [...document.querySelectorAll(`link[${marker}]`)];
    const link = markerMatches.find(samePath) || pathMatches[0] || markerMatches[0] || document.createElement('link');

    // Keep exactly one DOM node per stylesheet path even when cache keys change.
    pathMatches.forEach((node) => { if (node !== link) node.remove(); });
    markerMatches.forEach((node) => { if (node !== link) node.remove(); });

    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, '1');
    return link;
  };

  const mountFinalStyle = () => {
    const finalStyles = [
      ensureStylesheet('/globall-redesign-20260922.css?v=2', 'data-gc-final-redesign'),
      ensureStylesheet('/globall-premium-logistics-2026.css?v=1', 'data-gc-premium-logistics'),
      ensureStylesheet('/gc-final-ui-20260927.css?v=4', 'data-gc-final-ui'),
      ensureStylesheet('/gc-redesign-v2026.css?v=20260927-3', 'data-gc-redesign-v2026'),
      ensureStylesheet('/gc-reference-app-20260927.css?v=1', 'data-gc-reference-app'),
      ensureStylesheet('/gc-reference-inspired-20260928.css?v=20260928-2', 'data-gc-reference-inspired')
    ];

    // Preserve override precedence in one batched DOM operation, without duplicate links.
    const children = [...document.head.children];
    const alreadyLastInOrder = finalStyles.every(
      (link, index) => children[children.length - finalStyles.length + index] === link
    );
    if (!alreadyLastInOrder) {
      const fragment = document.createDocumentFragment();
      finalStyles.forEach((link) => fragment.appendChild(link));
      document.head.appendChild(fragment);
    }
  };

  const syncPages = (id) => {
    document.querySelectorAll('.gc-app .page').forEach(page => {
      const active = page.id === ('page-' + id);
      page.classList.toggle('active', active);
      page.hidden = !active;
    });
  };

  const menu = document.querySelector('[data-gc-menu]');
  const mobile = document.querySelector('[data-gc-mobile-menu]');
  menu?.addEventListener('click', () => { if (mobile) mobile.hidden = !mobile.hidden; });
  document.querySelectorAll('[data-gc-mobile-menu] a').forEach(a => a.addEventListener('click', () => { if (mobile) mobile.hidden = true; }));

  const rateData = {
    air: { label: 'AIR · EXPRESS', eta: '٢–٥ ڕۆژ', base: 22, perKg: 4.8, service: 'Air Freight · خێرایی بۆ بارە پەلەکان', text: 'باشترین هەڵبژاردەیە بۆ بارە کەم‌قەبارە و پەلەدارەکان، بە ڕێگای ڕوون لە source تا Erbil.' },
    sea: { label: 'SEA · ECONOMY', eta: '٢٠–٣٥ ڕۆژ', base: 68, perKg: 1.1, service: 'Sea Freight · بۆ بارە قورسەکان', text: 'بۆ بارە قورس و کۆکراوەکان، بە تێچووی گونجاو و پلانی ڕوون بۆ هەر route leg.' },
    land: { label: 'LAND · DOOR-TO-DOOR', eta: '٣–٧ ڕۆژ', base: 40, perKg: 2.1, service: 'Land Freight · گەیاندنی وشکانی', text: 'بۆ گواستنەوەی ناوخۆیی و گەیاندن تا دەرگای کڕیار لە هەموو عێراق.' }
  };
  const money = value => '$' + Math.round(value).toLocaleString('en-US');
  const updateRate = (mode, weight) => {
    const data = rateData[mode] || rateData.air;
    const kg = Math.max(1, Number(weight) || 10);
    const price = data.base + data.perKg * kg;
    const weightValue = document.getElementById('gcRateWeightValue');
    const priceEl = document.getElementById('gcRatePrice');
    const subEl = document.getElementById('gcRateSub');
    const labelEl = document.getElementById('gcRateModeLabel');
    const etaEl = document.getElementById('gcRateEta');
    if (weightValue) weightValue.textContent = kg + ' KG';
    if (priceEl) priceEl.textContent = money(price);
    if (subEl) subEl.textContent = 'نرخی دەستپێک بۆ ' + kg + ' KG';
    if (labelEl) labelEl.textContent = data.label;
    if (etaEl) etaEl.textContent = data.eta;
    const active = document.querySelector('[data-rate-mode].active');
    if (active) active.setAttribute('aria-selected', 'true');
  };
  const mountLandingInteractions = () => {
    let mode = 'air';
    const weight = document.getElementById('gcRateWeight');
    document.querySelectorAll('[data-rate-mode]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.rateMode || 'air';
      document.querySelectorAll('[data-rate-mode]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-selected', item === button ? 'true' : 'false'); });
      updateRate(mode, weight?.value || 10);
    }));
    weight?.addEventListener('input', () => updateRate(mode, weight.value));
    document.querySelectorAll('[data-rate-weight]').forEach(button => button.addEventListener('click', () => { if (weight) weight.value = button.dataset.rateWeight; updateRate(mode, button.dataset.rateWeight); }));
    updateRate(mode, weight?.value || 10);
    const titles = { air: rateData.air.service, sea: rateData.sea.service, land: rateData.land.service, customs: 'Customs & Documents · بەڵگە و گومرگ' };
    const texts = { air: rateData.air.text, sea: rateData.sea.text, land: rateData.land.text, customs: 'بەڵگە، invoice و پڕۆسەی گومرگ بە شێوەی ڕێکخراو و قابل‌پێشبینین بەڕێوەدەبرێت.' };
    document.querySelectorAll('[data-gc-service]').forEach(card => card.addEventListener('click', event => {
      event.preventDefault();
      const key = card.dataset.gcService || 'air';
      const title = document.getElementById('gcServiceTitle');
      const text = document.getElementById('gcServiceText');
      if (title) title.textContent = titles[key] || titles.air;
      if (text) text.textContent = texts[key] || texts.air;
      document.querySelectorAll('[data-gc-service]').forEach(item => item.classList.toggle('is-selected', item === card));
      document.getElementById('gcServiceInspector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  };
  mountLandingInteractions();
  const requestForm = document.getElementById('requestForm');
  requestForm?.addEventListener('submit', (event) => {
    const fn = window.handleRequestSubmit;
    if (typeof fn === 'function') {
      event.preventDefault();
      Promise.resolve(fn(event)).catch(() => {});
    }
  });

  const bootRoute = () => {
    const hash = String(location.hash || '').replace(/^#/, '');
    const allowed = ['home','about','services','track','request','portal','contact'];
    const id = allowed.includes(hash) ? hash : (location.pathname === '/services' ? 'services' : location.pathname === '/track' ? 'track' : location.pathname === '/request' || location.pathname === '/quote' ? 'request' : location.pathname === '/dashboard' || location.pathname === '/portal' ? 'portal' : location.pathname === '/contact' ? 'contact' : 'home');
    if (typeof window.route === 'function') {
      try { window.route(id); return; } catch (_) {}
    }
    syncPages(id);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mountFinalStyle(); bootRoute(); setTimeout(mountFinalStyle, 1200); }, {once:true});
  } else {
    mountFinalStyle(); bootRoute(); setTimeout(mountFinalStyle, 1200);
  }
  window.addEventListener('hashchange', bootRoute);
})();
