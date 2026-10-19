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
    // Idempotent stylesheet mounting: the old implementation appended four
    // styles on every retry, creating duplicate cascade layers and layout work.
    const styles = [
      { file: 'globall-redesign-20260922.css', href: '/globall-redesign-20260922.css?v=2', marker: 'data-gc-final-redesign' },
      { file: 'globall-premium-logistics-2026.css', href: '/globall-premium-logistics-2026.css?v=1', marker: 'data-gc-premium-logistics' },
      { file: 'gc-final-ui-20260927.css', href: '/gc-final-ui-20260927.css?v=4', marker: 'data-gc-final-ui' },
      { file: 'gc-redesign-v2026.css', href: '/gc-redesign-v2026.css?v=20260927-3', marker: 'data-gc-redesign-v2026' },
      { file: 'gc-reference-app-20260927.css', href: '/gc-reference-app-20260927.css?v=1', marker: 'data-gc-reference-app' },
      { file: 'gc-reference-inspired-20260928.css', href: '/gc-reference-inspired-20260928.css?v=20260928-2', marker: 'data-gc-reference-inspired' }
    ];

    for (const item of styles) {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].filter((node) => {
        const path = String(node.getAttribute('href') || '').split('?')[0];
        return path === '/' + item.file || path.endsWith('/' + item.file);
      });
      let link = links.find((node) => node.getAttribute('href') === item.href) || links[0];
      for (const duplicate of links) if (duplicate !== link) duplicate.remove();

      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      if (link.getAttribute('href') !== item.href) link.setAttribute('href', item.href);
      link.setAttribute(item.marker, '1');
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

  const RATE_CATALOG_URL = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-quote?catalog=1';
  const ORIGIN_LABELS = { china: 'چین', dubai: 'دوبەی', usa: 'ئەمریکا' };
  let rateCatalog = [];
  let rateCatalogError = false;

  const rateMode = () => document.querySelector('[data-rate-mode].active')?.dataset.rateMode || 'air';
  const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const fmtNumber = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  const fmtCurrency = (value, currency = 'USD') => {
    const safeCurrency = /^[A-Z]{3}$/.test(String(currency)) ? String(currency) : 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: safeCurrency,
        minimumFractionDigits: safeCurrency === 'IQD' ? 0 : 2,
        maximumFractionDigits: safeCurrency === 'IQD' ? 0 : 2
      }).format(value);
    } catch (_) {
      return fmtNumber(value) + ' ' + safeCurrency;
    }
  };

  const setRateStatus = (state, message) => {
    const status = document.getElementById('gcRateCatalogStatus');
    const text = document.getElementById('gcRateCatalogText');
    if (status) status.dataset.state = state;
    if (text) text.textContent = message;
  };

  const getRatesForSelection = () => {
    const mode = rateMode();
    const origin = document.getElementById('gcRateOrigin')?.value || '';
    return rateCatalog.filter((row) =>
      String(row.destination_key || '').toLowerCase() === 'erbil' &&
      String(row.transport_mode || '').toLowerCase() === mode &&
      String(row.origin_key || '').toLowerCase() === origin
    );
  };

  const selectedRate = () => {
    const select = document.getElementById('gcRateProduct');
    if (!select?.value) return null;
    return rateCatalog.find((row) => String(row.rate_key || '') === select.value) || null;
  };

  const syncOriginOptions = () => {
    const select = document.getElementById('gcRateOrigin');
    if (!select || !rateCatalog.length) return;
    const mode = rateMode();
    const available = [...new Set(rateCatalog
      .filter((row) => String(row.destination_key || '').toLowerCase() === 'erbil' &&
        String(row.transport_mode || '').toLowerCase() === mode)
      .map((row) => String(row.origin_key || '').toLowerCase())
      .filter((key) => Object.prototype.hasOwnProperty.call(ORIGIN_LABELS, key)))];
    [...select.options].forEach((option) => {
      option.disabled = !available.includes(option.value);
      option.hidden = !available.includes(option.value);
    });
    if (!available.includes(select.value)) select.value = available[0] || '';
  };

  const renderProductOptions = () => {
    const select = document.getElementById('gcRateProduct');
    if (!select) return;
    const rows = getRatesForSelection().sort((a, b) => String(a.product_type || '').localeCompare(String(b.product_type || '')));
    select.replaceChildren();

    if (!rows.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = rateCatalog.length ? 'بۆ ئەم ڕێگا/جۆرە نرخێکی چالاک نییە' : 'چاوەڕێی نرخەکان…';
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      return;
    }

    for (const row of rows) {
      const option = document.createElement('option');
      option.value = String(row.rate_key || '');
      option.textContent = String(row.product_type || 'کاڵا') + ' · ' +
        fmtCurrency(num(row.amount), String(row.currency || 'USD')) + '/' + String(row.unit || 'unit').toUpperCase();
      select.appendChild(option);
    }

    const origin = document.getElementById('gcRateOrigin')?.value || '';
    const mode = rateMode();
    const prefer = mode === 'sea' ? /container/i :
      mode === 'land' ? /shoes|clothes/i :
      origin === 'china' ? /general cargo/i :
      origin === 'dubai' ? /accessories/i : /general goods/i;
    const preferred = rows.find((row) => prefer.test(String(row.product_type || '')));
    select.value = String((preferred || rows[0]).rate_key || '');
  };

  const updateRate = () => {
    const mode = rateMode();
    const origin = document.getElementById('gcRateOrigin')?.value || '';
    const weight = document.getElementById('gcRateWeight');
    const volumeInput = document.getElementById('gcRateCbm');
    const length = num(document.getElementById('gcRateLength')?.value);
    const width = num(document.getElementById('gcRateWidth')?.value);
    const height = num(document.getElementById('gcRateHeight')?.value);
    const priceEl = document.getElementById('gcRatePrice');
    const subEl = document.getElementById('gcRateSub');
    const labelEl = document.getElementById('gcRateModeLabel');
    const etaEl = document.getElementById('gcRateEta');
    const weightValue = document.getElementById('gcRateWeightValue');
    const dimensionSummary = document.getElementById('gcRateChargeableSummary');
    const dimensionsComplete = length > 0 && width > 0 && height > 0;
    const volumetricWeight = dimensionsComplete ? (length * width * height) / 6000 : 0;
    const dimensionCbm = dimensionsComplete ? (length * width * height) / 1000000 : null;
    const actualWeight = num(weight?.value);
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);

    if (weightValue && weight) weightValue.textContent = fmtNumber(actualWeight) + ' KG';
    if (dimensionSummary) {
      dimensionSummary.textContent = dimensionsComplete
        ? 'کێشی ڕاستەقینە: ' + fmtNumber(actualWeight) + ' kg · کێشی حجمی: ' + fmtNumber(volumetricWeight) + ' kg · کێشی حسابکراو: ' + fmtNumber(chargeableWeight) + ' kg'
        : 'درێژی، پانی و بەرزی بنووسە بۆ حسابکردنی کێشی حجمی؛ یاسا: (L × W × H) ÷ 6000.';
    }

    const rate = selectedRate();
    if (labelEl) labelEl.textContent = (ORIGIN_LABELS[origin] || '—') + ' · ' + mode.toUpperCase();
    const minNote = document.getElementById('gcRateMinimumNote');
    if (minNote) minNote.textContent = chargeableWeight < 1
      ? 'یاسای Minimum Charge چالاکە: ' + fmtCurrency(5000, 'IQD') + ' بۆ بارێکی کەمتر لە 1kg.'
      : 'ئەگەر کێشی حسابکراو لە 1kg کەمتر بێت، کەمترین تێچوو ' + fmtCurrency(5000, 'IQD') + ـە.';

    if (!rate) {
      if (priceEl) priceEl.textContent = '—';
      if (subEl) subEl.textContent = rateCatalogError
        ? 'نرخەکان لە backend نەهاتوون؛ تکایە داوای نرخ بکە.'
        : 'تکایە چاوەڕێ بکە تا نرخی ڕاستەقینە باربکرێت.';
      if (etaEl) etaEl.textContent = 'پشتڕاست دەکرێتەوە';
      return;
    }

    const amount = num(rate.amount);
    const unit = String(rate.unit || '').toLowerCase();
    const currency = String(rate.currency || 'USD').toUpperCase();
    if (Number.isFinite(Number(rate.transit_min_days)) && Number.isFinite(Number(rate.transit_max_days)) &&
        Number(rate.transit_min_days) > 0 && Number(rate.transit_max_days) >= Number(rate.transit_min_days)) {
      if (etaEl) etaEl.textContent = Number(rate.transit_min_days) + '–' + Number(rate.transit_max_days) + ' ڕۆژ';
    } else if (etaEl) {
      etaEl.textContent = mode === 'air' && origin === 'china' ? '7–10 ڕۆژ'
        : mode === 'air' && origin === 'usa' ? '10–15 ڕۆژ'
        : 'لە ستاف پشتڕاست دەکرێتەوە';
    }

    if (chargeableWeight < 1) {
      if (priceEl) priceEl.textContent = fmtCurrency(5000, 'IQD');
      if (subEl) subEl.textContent = 'کەمترین تێچوو بۆ بارێکی کەمتر لە 1kg؛ نرخی بنەڕەتی لە ' +
        fmtCurrency(amount, currency) + '/' + unit + ' ـە.';
      return;
    }

    if (unit === 'cbm') {
      const manualCbm = num(volumeInput?.value);
      const cbm = dimensionCbm !== null ? dimensionCbm : manualCbm;
      if (!(cbm > 0)) {
        if (priceEl) priceEl.textContent = '—';
        if (subEl) subEl.textContent = 'قەبارەی بار بە CBM بنووسە، یان درێژی/پانی/بەرزی داخڵ بکە.';
        return;
      }
      const total = cbm * amount;
      if (priceEl) priceEl.textContent = fmtCurrency(total, currency);
      if (subEl) subEl.textContent = fmtNumber(cbm) + ' CBM × ' + fmtCurrency(amount, currency) + '/CBM' +
        (dimensionCbm !== null ? ' · لە قەبارای کارتۆن حساب کراوە' : '');
      return;
    }

    if (unit === 'kg') {
      const total = chargeableWeight * amount;
      if (priceEl) priceEl.textContent = fmtCurrency(total, currency);
      if (subEl) subEl.textContent = fmtNumber(chargeableWeight) + ' KG × ' +
        fmtCurrency(amount, currency) + '/KG' +
        (volumetricWeight > actualWeight ? ' · کێشی حجمی بەکارهاتووە' : '');
      return;
    }

    if (priceEl) priceEl.textContent = '—';
    if (subEl) subEl.textContent = 'یەکەی ئەم نرخە بۆ خەملاندنی خۆکار ناناسرێتەوە؛ داوای نرخ بکە.';
  };

  async function loadRateCatalog() {
    setRateStatus('loading', 'نرخەکان لە pricing engine وەردەگیرێنەوە…');
    try {
      const response = await fetch(RATE_CATALOG_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Pricing catalog returned ' + response.status);
      const body = await response.json();
      if (!body || !Array.isArray(body.rates)) throw new Error('Pricing catalog shape is invalid');
      rateCatalog = body.rates.filter((row) => row && row.rate_key && Number.isFinite(Number(row.amount)) &&
        ['kg', 'cbm'].includes(String(row.unit || '').toLowerCase()) &&
        String(row.currency || '').toUpperCase() === 'USD');
      if (!rateCatalog.length) throw new Error('No active public rates returned');
      rateCatalogError = false;
      setRateStatus('ready', 'نرخەکان لە backend وەرگیران');
      syncOriginOptions();
      renderProductOptions();
      updateRate();
    } catch (error) {
      rateCatalogError = true;
      console.error('[Globall Cloud] Pricing catalog:', error);
      setRateStatus('error', 'نرخی live نەهاتووە؛ ژمارەی ساختە نیشان نادرێت');
      updateRate();
    }
  }

  const mountLandingInteractions = () => {
    if (window.__gcPublicRateExplorerMounted) return;
    window.__gcPublicRateExplorerMounted = true;

    const origin = document.getElementById('gcRateOrigin');
    const product = document.getElementById('gcRateProduct');
    const weight = document.getElementById('gcRateWeight');
    const volume = document.getElementById('gcRateCbm');
    const weightWrap = document.getElementById('gcRateWeightWrap');
    const presets = document.getElementById('gcRatePresets');
    const volumeWrap = document.getElementById('gcRateVolumeWrap');
    const dimensions = document.getElementById('gcRateDimensionsWrap');

    const syncInputVisibility = () => {
      const sea = rateMode() === 'sea';
      if (volumeWrap) volumeWrap.hidden = !sea;
      if (weightWrap) weightWrap.hidden = false;
      if (presets) presets.hidden = false;
      if (dimensions) dimensions.hidden = false;
    };

    document.querySelectorAll('[data-rate-mode]').forEach((button) => button.addEventListener('click', () => {
      document.querySelectorAll('[data-rate-mode]').forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
      syncInputVisibility();
      if (rateCatalog.length) {
        syncOriginOptions();
        renderProductOptions();
      }
      updateRate();
    }));

    origin?.addEventListener('change', () => {
      if (rateCatalog.length) renderProductOptions();
      updateRate();
    });
    product?.addEventListener('change', updateRate);
    weight?.addEventListener('input', updateRate);
    volume?.addEventListener('input', updateRate);
    ['gcRateLength', 'gcRateWidth', 'gcRateHeight'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateRate);
    });
    document.querySelectorAll('[data-rate-weight]').forEach((button) => button.addEventListener('click', () => {
      if (weight) weight.value = button.dataset.rateWeight;
      updateRate();
    }));

    document.querySelector('[data-studio-sync]')?.addEventListener('click', () => {
      const studioMode = document.querySelector('[data-studio-mode].active')?.dataset.studioMode;
      const button = studioMode ? document.querySelector('[data-rate-mode="' + studioMode + '"]') : null;
      button?.click();
      document.getElementById('gcRateExplorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const serviceCopy = {
      air: { title: 'Air Freight · خێرایی بۆ بارە پەلەکان', text: 'باشترین هەڵبژاردەیە بۆ کاڵای کەم‌قەبارە و پەلەدارەکان، بە نرخدانانی پەیوەست بە جۆری کاڵا و کێشی حسابکراو.' },
      sea: { title: 'Sea Freight · بۆ بارە قورسەکان', text: 'نرخ بە CBM حساب دەکرێت؛ قەبارەی بار بە وردی بنووسە بۆ خەملاندنی دروست.' },
      land: { title: 'Land Freight · گواستنەوەی وشکانی', text: 'نرخ بە بنەمای ڕێگا و جۆری کاڵا دەردەچێت؛ وەرگرتنی کۆتایی لە ئۆفیسی هەولێرە.' },
      customs: { title: 'Customs & Documents · بەڵگە و گومرگ', text: 'بەڵگە و پڕۆسەی گومرگ بە شێوەی ڕێکخراو و بەدواداچوونپێکراو بەڕێوەدەبرێت.' }
    };
    document.querySelectorAll('[data-gc-service]').forEach((card) => card.addEventListener('click', (event) => {
      event.preventDefault();
      const copy = serviceCopy[card.dataset.gcService] || serviceCopy.air;
      const title = document.getElementById('gcServiceTitle');
      const body = document.getElementById('gcServiceText');
      if (title) title.textContent = copy.title;
      if (body) body.textContent = copy.text;
      document.querySelectorAll('[data-gc-service]').forEach((item) => item.classList.toggle('is-selected', item === card));
      document.getElementById('gcServiceInspector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));

    syncInputVisibility();
    void loadRateCatalog();
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
    document.addEventListener('DOMContentLoaded', () => { mountFinalStyle(); bootRoute(); }, {once:true});
  } else {
    mountFinalStyle(); bootRoute();
  }
  window.addEventListener('hashchange', bootRoute);
})();
