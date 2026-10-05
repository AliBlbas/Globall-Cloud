(() => {
  const mountFinalStyle = () => {
    const href = '/globall-redesign-20260922.css?v=2';
    const premiumHref = '/globall-premium-logistics-2026.css?v=1';
    [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => l.href.includes('/globall-redesign-20260922.css')).forEach(l => l.remove());
    [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => l.href.includes('/globall-premium-logistics-2026.css')).forEach(l => l.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gcFinalRedesign = '1';
    document.head.appendChild(link);
    const premium = document.createElement('link');
    premium.rel = 'stylesheet';
    premium.href = premiumHref;
    premium.dataset.gcPremiumLogistics = '1';
    document.head.appendChild(premium);
    const final = document.createElement('link');
    final.rel = 'stylesheet';
    final.href = '/gc-final-ui-20260927.css?v=4';
    final.dataset.gcFinalUi = '1';
    document.head.appendChild(final);
    document.querySelectorAll('link[data-gc-redesign-v2026]').forEach((node) => node.remove());
    const publicRedesign = document.createElement('link');
    publicRedesign.rel = 'stylesheet';
    publicRedesign.href = '/gc-redesign-v2026.css?v=20260927-3';
    publicRedesign.dataset.gcRedesignV2026 = '1';
    document.head.appendChild(publicRedesign);
    const referenceApp = document.createElement('link');
    referenceApp.rel = 'stylesheet';
    referenceApp.href = '/gc-reference-app-20260927.css?v=1';
    referenceApp.dataset.gcReferenceApp = '1';
    document.head.appendChild(referenceApp);
    const referenceInspired = document.createElement('link');
    referenceInspired.rel = 'stylesheet';
    referenceInspired.href = '/gc-reference-inspired-20260928.css?v=20260928-2';
    referenceInspired.dataset.gcReferenceInspired = '1';
    document.head.appendChild(referenceInspired);
  };

  const syncPages = (id) => {
    document.querySelectorAll('.gc-app .page').forEach(page => {
      const active = page.id === ('page-' + id);
      page.classList.toggle('active', active);
      page.hidden = !active;
    });
  };


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
    if (id === 'services' && (location.pathname === '/' || location.pathname === '/index.html') && document.getElementById('services')) {
      try { if (typeof window.route === 'function') window.route('home'); } catch (_) {}
      window.setTimeout(() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return;
    }
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
