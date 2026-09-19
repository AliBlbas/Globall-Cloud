/* Globall Cloud — public UI hardfix.
 * This file is deliberately defensive: it makes the public shell visible,
 * retries the existing app renderer when available, and supplies a small
 * Kurdish fallback when the translation/runtime layer fails to initialise.
 */
(() => {
  'use strict';

  const VERSION = '20260912-5';
  const fallback = {
    'nav.home':'سەرەکی','nav.about':'دەربارەمان','nav.services':'خزمەتگوزارییەکان','nav.track':'شوێنکەوتن','nav.contact':'پەیوەندی','nav.signIn':'چوونەژوورەوە','nav.dashboard':'داشبۆرد','nav.quote':'داواکردنی نرخ',
    'hero.eyebrow':'چین · ئیمارات · ئەمریکا · هەولێر','hero.title':'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور','hero.subtitle':'Globall Cloud کاڵاکانت لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو عێراق دەگەیەنێت، بە شوێنکەوتن و پشتیوانی زیندوو.','hero.ctaTrack':'شوێنکەوتنی بار','hero.ctaQuote':'داواکردنی نرخ','hero.ctaWhatsApp':'پەیوەندی بە واتساپ','hero.badge':'ڕێڕەوی زیندوو',
    'trust.s1v':'+٢٥K','trust.s1l':'بار گەیەنراو','trust.s2v':'١٢+','trust.s2l':'شوێن و بازاڕ','trust.s3v':'٢٤/٧','trust.s3l':'پشتیوانی زیندوو','trust.s4v':'٩٨%','trust.s4l':'گەیاندنی لەکاتی خۆیدا',
    'liveTrack.heading':'شوێنکەوتنی بارەکەت لە چرکەیەکدا','liveTrack.sub':'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە','liveTrack.placeholder':'وەک GC10052341','liveTrack.button':'شوێنکەوتن',
    'business.eyebrow':'پەڕەکانی بازرگانی','business.heading':'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن','business.sub':'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، نرخ، داشبۆرد و شوێنکەوتن.',
    'dashboardPreview.heading':'پێشبینی داشبۆردی کڕیار','dashboardPreview.sub':'بارەکان و زانیارییەکانت بە خێرایی بەڕێوەببە.','dashboardPreview.btnPortal':'کردنەوەی پرۆتال','dashboardPreview.btnTrack':'شوێنکەوتن بکە',
    'warehouses.eyebrow':'کۆگاکان','warehouses.heading':'تۆڕی کۆگاکانمان','warehouses.sub':'هابەکانی چین، دوبەی و هەولێر بۆ جوڵاندنی خێرای بار.',
    'ops.eyebrow':'بەڕێوەبردنی ناوخۆ','ops.heading':'کۆنسۆڵی ستاف و کارگێڕی','ops.sub':'بارەکان، دارایی، کۆگا و پشتگیری لە یەک شوێن.',
    'services.eyebrow':'خزمەتگوزاری','services.heading':'خزمەتگوزارییەکانمان','services.sub':'چارەسەری تەواو بۆ گەیاندنی بار بۆ عێراق.','services.learnMore':'زیاتر بزانە',
    'how.eyebrow':'پرۆسە','how.heading':'چۆن کاردەکات','why.eyebrow':'هۆکار','why.heading':'بۆچی Globall Cloud',
    'about.eyebrow':'دەربارەمان','about.heading':'دەربارەی Globall Cloud','about.sub':'هاوبەشی متمانەپێکراوت بۆ لۆجستیک لەنێوان چین، ئیمارات و عێراق.',
    'cta.heading':'ئامادەیت بار بنێریت؟','cta.sub':'ئەمڕۆ داواکارییەکەت بنێرە.','cta.b1':'داواکردنی نرخ','cta.b2':'پەیوەندیمان پێوە بکە','cta.whatsapp':'پەیوەندی بە واتساپ',
    'corridor.eyebrow':'ڕێڕەوی کارەکە','corridor.heading':'لە چین، دوبەی و ئەمریکا بۆ هەولێر','corridor.sub':'هەنگاوە سەرەکییەکانی گواستنەوە لە یەک شوێن.',
    'footer.blurb':'Globall Cloud — گەیاندنی بار بە متمانەوە بۆ هەموو عێراق.','footer.quick':'بەستەرە خێراکان','footer.servicesH':'خزمەتگوزارییەکان','footer.contactH':'پەیوەندی','footer.rights':'هەموو مافەکان پارێزراون.',
    'track.heading':'شوێنکەوتنی بار','track.searchBtn':'بگەڕێ','request.heading':'داواکردنی نرخ / بارکردنی نوێ','request.submit':'ناردنی داواکاری','portal.signInH':'چوونەژوورەوە','contact.heading':'پەیوەندیمان پێوە بکە',
    'pbn.home':'سەرەکی','pbn.shipments':'بارەکان','pbn.services':'خزمەتگوزاری','pbn.track':'شوێنکەوتن','pbn.profile':'پرۆفایل','pbn.login':'چوونەژوورەوە'
  };

  const safe = (fn) => { try { return typeof fn === 'function' ? fn() : undefined; } catch (_) { return undefined; } };

  const forceVisibility = () => {
    if (document.documentElement.dataset.gcHardfixStyle === VERSION) return;
    const style = document.createElement('style');
    style.dataset.gcHardfixStyle = VERSION;
    style.textContent = `
      .page.active{display:block!important;visibility:visible!important;opacity:1!important}
      .reveal,.reveal.in-view{opacity:1!important;visibility:visible!important;transform:none!important}
      .hero .eyebrow,.hero h1,.hero .sub,.hero-ctas,.route-map,.trust-item,.live-track,.corridor-strip,.hero-status-card,.route-chip{opacity:1!important;visibility:visible!important;animation:none!important;transform:none!important}
      .corridor-strip .corridor-item{opacity:1!important;visibility:visible!important;animation:none!important;transform:none!important}
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const fallbackValue = (key) => {
    try {
      if (typeof t === 'function') {
        const value = t(key);
        if (typeof value === 'string' && value.trim() && value !== key) return value;
      }
    } catch (_) {}
    return fallback[key] || '';
  };

  const hydrateText = () => {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      const value = fallbackValue(key);
      if (value) node.textContent = value;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => {
      const key = node.getAttribute('data-i18n-ph');
      const value = fallbackValue(key);
      if (value) node.setAttribute('placeholder', value);
    });
  };

  const activateRoute = () => {
    const allowed = ['home','about','services','track','request','portal','contact','privacy','terms','admin'];
    const id = (location.hash || '').replace(/^#/, '') || 'home';
    const routeId = allowed.includes(id) ? id : 'home';
    safe(() => window.route && window.route(routeId));
    if (typeof window.route !== 'function') {
      document.querySelectorAll('.page').forEach((page) => {
        const active = page.id === `page-${routeId}`;
        page.classList.toggle('active', active);
        page.hidden = !active;
      });
    }
  };

  const callRenderers = () => {
    const names = ['renderHomeServices','renderBusinessHub','renderDashboardPreview','renderCorridorStrip','renderWarehouseCards','renderOperationsHub','renderHow','renderWhy','renderAboutValues','renderFooterServices','renderLegalDocs','renderTestimonials'];
    names.forEach((name) => safe(() => window[name]));
  };

  const simpleCards = () => {
    const homeServices = document.getElementById('homeServicesGrid');
    if (homeServices && !homeServices.children.length) {
      homeServices.innerHTML = [
        ['✈️','گەیاندنی ئاسمانی','خێراترین ڕێگا بۆ بارە پەلەکان.'],
        ['🚢','گەیاندنی دەریایی','باشترین تێچوون بۆ بارە قورسەکان.'],
        ['🚚','گەیاندنی وشکانی','ڕێڕەوی دوبەی بۆ عێراق.'],
        ['🏭','کۆگاداری','پاراستنی بار لە هابەکانمان.'],
        ['🛃','گومرگ','یارمەتیدان لە بەڵگە و گومرگ.'],
        ['📦','دەرگا بۆ دەرگا','گەیاندن بۆ ماڵ یان کۆمپانیا.']
      ].map(([icon,title,desc])=>`<div class="service-card"><div class="service-icon" style="font-size:26px">${icon}</div><h4>${title}</h4><p>${desc}</p></div>`).join('');
    }
    const business = document.getElementById('businessHubGrid');
    if (business && !business.children.length) {
      business.innerHTML = [
        ['🚛','خزمەتگوزاری','Air · Sea · Land · گومرگ'],
        ['💰','خەملاندنی نرخ','نرخی سەرەتایی بۆ ڕێڕەوەکان'],
        ['👤','داشبۆرد','بارەکان و هەژمارەکەت'],
        ['🔎','شوێنکەوتن','دۆخی بار بە Tracking ID'],
        ['🏭','کۆگاکان','چین · دوبەی · هەولێر'],
        ['💬','پەیوەندی','واتساپ و پشتیوانی']
      ].map(([icon,title,desc])=>`<div class="hub-card"><div class="hub-icon" style="font-size:24px">${icon}</div><h4>${title}</h4><p>${desc}</p></div>`).join('');
    }
    const how = document.getElementById('howGrid');
    if (how && !how.children.length) {
      how.innerHTML = [['01','داواکاری بکە','وردەکاری بارەکەت بنێرە.'],['02','وەرگرتن','بارەکەت لە سەرچاوە وەردەگرین.'],['03','گواستنەوە','گواستنەوە و گومرگ بەڕێوەدەبرین.'],['04','گەیاندن','بارەکەت بە سەلامەتی دەگات.']].map(([n,t,d])=>`<div class="step-card"><span class="step-num">${n}</span><h4>${t}</h4><p>${d}</p></div>`).join('');
    }
    const why = document.getElementById('whyGrid');
    if (why && !why.children.length) {
      why.innerHTML = [['📍','شوێنکەوتنی ڕاستەوخۆ','لە هەر ساتێکدا شوێنی بارەکەت بزانە.'],['🛡️','پارێزراو','بارەکان بە چاودێری تەواو دەگوازرێنەوە.'],['💳','نرخی ڕوون','بەبێ تێچووی شاراوە.'],['🕒','پشتگیری ٢٤/٧','تیمەکەمان هەمیشە لەگەڵتە.']].map(([i,t,d])=>`<div class="card feature-card"><div class="service-icon" style="font-size:24px">${i}</div><h4>${t}</h4><p>${d}</p></div>`).join('');
    }
    const warehouses = document.getElementById('warehouseCardsGrid');
    if (warehouses && !warehouses.children.length) {
      warehouses.innerHTML = [['🇨🇳','کۆگای گوانگجو','گوانگجو، چین'],['🇦🇪','کۆگای دوبەی','دوبەی، ئیمارات'],['🇮🇶','کۆگای هەولێر','هەولێر، عێراق']].map(([f,t,d])=>`<div class="warehouse-card"><div style="font-size:28px">${f}</div><span class="tag">HUB</span><h4>${t}</h4><p>${d}</p></div>`).join('');
    }
  };

  const boot = () => {
    forceVisibility();
    activateRoute();
    safe(() => typeof applyI18n === 'function' && applyI18n());
    hydrateText();
    callRenderers();
    simpleCards();
    hydrateText();
    activateRoute();
  };

  const start = () => {
    boot();
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      boot();
      if (ticks >= 30) window.clearInterval(timer);
    }, 250);
  };

  window.addEventListener('hashchange', start);
  window.addEventListener('error', () => window.setTimeout(start, 0), { passive: true });
  window.addEventListener('unhandledrejection', () => window.setTimeout(start, 0), { passive: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
