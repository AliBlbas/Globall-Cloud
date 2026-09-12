(() => {
  'use strict';

  const VERSION = '20260912-7';

  const TEXT = {
    'brand.tagline': 'لۆجستیک',
    'topbar.note': 'ڕێڕەوەکانی چین، دوبەی، ئەمریکا و هەولێر بەبەردەوامی چالاکن',
    'topbar.support': 'پشتیوانی زیندوو ٢٤/٧',
    'nav.home': 'سەرەکی', 'nav.about': 'دەربارەمان', 'nav.services': 'خزمەتگوزارییەکان', 'nav.track': 'شوێنکەوتن', 'nav.contact': 'پەیوەندی', 'nav.signIn': 'چوونەژوورەوە', 'nav.dashboard': 'داشبۆرد', 'nav.quote': 'داواکردنی نرخ',
    'hero.eyebrow': 'چین · ئیمارات · ئەمریکا · هەولێر',
    'hero.title': 'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور',
    'hero.subtitle': 'Globall Cloud کاڵاکانت بە شێوەیەکی ئاسایشدار لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو شارەکانی عێراق دەگەیەنێت — بە شوێنکەوتنی ڕاستەوخۆ، ڕێکاری ڕوون و پشتیوانی ٢٤/٧.',
    'hero.ctaTrack': 'شوێنکەوتنی بار', 'hero.ctaQuote': 'داواکردنی نرخ', 'hero.ctaWhatsApp': 'پەیوەندی بە واتساپ',
    'hero.route.a': 'گوانگژۆ، چین', 'hero.route.b': 'دوبەی، ئیمارات', 'hero.route.c': 'هەولێر، عێراق',
    'hero.badge': 'LIVE CORRIDOR', 'hero.liveStatus': 'بارەکە ئێستا لە ڕێگادایە', 'hero.liveSub': 'بارەکەت لە نێوان چین، دوبەی، ئەمریکا و هەولێر بە شوێنکەوتنی زیندوو بەردەوامە.',
    'hero.routeOrigin': 'سەرەتا / Origin Hub', 'hero.routeTransit': 'ترانزیت / Transit Hub', 'hero.routeDestination': 'گەیاندن / Delivery Hub',
    'trust.s1v': '+٢٥K', 'trust.s1l': 'بار گەیەنراو', 'trust.s2v': '١٢+', 'trust.s2l': 'شوێن و بازاڕ', 'trust.s3v': '٢٤/٧', 'trust.s3l': 'پشتیوانی زیندوو', 'trust.s4v': '٩٨%', 'trust.s4l': 'گەیاندنی لەکاتی خۆیدا',
    'liveTrack.heading': 'شوێنکەوتنی بارەکەت لە چرکەیەکدا', 'liveTrack.sub': 'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە', 'liveTrack.placeholder': 'وەک GC10052341', 'liveTrack.button': 'شوێنکەوتن',
    'business.eyebrow': 'پەڕەکانی بازرگانی', 'business.heading': 'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن', 'business.sub': 'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، خەملاندنی نرخ، داشبۆرد، کۆگاکان و پەیوەندی.',
    'dashboardPreview.heading': 'پێشبینی داشبۆردی کڕیار', 'dashboardPreview.sub': 'کڕیاران دەتوانن بارەکان، نرخ و ئاگادارییەکان بە شێوەی خێرا بەڕێوەببەن.', 'dashboardPreview.btnPortal': 'کردنەوەی پرۆتال', 'dashboardPreview.btnTrack': 'شوێنکەوتن بکە',
    'services.eyebrow': 'خزمەتگوزاری', 'services.heading': 'خزمەتگوزارییەکانمان', 'services.sub': 'چارەسەری تەواو بۆ گەیاندنی کاڵا لە چین، دوبەی و ئەمریکا بۆ هەولێر و ناو عێراق',
    'how.eyebrow': 'چۆنیەتی کارکردن', 'how.heading': 'لە داواکارییەوە تا گەیاندن',
    'about.eyebrow': 'دەربارەمان', 'about.heading': 'لۆجستیکی نوێ بۆ عێراق',
    'contact.eyebrow': 'پەیوەندی', 'contact.heading': 'لەگەڵمان پەیوەندی بکە'
  };

  const addStyle = () => {
    if (document.getElementById('gc-emergency-ui-style')) return;
    const style = document.createElement('style');
    style.id = 'gc-emergency-ui-style';
    style.textContent = `
      .page.active{display:block!important;visibility:visible!important;opacity:1!important;}
      .page.active .reveal,.reveal.in-view{opacity:1!important;visibility:visible!important;transform:none!important;}
      [data-i18n]:empty,[data-i18n-ph]{visibility:visible!important;}
      .gc-emergency-card{background:var(--surface);border:1px solid var(--line-soft);border-radius:18px;padding:18px;box-shadow:var(--shadow);}
      .gc-emergency-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;}
      .gc-emergency-card h4{margin:0 0 8px;font-size:15px;font-weight:900}.gc-emergency-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}.gc-emergency-card .gc-emergency-icon{font-size:24px;margin-bottom:10px}
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const fillI18n = () => {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!node.textContent.trim() && TEXT[key]) node.textContent = TEXT[key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => {
      const key = node.getAttribute('data-i18n-ph');
      if (!node.getAttribute('placeholder') && TEXT[key]) node.setAttribute('placeholder', TEXT[key]);
    });
    const auth = document.getElementById('authNavLabel');
    if (auth && !auth.textContent.trim()) auth.textContent = 'چوونەژوورەوە';
    const ma = document.getElementById('mobileAuthLabel');
    if (ma && !ma.textContent.trim()) ma.textContent = 'چوونەژوورەوە';
  };

  const card = (icon, title, body) => `<article class="gc-emergency-card"><div class="gc-emergency-icon">${icon}</div><h4>${title}</h4><p>${body}</p></article>`;

  const fillGrid = (id, html) => {
    const el = document.getElementById(id);
    if (el && !el.children.length) el.innerHTML = html;
  };

  const fillDynamic = () => {
    fillGrid('businessHubGrid', [
      card('📦','خزمەتگوزاری','Air، Sea، Land، گومرگ و Door-to-Door.'),
      card('💰','نرخی بار','خەملاندنی خێرا و ڕوونی نرخی گەیاندن.'),
      card('👤','داشبۆردی کڕیار','بارەکان و ئاگادارییەکانت بەڕێوەبە.'),
      card('🔎','شوێنکەوتن','دۆخی بارەکەت بە ژمارەی شوێنکەوتن ببینە.'),
      card('🏢','کۆگاکان','هابەکانی چین، دوبەی، ئەمریکا و هەولێر.'),
      card('💬','پەیوەندی','پشتیوانی زیندوو و پەیوەندیی خێرا.')
    ].join(''));

    fillGrid('homeServicesGrid', [
      card('✈️','گەیاندنی ئاسمانی','خێراترین ڕێگا بۆ بارە پەلەیەکان.'),
      card('🚢','گەیاندنی دەریایی','گونجاو بۆ بارە قورس و گەورەکان.'),
      card('🚚','گەیاندنی وشکانی','ڕێگای ناوخۆیی و بەستنی هابەکان.'),
      card('🛃','گومرگ','یارمەتی لە بەڵگە و پرۆسەی گومرگ.'),
      card('🏠','Door-to-Door','لە سەرچاوەوە تا دەرگای کڕیار.')
    ].join(''));

    fillGrid('howGrid', [
      card('01','داواکاری','شوێن و جۆری بار دیاری بکە.'),
      card('02','نرخ','تەخمینی نرخ و وردەکاری وەربگرە.'),
      card('03','شوێنکەوتن','هەموو هەنگاوەکان بەدواداچوون بکە.'),
      card('04','گەیاندن','بارەکەت بە سەلامەتی وەربگرە.')
    ].join(''));

    fillGrid('dashMiniGrid', [
      '<div class="gc-emergency-card"><h4>بارە چالاکەکان</h4><p style="font-size:28px;font-weight:900;color:var(--teal-l)">4</p></div>',
      '<div class="gc-emergency-card"><h4>گەیشتوو</h4><p style="font-size:28px;font-weight:900;color:var(--teal-l)">29</p></div>',
      '<div class="gc-emergency-card"><h4>چاوەڕوان</h4><p style="font-size:28px;font-weight:900;color:var(--teal-l)">2</p></div>',
      '<div class="gc-emergency-card"><h4>فاکتۆرەکان</h4><p style="font-size:28px;font-weight:900;color:var(--teal-l)">8</p></div>'
    ].join(''));

    fillGrid('corridorStrip', [
      card('🇨🇳','چین → هەولێر','کۆکردنەوە، QC، ناردن و شوێنکەوتن.'),
      card('🇦🇪','دوبەی → هەولێر','ترانزیت و گەیاندنی خێرا بۆ عێراق.'),
      card('🇺🇸','ئەمریکا → هەولێر','کۆکردنەوەی کاڵا و ناردن بۆ هەولێر.')
    ].join(''));
  };

  const activateHome = () => {
    const home = document.getElementById('page-home');
    if (!home) return;
    const visible = document.querySelector('.page.active');
    if (!visible || !visible.textContent.trim()) home.classList.add('active');
  };

  const boot = () => {
    addStyle();
    activateHome();
    fillI18n();
    fillDynamic();
    document.documentElement.dataset.gcEmergencyUI = VERSION;
  };

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
    [100, 500, 1200, 2500].forEach((delay) => window.setTimeout(boot, delay));
  } catch (_) {}
})();