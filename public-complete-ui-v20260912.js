(() => {
  'use strict';

  const VERSION = '20260912-9';

  const TEXT = {
    'brand.tagline':'لۆجستیک',
    'topbar.note':'ڕێڕەوەکانی چین، دوبەی، ئەمریکا و هەولێر بەبەردەوامی چالاکن',
    'topbar.support':'پشتیوانی زیندوو ٢٤/٧',
    'nav.home':'سەرەکی','nav.about':'دەربارەمان','nav.services':'خزمەتگوزارییەکان','nav.track':'شوێنکەوتن','nav.contact':'پەیوەندی','nav.signIn':'چوونەژوورەوە','nav.dashboard':'داشبۆرد','nav.quote':'داواکردنی نرخ',
    'hero.eyebrow':'چین · ئیمارات · ئەمریکا · هەولێر',
    'hero.title':'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور',
    'hero.subtitle':'Globall Cloud کاڵاکانت بە شێوەیەکی ئاسایشدار لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو شارەکانی عێراق دەگەیەنێت — بە شوێنکەوتنی ڕاستەوخۆ، ڕێکاری ڕوون و پشتیوانی ٢٤/٧.',
    'hero.ctaTrack':'شوێنکەوتنی بار','hero.ctaQuote':'داواکردنی نرخ','hero.ctaWhatsApp':'پەیوەندی بە واتساپ',
    'hero.route.a':'گوانگژۆ، چین','hero.route.b':'دوبەی، ئیمارات','hero.route.c':'هەولێر، عێراق','hero.badge':'LIVE CORRIDOR','hero.liveStatus':'بارەکە ئێستا لە ڕێگادایە','hero.liveSub':'بارەکەت بە شوێنکەوتنی زیندوو لە هەموو قۆناغەکاندا پشکنین دەکرێت.','hero.routeOrigin':'سەرەتا / Origin Hub','hero.routeTransit':'ترانزیت / Transit Hub','hero.routeDestination':'گەیاندن / Delivery Hub',
    'trust.s1v':'+٢٥K','trust.s1l':'بار گەیەنراو','trust.s2v':'١٢+','trust.s2l':'شوێن و بازاڕ','trust.s3v':'٢٤/٧','trust.s3l':'پشتیوانی زیندوو','trust.s4v':'٩٨%','trust.s4l':'گەیاندنی لەکاتی خۆیدا',
    'liveTrack.heading':'شوێنکەوتنی بارەکەت لە چرکەیەکدا','liveTrack.sub':'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە','liveTrack.placeholder':'وەک GC10052341','liveTrack.button':'شوێنکەوتن',
    'business.eyebrow':'پەڕەکانی بازرگانی','business.heading':'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن','business.sub':'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، خەملاندنی نرخ، داشبۆرد، کۆگا و پەیوەندی.',
    'dashboardPreview.heading':'پێشبینی داشبۆردی کڕیار','dashboardPreview.sub':'بارەکان، نرخ و ئاگادارییەکانت لە یەک شوێن بەڕێوەبە.','dashboardPreview.btnPortal':'کردنەوەی پرۆتال','dashboardPreview.btnTrack':'شوێنکەوتن بکە',
    'services.eyebrow':'خزمەتگوزاری','services.heading':'خزمەتگوزارییەکانمان','services.sub':'چارەسەری تەواو بۆ گەیاندنی کاڵا لە چین، دوبەی و ئەمریکا بۆ هەولێر و ناو عێراق',
    'how.eyebrow':'چۆنیەتی کارکردن','how.heading':'لە داواکارییەوە تا گەیاندن',
    'warehouses.eyebrow':'کۆگاکان','warehouses.heading':'تۆڕی کۆگاکانمان','warehouses.sub':'هابە سەرەکییەکان لە چین، دوبەی، ئەمریکا و هەولێر بۆ جوڵاندنی خێرای بار.',
    'about.eyebrow':'دەربارەمان','about.heading':'لۆجستیکی نوێ بۆ عێراق','contact.eyebrow':'پەیوەندی','contact.heading':'لەگەڵمان پەیوەندی بکە'
  };

  const cards = {
    business:[
      ['📦','خزمەتگوزاری','Air، Sea، Land، گومرگ و Door-to-Door.'],
      ['💰','نرخی بار','خەملاندنی خێرا و ڕوونی نرخی گەیاندن.'],
      ['👤','داشبۆردی کڕیار','بارەکان و ئاگادارییەکانت بەڕێوەبە.'],
      ['🔎','شوێنکەوتن','دۆخی بارەکەت بە ژمارەی شوێنکەوتن ببینە.'],
      ['🏢','کۆگاکان','هابەکانی چین، دوبەی، ئەمریکا و هەولێر.'],
      ['💬','پەیوەندی','پشتیوانی زیندوو و پەیوەندیی خێرا.']
    ],
    services:[
      ['✈️','گەیاندنی ئاسمانی','خێراترین ڕێگا بۆ بارە پەلەیەکان.'],
      ['🚢','گەیاندنی دەریایی','گونجاو بۆ بارە قورس و گەورەکان.'],
      ['🚚','گەیاندنی وشکانی','ڕێگای ناوخۆیی و بەستنی هابەکان.'],
      ['🛃','گومرگ','یارمەتی لە بەڵگە و پرۆسەی گومرگ.'],
      ['🏠','Door-to-Door','لە سەرچاوەوە تا دەرگای کڕیار.']
    ],
    how:[
      ['01','داواکاری','شوێن و جۆری بار دیاری بکە.'],
      ['02','نرخ','تەخمینی نرخ و وردەکاری وەربگرە.'],
      ['03','شوێنکەوتن','هەموو هەنگاوەکان بەدواداچوون بکە.'],
      ['04','گەیاندن','بارەکەت بە سەلامەتی وەربگرە.']
    ],
    warehouses:[
      ['🇨🇳','کۆگای گوانگجو','چین','کۆکردنەوەی بار · QC · پاکەتکردن'],
      ['🇺🇸','هابەکانی ئەمریکا','ئەمریکا','کۆکردنەوە · پشکنینی بەڵگە'],
      ['🇦🇪','کۆگای دوبەی','ئیمارات','ترانزیت · هەلومەرج · ئاسایش'],
      ['🇮🇶','کۆگای هەولێر','هەولێر','دابەشکردن · پێشوازی · گەیاندن']
    ]
  };

  const style = () => {
    if (document.getElementById('gc-complete-ui-style')) return;
    const s = document.createElement('style');
    s.id = 'gc-complete-ui-style';
    s.textContent = `
      .page.active{display:block!important;visibility:visible!important;opacity:1!important}
      .page.active .reveal,.reveal,.reveal.in-view{opacity:1!important;visibility:visible!important;transform:none!important}
      .gc-complete-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}
      .gc-complete-card{min-height:150px;padding:20px;border:1px solid var(--line-soft);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.02));box-shadow:0 14px 32px rgba(0,0,0,.12)}
      .gc-complete-card .ico{font-size:28px;line-height:1;margin-bottom:14px}.gc-complete-card h4{font-size:16px;font-weight:900;margin:0 0 7px}.gc-complete-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.75}
      .gc-complete-warehouse{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.gc-complete-warehouse .gc-complete-card{min-height:145px}
      [data-i18n]:empty{display:inline-block;min-height:1em;min-width:2ch;visibility:visible!important}
      [data-i18n-ph]{visibility:visible!important}
      @media(max-width:640px){.gc-complete-grid,.gc-complete-warehouse{grid-template-columns:1fr}.gc-complete-card{min-height:0}}
    `;
    document.head.appendChild(s);
  };

  const translate = () => {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      try {
        if (node.textContent.trim()) return;
        const key = node.getAttribute('data-i18n');
        let value = '';
        if (typeof window.t === 'function') value = window.t(key) || '';
        if (!value || value === key) value = TEXT[key] || '';
        if (value) node.textContent = value;
      } catch (_) {}
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((node) => {
      try {
        if (node.getAttribute('placeholder')) return;
        const key = node.getAttribute('data-i18n-ph');
        let value = typeof window.t === 'function' ? (window.t(key) || '') : '';
        if (!value || value === key) value = TEXT[key] || '';
        if (value) node.setAttribute('placeholder', value);
      } catch (_) {}
    });
  };

  const cardHtml = (icon,title,body) => `<article class="gc-complete-card"><div class="ico">${icon}</div><h4>${title}</h4><p>${body}</p></article>`;
  const fill = (id, html, gridClass='gc-complete-grid') => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.children.length || el.textContent.trim() === '—') {
      el.classList.add(gridClass);
      el.innerHTML = html;
    }
  };

  const completeDynamicSections = () => {
    fill('businessHubGrid', cards.business.map(x=>cardHtml(...x)).join(''));
    fill('homeServicesGrid', cards.services.map(x=>cardHtml(...x)).join(''));
    fill('howGrid', cards.how.map(x=>cardHtml(...x)).join(''));
    fill('warehouseCardsGrid', cards.warehouses.map(([flag,title,place,features])=>cardHtml(flag,title,`${place}<br>${features}`)).join(''),'gc-complete-warehouse');
    const mini = document.getElementById('dashMiniGrid');
    if (mini && (!mini.children.length || mini.textContent.trim()==='—')) {
      mini.innerHTML = [
        ['4','بارە چالاکەکان'],['29','گەیشتوو'],['2','چاوەڕوان'],['8','فاکتۆرەکان']
      ].map(([n,l])=>`<div class="gc-complete-card"><h4>${l}</h4><p style="font-size:30px;font-weight:900;color:var(--teal-l)">${n}</p></div>`).join('');
    }
    fill('corridorStrip',[
      ['🇨🇳','چین → هەولێر','کۆکردنەوە، QC، ناردن و شوێنکەوتن.'],
      ['🇦🇪','دوبەی → هەولێر','ترانزیت و گەیاندنی خێرا بۆ عێراق.'],
      ['🇺🇸','ئەمریکا → هەولێر','کۆکردنەوەی کاڵا و ناردن بۆ هەولێر.']
    ].map(x=>cardHtml(...x)).join(''));
  };

  const normalizePages = () => {
    const pages = [...document.querySelectorAll('.page')];
    if (!pages.length) return;
    const hash = (window.location.hash || '').replace(/^#/,'');
    const allowed = new Set(['home','about','services','track','request','portal','contact']);
    const target = allowed.has(hash) ? hash : 'home';
    let activated = false;
    pages.forEach((p)=>{
      const want = p.id === `page-${target}`;
      p.classList.toggle('active',want);
      if (want) activated=true;
    });
    if (!activated) {
      const home = document.getElementById('page-home');
      if (home) home.classList.add('active');
    }
  };

  const boot = () => {
    style();
    normalizePages();
    translate();
    completeDynamicSections();
    document.querySelectorAll('.reveal').forEach((el)=>{
      el.style.opacity='1';
      el.style.visibility='visible';
      el.style.transform='none';
    });
    document.documentElement.dataset.gcCompleteUI=VERSION;
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});
  else boot();
  [100,350,800,1500,3000,5000].forEach((d)=>setTimeout(boot,d));
  try { window.addEventListener('hashchange',boot,{passive:true}); } catch (_) {}
})();
