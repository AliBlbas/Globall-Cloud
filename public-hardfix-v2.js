/* Globall Cloud — public UI emergency recovery v2.
 * Progressive enhancement only: the public HTML stays usable when an optional
 * renderer, translation layer, or backend call fails.
 */
(() => {
  'use strict';
  const VERSION = '20260912-6';
  const fallback = {
    'nav.home':'سەرەکی','nav.about':'دەربارەمان','nav.services':'خزمەتگوزارییەکان','nav.track':'شوێنکەوتن','nav.contact':'پەیوەندی','nav.signIn':'چوونەژوورەوە','nav.dashboard':'داشبۆرد','nav.quote':'داواکردنی نرخ',
    'hero.eyebrow':'چین · ئیمارات · ئەمریکا · هەولێر','hero.title':'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور','hero.subtitle':'Globall Cloud کاڵاکانت لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو عێراق دەگەیەنێت — بە شوێنکەوتن و پشتیوانی زیندوو.','hero.ctaTrack':'شوێنکەوتنی بار','hero.ctaQuote':'داواکردنی نرخ','hero.ctaWhatsApp':'پەیوەندی بە واتساپ',
    'liveTrack.heading':'شوێنکەوتنی بارەکەت لە چرکەیەکدا','liveTrack.sub':'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە','liveTrack.placeholder':'وەک GC10052341','liveTrack.button':'شوێنکەوتن',
    'business.eyebrow':'پەڕەکانی بازرگانی','business.heading':'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن','business.sub':'خزمەتگوزاری، نرخ، داشبۆرد، شوێنکەوتن و پەیوەندی لە یەک شوێن.',
    'dashboardPreview.heading':'پێشبینی داشبۆردی کڕیار','dashboardPreview.sub':'بارەکان و زانیارییەکانت بە خێرایی بەڕێوەببە.','dashboardPreview.btnPortal':'کردنەوەی پرۆتال','dashboardPreview.btnTrack':'شوێنکەوتن بکە',
    'warehouses.eyebrow':'کۆگاکان','warehouses.heading':'تۆڕی کۆگاکانمان','warehouses.sub':'هابەکانی چین، دوبەی و هەولێر بۆ جوڵاندنی خێرای بار.',
    'ops.eyebrow':'بەڕێوەبردنی ناوخۆ','ops.heading':'کۆنسۆڵی ستاف و کارگێڕی','ops.sub':'بارەکان، دارایی، کۆگا و پشتگیری لە یەک شوێن.',
    'services.eyebrow':'خزمەتگوزاری','services.heading':'خزمەتگوزارییەکانمان','services.sub':'چارەسەری تەواو بۆ گەیاندنی بار بۆ عێراق.','services.learnMore':'زیاتر بزانە',
    'how.eyebrow':'پرۆسە','how.heading':'چۆن کاردەکات','why.eyebrow':'هۆکار','why.heading':'بۆچی Globall Cloud',
    'about.eyebrow':'دەربارەمان','about.heading':'دەربارەی Globall Cloud','about.sub':'هاوبەشی متمانەپێکراوت بۆ لۆجستیک لەنێوان چین، ئیمارات و عێراق.',
    'cta.heading':'ئامادەیت بار بنێریت؟','cta.sub':'ئەمڕۆ داواکارییەکەت بنێرە و نرخ وەربگرە.','cta.b1':'داواکردنی نرخ','cta.b2':'پەیوەندیمان پێوە بکە','cta.whatsapp':'پەیوەندی بە واتساپ',
    'corridor.eyebrow':'ڕێڕەوی کارەکە','corridor.heading':'لە چین، دوبەی و ئەمریکا بۆ هەولێر','corridor.sub':'هەنگاوە سەرەکییەکانی گواستنەوە لە یەک شوێن.',
    'footer.blurb':'Globall Cloud — گەیاندنی بار بە متمانەوە بۆ هەموو عێراق.','footer.quick':'بەستەرە خێراکان','footer.servicesH':'خزمەتگوزارییەکان','footer.contactH':'پەیوەندی','footer.rights':'هەموو مافەکان پارێزراون.',
    'request.heading':'داواکردنی نرخ / بارکردنی نوێ','request.submit':'ناردنی داواکاری','portal.signInH':'چوونەژوورەوە','contact.heading':'پەیوەندیمان پێوە بکە','track.heading':'شوێنکەوتنی بار',
    'pbn.home':'سەرەکی','pbn.shipments':'بارەکان','pbn.services':'خزمەتگوزاری','pbn.track':'شوێنکەوتن','pbn.profile':'پرۆفایل','pbn.login':'چوونەژوورەوە'
  };
  const invoke = (fn) => { try { return typeof fn === 'function' ? fn() : undefined; } catch (_) { return undefined; } };
  const safeText = (key) => {
    try { if (typeof t === 'function') { const value = t(key); if (typeof value === 'string' && value.trim() && value !== key) return value; } } catch (_) {}
    return fallback[key] || '';
  };
  const visible = () => {
    const css = document.getElementById('gcHardVisibilityV2');
    if (css) return;
    const style = document.createElement('style');
    style.id = 'gcHardVisibilityV2';
    style.textContent = '.page.active{display:block!important;visibility:visible!important;opacity:1!important}.reveal,.reveal.in-view{opacity:1!important;visibility:visible!important;transform:none!important}.hero .eyebrow,.hero h1,.hero .sub,.hero-ctas,.route-map,.trust-item,.live-track,.corridor-strip,.hero-status-card,.route-chip{opacity:1!important;visibility:visible!important;animation:none!important;transform:none!important}.corridor-strip .corridor-item{opacity:1!important;visibility:visible!important;animation:none!important;transform:none!important}';
    (document.head || document.documentElement).appendChild(style);
  };
  const translations = () => {
    document.querySelectorAll('[data-i18n]').forEach((node) => { const value = safeText(node.getAttribute('data-i18n')); if (value) node.textContent = value; });
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => { const value = safeText(node.getAttribute('data-i18n-ph')); if (value) node.setAttribute('placeholder', value); });
  };
  const routeFallback = () => {
    const allowed = ['home','about','services','track','request','portal','contact','privacy','terms','admin'];
    const hash = (location.hash || '').replace(/^#/, '');
    const id = allowed.includes(hash) ? hash : 'home';
    if (typeof window.route === 'function') { invoke(() => window.route(id)); return; }
    document.querySelectorAll('.page').forEach((page) => { const active = page.id === `page-${id}`; page.classList.toggle('active', active); page.hidden = !active; });
  };
  const renderers = () => ['renderHomeServices','renderBusinessHub','renderDashboardPreview','renderCorridorStrip','renderWarehouseCards','renderOperationsHub','renderHow','renderWhy','renderAboutValues','renderFooterServices','renderLegalDocs','renderTestimonials'].forEach((name) => invoke(() => window[name]()));
  const fallbackCards = () => {
    const a = document.getElementById('homeServicesGrid');
    if (a && !a.children.length) a.innerHTML = [
      ['✈️','گەیاندنی ئاسمانی','خێراترین ڕێگا بۆ بارە پەلەکان.'],['🚢','گەیاندنی دەریایی','باشترین تێچوون بۆ بارە قورسەکان.'],['🚚','گەیاندنی وشکانی','ڕێڕەوی دوبەی بۆ عێراق.'],['🛃','گومرگ','یارمەتیدان لە بەڵگە و گومرگ.'],['🏭','کۆگاداری','کۆگای پارێزراو و چاودێریکراو.'],['📦','دەرگا بۆ دەرگا','گەیاندن بۆ هەموو شارەکانی عێراق.']
    ].map(([i,t,d]) => `<div class="service-card"><div class="service-icon" style="font-size:26px">${i}</div><h4>${t}</h4><p>${d}</p></div>`).join('');
    const b = document.getElementById('businessHubGrid');
    if (b && !b.children.length) b.innerHTML = [['🚛','خزمەتگوزاری','Air · Sea · Land'],['💰','نرخی بار','خەملاندنی نرخ'],['👤','داشبۆرد','پرۆتالی کڕیار'],['🔎','شوێنکەوتن','Tracking ID'],['🏭','کۆگاکان','چین · دوبەی · هەولێر'],['💬','پەیوەندی','واتساپ و پشتگیری']].map(([i,t,d]) => `<div class="hub-card"><div class="hub-icon" style="font-size:24px">${i}</div><h4>${t}</h4><p>${d}</p></div>`).join('');
  };
  const boot = () => { visible(); routeFallback(); invoke(() => typeof applyI18n === 'function' && applyI18n()); translations(); renderers(); fallbackCards(); translations(); routeFallback(); document.documentElement.dataset.gcPublicHardfix = VERSION; };
  const start = () => {
    boot();
    let n = 0;
    const timer = setInterval(() => { boot(); n += 1; if (n >= 24) clearInterval(timer); }, 250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  window.addEventListener('hashchange', start);
  window.addEventListener('error', () => setTimeout(start, 0), { passive: true });
  window.addEventListener('unhandledrejection', () => setTimeout(start, 0), { passive: true });
})();
