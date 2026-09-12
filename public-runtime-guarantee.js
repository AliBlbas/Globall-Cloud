(() => {
  'use strict';

  const VERSION = '20260912-4';
  const RENDERERS = [
    'renderHomeServices',
    'renderBusinessHub',
    'renderDashboardPreview',
    'renderCorridorStrip',
    'renderWarehouseCards',
    'renderOperationsHub',
    'renderHow',
    'renderWhy',
    'renderAboutValues',
    'renderFooterServices',
    'renderLegalDocs',
    'renderTestimonials',
  ];

  const PUBLIC_ROUTES = new Set(['home', 'about', 'services', 'track', 'request', 'portal', 'contact']);
  let booted = false;

  const safeCall = (fn, ...args) => {
    try {
      return typeof fn === 'function' ? fn(...args) : undefined;
    } catch (error) {
      console.warn('[Globall Cloud] public runtime recovery:', error?.message || error);
      return undefined;
    }
  };

  const currentRoute = () => {
    const id = location.hash.replace(/^#/, '') || 'home';
    return PUBLIC_ROUTES.has(id) ? id : 'home';
  };

  const hydrateTranslations = () => {
    const translate = window.t;
    if (typeof translate !== 'function') return false;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = safeCall(translate, element.getAttribute('data-i18n'));
      if (typeof value === 'string' && value && value !== element.getAttribute('data-i18n')) {
        element.textContent = value;
      }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach((element) => {
      const value = safeCall(translate, element.getAttribute('data-i18n-ph'));
      if (typeof value === 'string' && value) element.setAttribute('placeholder', value);
    });

    return true;
  };

  const activateRoute = () => {
    const id = currentRoute();

    if (typeof window.route === 'function') {
      safeCall(window.route, id);
      return;
    }

    document.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page.id === `page-${id}`);
      page.hidden = page.id !== `page-${id}`;
    });
  };

  const hydrateRenderers = () => {
    let ran = 0;
    for (const name of RENDERERS) {
      const fn = window[name];
      if (typeof fn === 'function') {
        safeCall(fn);
        ran += 1;
      }
    }
    return ran;
  };

  const pageHasVisibleText = () => {
    const active = document.querySelector('.page.active') || document.querySelector('#page-home');
    if (!active) return false;
    const text = (active.textContent || '').replace(/\s+/g, ' ').trim();
    const blankDynamic = active.querySelectorAll('[data-i18n]:empty').length;
    return text.length > 120 && blankDynamic < 8;
  };

  const renderEmergencyShell = () => {
    if (!document.getElementById('page-home')) return;
    if (pageHasVisibleText()) return;

    const route = currentRoute();
    const labels = {
      home: ['Globall Cloud', 'لۆجستیکی ڕاستەقینە لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو عێراق.', 'بینینی خزمەتگوزاری', '/services'],
      about: ['دەربارەی Globall Cloud', 'تۆڕی لۆجستیکی بۆ گواستنەوەی بار و بەڕێوەبردنی پڕۆسەکان.', 'گەڕانەوە بۆ سەرەکی', '/'],
      services: ['خزمەتگوزارییەکان', 'Air · Sea · Land · گومرگ · Door-to-Door · Tracking', 'داواکردنی نرخ', '/request'],
      track: ['شوێنکەوتنی بار', 'ژمارەی Tracking ـەکەت بنووسە بۆ بینینی دۆخی بار.', 'کردنەوەی Tracking', '/track'],
      request: ['داواکردنی نرخ', 'ڕێگای بار و زانیارییە سەرەکییەکان بنێرە بۆ خەملاندنی نرخ.', 'پەیوەندی', '/contact'],
      portal: ['پرۆتالی کڕیار', 'بارەکان و بەڵگەکانت لە یەک شوێن بەڕێوەببە.', 'چوونە ژوورەوە', '/portal'],
      contact: ['پەیوەندی', 'واتساپ و تیمی پشتگیریی Globall Cloud لە خزمەتتە.', 'گەڕانەوە بۆ سەرەکی', '/'],
    };
    const data = labels[route] || labels.home;

    document.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page.id === 'page-home');
      page.hidden = page.id !== 'page-home';
    });

    const home = document.getElementById('page-home');
    if (!home || home.dataset.gcEmergencyRendered === VERSION) return;
    home.dataset.gcEmergencyRendered = VERSION;
    home.innerHTML = `
      <div style="min-height:70vh;display:grid;place-items:center;padding:48px 24px;background:radial-gradient(circle at 15% 10%,rgba(0,194,217,.14),transparent 40%),var(--ink);color:var(--text)">
        <section style="width:min(900px,100%);text-align:center;padding:42px 24px;border:1px solid var(--line-soft);border-radius:28px;background:linear-gradient(145deg,var(--surface),var(--ink-2));box-shadow:var(--shadow)">
          <div style="font:800 12px/1.2 var(--mono);letter-spacing:2px;color:var(--teal-l);margin-bottom:14px">GLOBALL CLOUD · 2026</div>
          <h1 style="font-size:clamp(30px,6vw,58px);margin-bottom:14px">${data[0]}</h1>
          <p style="max-width:720px;margin:0 auto;color:var(--muted);font-size:17px;line-height:1.9">${data[1]}</p>
          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:26px">
            <a class="btn btn-primary" href="${data[3]}">${data[2]}</a>
            <a class="btn btn-outline" href="/track">شوێنکەوتنی بار</a>
            <a class="btn btn-outline" href="/staff">بەشی ستاف</a>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:32px;text-align:start">
            <div style="padding:18px;border:1px solid var(--line-soft);border-radius:16px;background:rgba(0,194,217,.05)"><b>✈ Air</b><small style="display:block;color:var(--muted);margin-top:6px">گواستنەوەی ئاسمانی</small></div>
            <div style="padding:18px;border:1px solid var(--line-soft);border-radius:16px;background:rgba(0,194,217,.05)"><b>🚢 Sea</b><small style="display:block;color:var(--muted);margin-top:6px">گواستنەوەی دەریایی</small></div>
            <div style="padding:18px;border:1px solid var(--line-soft);border-radius:16px;background:rgba(0,194,217,.05)"><b>🚚 Land</b><small style="display:block;color:var(--muted);margin-top:6px">گواستنەوەی وشکانی</small></div>
          </div>
        </section>
      </div>`;
  };

  const registerFreshServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register(`/sw-v98.js?v=${VERSION}`, { scope: '/' });
      await registration.update();
    } catch (_) {
      // Service worker is an optimization; never block page rendering.
    }
  };

  const hydrate = () => {
    const hasPublicShell = Boolean(document.querySelector('.page') || document.querySelector('[data-i18n]'));
    if (!hasPublicShell) return;

    hydrateTranslations();
    hydrateRenderers();
    activateRoute();

    if (typeof window.applyI18n === 'function') safeCall(window.applyI18n);
    if (typeof window.setupReveal === 'function') safeCall(window.setupReveal);
  };

  const boot = () => {
    if (booted) return;
    booted = true;
    document.documentElement.dataset.gcRuntimeGuarantee = VERSION;

    hydrate();
    registerFreshServiceWorker();

    [120, 350, 800, 1600, 3000, 5000].forEach((delay) => {
      window.setTimeout(() => {
        hydrate();
        if (delay >= 3000 && !pageHasVisibleText()) renderEmergencyShell();
      }, delay);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
