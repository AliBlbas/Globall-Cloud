(() => {
  'use strict';
  const VERSION='20260912-11';
  const TEXT={
    'brand.tagline':'لۆجستیک','topbar.note':'ڕێڕەوەکانی چین، دوبەی، ئەمریکا و هەولێر بەبەردەوامی چالاکن','topbar.support':'پشتیوانی زیندوو ٢٤/٧',
    'nav.home':'سەرەکی','nav.about':'دەربارەمان','nav.services':'خزمەتگوزارییەکان','nav.track':'شوێنکەوتن','nav.contact':'پەیوەندی','nav.signIn':'چوونەژوورەوە','nav.dashboard':'داشبۆرد','nav.quote':'داواکردنی نرخ',
    'hero.eyebrow':'چین · ئیمارات · ئەمریکا · هەولێر','hero.title':'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور','hero.subtitle':'Globall Cloud کاڵاکانت بە شێوەیەکی ئاسایشدار لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو شارەکانی عێراق دەگەیەنێت — بە شوێنکەوتنی ڕاستەوخۆ، ڕێکاری ڕوون و پشتیوانی ٢٤/٧.',
    'hero.ctaTrack':'شوێنکەوتنی بار','hero.ctaQuote':'داواکردنی نرخ','hero.ctaWhatsApp':'پەیوەندی بە واتساپ','hero.route.a':'گوانگژۆ، چین','hero.route.b':'دوبەی، ئیمارات','hero.route.c':'هەولێر، عێراق','hero.badge':'LIVE CORRIDOR','hero.liveStatus':'بارەکە ئێستا لە ڕێگادایە','hero.liveSub':'بارەکەت بە شوێنکەوتنی زیندوو لە هەموو قۆناغەکاندا پشکنین دەکرێت.','hero.routeOrigin':'سەرەتا / Origin Hub','hero.routeTransit':'ترانزیت / Transit Hub','hero.routeDestination':'گەیاندن / Delivery Hub',
    'trust.s1v':'+٢٥K','trust.s1l':'بار گەیەنراو','trust.s2v':'١٢+','trust.s2l':'شوێن و بازاڕ','trust.s3v':'٢٤/٧','trust.s3l':'پشتیوانی زیندوو','trust.s4v':'٩٨%','trust.s4l':'گەیاندنی لەکاتی خۆیدا',
    'liveTrack.heading':'شوێنکەوتنی بارەکەت لە چرکەیەکدا','liveTrack.sub':'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە','liveTrack.placeholder':'وەک GC10052341','liveTrack.button':'شوێنکەوتن',
    'business.eyebrow':'پەڕەکانی بازرگانی','business.heading':'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن','business.sub':'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، خەملاندنی نرخ، داشبۆرد، کۆگا و پەیوەندی.',
    'dashboardPreview.heading':'پێشبینی داشبۆردی کڕیار','dashboardPreview.sub':'بارەکان، نرخ و ئاگادارییەکانت لە یەک شوێن بەڕێوەبە.','dashboardPreview.btnPortal':'کردنەوەی پرۆتال','dashboardPreview.btnTrack':'شوێنکەوتن بکە',
    'services.eyebrow':'خزمەتگوزاری','services.heading':'خزمەتگوزارییەکانمان','services.sub':'چارەسەری تەواو بۆ گەیاندنی کاڵا لە چین، دوبەی و ئەمریکا بۆ هەولێر و ناو عێراق',
    'how.eyebrow':'چۆنیەتی کارکردن','how.heading':'لە داواکارییەوە تا گەیاندن','warehouses.eyebrow':'کۆگاکان','warehouses.heading':'تۆڕی کۆگاکانمان','warehouses.sub':'هابە سەرەکییەکان لە چین، دوبەی، ئەمریکا و هەولێر بۆ جوڵاندنی خێرای بار.','about.eyebrow':'دەربارەمان','about.heading':'لۆجستیکی نوێ بۆ عێراق','contact.eyebrow':'پەیوەندی','contact.heading':'لەگەڵمان پەیوەندی بکە'
  };
  const css=()=>{if(document.getElementById('gc-emergency-ui-style'))return;const s=document.createElement('style');s.id='gc-emergency-ui-style';s.textContent=`
    .page.active{display:block!important;visibility:visible!important;opacity:1!important}
    .page.active .reveal,.reveal,.reveal.in-view{opacity:1!important;visibility:visible!important;transform:none!important}
    .gc-fallback-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}
    .gc-fallback-card{min-height:145px;padding:19px;border:1px solid var(--line-soft);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.02));box-shadow:0 14px 32px rgba(0,0,0,.12)}
    .gc-fallback-card .ico{font-size:28px;line-height:1;margin-bottom:13px}.gc-fallback-card h4{font-size:16px;font-weight:900;margin:0 0 7px}.gc-fallback-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.75}
    [data-i18n]:empty{visibility:visible!important;min-height:1em}.gc-fallback-warehouse{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
    @media(max-width:640px){.gc-fallback-grid,.gc-fallback-warehouse{grid-template-columns:1fr}.gc-fallback-card{min-height:0}}
  `;(document.head||document.documentElement).appendChild(s)};
  const text=()=>{document.querySelectorAll('[data-i18n]').forEach(n=>{if(n.textContent.trim())return;const k=n.getAttribute('data-i18n');let v='';try{v=typeof window.t==='function'?(window.t(k)||''):''}catch(_){}if(!v||v===k)v=TEXT[k]||'';if(v)n.textContent=v});document.querySelectorAll('[data-i18n-ph]').forEach(n=>{if(n.placeholder)return;const k=n.getAttribute('data-i18n-ph');let v='';try{v=typeof window.t==='function'?(window.t(k)||''):''}catch(_){}if(!v||v===k)v=TEXT[k]||'';if(v)n.placeholder=v})};
  const card=(i,t,b)=>`<article class="gc-fallback-card"><div class="ico">${i}</div><h4>${t}</h4><p>${b}</p></article>`;
  const fill=(id,html,cls='gc-fallback-grid')=>{const e=document.getElementById(id);if(e&&(!e.children.length||e.textContent.trim()==='—')){e.classList.add(cls);e.innerHTML=html}};
  const dynamic=()=>{
    fill('businessHubGrid',[['📦','خزمەتگوزاری','Air، Sea، Land، گومرگ و Door-to-Door.'],['💰','نرخی بار','خەملاندنی خێرا و ڕوونی نرخی گەیاندن.'],['👤','داشبۆردی کڕیار','بارەکان و ئاگادارییەکانت بەڕێوەبە.'],['🔎','شوێنکەوتن','دۆخی بارەکەت بە ژمارەی شوێنکەوتن ببینە.'],['🏢','کۆگاکان','هابەکانی چین، دوبەی، ئەمریکا و هەولێر.'],['💬','پەیوەندی','پشتیوانی زیندوو و پەیوەندیی خێرا.']].map(x=>card(...x)).join(''));
    fill('homeServicesGrid',[['✈️','گەیاندنی ئاسمانی','خێراترین ڕێگا بۆ بارە پەلەیەکان.'],['🚢','گەیاندنی دەریایی','گونجاو بۆ بارە قورس و گەورەکان.'],['🚚','گەیاندنی وشکانی','ڕێگای ناوخۆیی و بەستنی هابەکان.'],['🛃','گومرگ','یارمەتی لە بەڵگە و پرۆسەی گومرگ.'],['🏠','Door-to-Door','لە سەرچاوەوە تا دەرگای کڕیار.']].map(x=>card(...x)).join(''));
    fill('howGrid',[['01','داواکاری','شوێن و جۆری بار دیاری بکە.'],['02','نرخ','تەخمینی نرخ و وردەکاری وەربگرە.'],['03','شوێنکەوتن','هەموو هەنگاوەکان بەدواداچوون بکە.'],['04','گەیاندن','بارەکەت بە سەلامەتی وەربگرە.']].map(x=>card(...x)).join(''));
    fill('warehouseCardsGrid',[['🇨🇳','کۆگای گوانگجو','چین · کۆکردنەوەی بار · QC · پاکەتکردن'],['🇺🇸','هابەکانی ئەمریکا','ئەمریکا · کۆکردنەوە · پشکنینی بەڵگە'],['🇦🇪','کۆگای دوبەی','ئیمارات · ترانزیت · هەلومەرج · ئاسایش'],['🇮🇶','کۆگای هەولێر','هەولێر · دابەشکردن · پێشوازی · گەیاندن']].map(x=>card(...x)).join(''),'gc-fallback-warehouse');
    fill('corridorStrip',[['🇨🇳','چین → هەولێر','کۆکردنەوە، QC، ناردن و شوێنکەوتن.'],['🇦🇪','دوبەی → هەولێر','ترانزیت و گەیاندنی خێرا بۆ عێراق.'],['🇺🇸','ئەمریکا → هەولێر','کۆکردنەوەی کاڵا و ناردن بۆ هەولێر.']].map(x=>card(...x)).join(''));
    const mini=document.getElementById('dashMiniGrid');if(mini&&(!mini.children.length||mini.textContent.trim()==='—'))mini.innerHTML=[['4','بارە چالاکەکان'],['29','گەیشتوو'],['2','چاوەڕوان'],['8','فاکتۆرەکان']].map(([n,l])=>`<div class="gc-fallback-card"><h4>${l}</h4><p style="font-size:30px;font-weight:900;color:var(--teal-l)">${n}</p></div>`).join('');
  };
  const boot=()=>{css();text();dynamic();document.querySelectorAll('.reveal').forEach(e=>{e.style.opacity='1';e.style.visibility='visible';e.style.transform='none'});document.documentElement.dataset.gcEmergencyUI=VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [100,350,800,1500,3000,5000].forEach(d=>setTimeout(boot,d));
})();
