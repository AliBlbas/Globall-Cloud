(() => {
  'use strict';
  const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"></path></svg>';
  const icons = {
    overview: svg('M4 10.5 12 4l8 6.5V20H4z'),
    shipments: svg('M3 7h18v13H3zM7 7V4h10v3'),
    alerts: svg('M12 3 21 20H3zM12 9v5M12 17h.01'),
    customers: svg('M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'),
    pricing: svg('M6 3h9l3 3v15H6zM9 8h6M9 12h6M9 16h4'),
    warehouses: svg('M3 10h18v10H3zM5 10 12 4l7 6'),
    finance: svg('M4 19V9M10 19V5M16 19v-7M22 19H2'),
    'staff-chat': svg('M4 5h16v11H8l-4 4z'),
    'customer-chat': svg('M4 5h16v11H8l-4 4zM8 10h8'),
    requests: svg('M5 4h14v16H5zM8 8h8M8 12h8M8 16h5'),
    activity: svg('M6 4h12M6 8h12M6 12h8M6 16h10'),
    settings: svg('M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8v4l3 2')
  };
  const primary=[
    ['overview',icons.overview,'داشبۆرد'],
    ['shipments',icons.shipments,'بارەکان'],
    ['alerts',icons.alerts,'Alerts'],
    ['finance',icons.finance,'دارایی']
  ];
  const all=[
    ['overview',icons.overview,'داشبۆرد'],['shipments',icons.shipments,'بارەکان'],['alerts',icons.alerts,'Alerts'],['customers',icons.customers,'کڕیاران'],
    ['pricing',icons.pricing,'نرخەکان'],['warehouses',icons.warehouses,'کۆگاکان'],['finance',icons.finance,'دارایی'],['staff-chat',icons['staff-chat'],'چاتی ستاف'],
    ['customer-chat',icons['customer-chat'],'چاتی کڕیار'],['requests',icons.requests,'داواکاری'],['activity',icons.activity,'Audit Log'],['settings',icons.settings,'ڕێکخستن']
  ];
  let dock=null, sheet=null;
  const buttonHtml=([id,icon,label],attr='data-dock-tab')=>'<button type="button" '+attr+'="'+id+'"><span class="dock-icon">'+icon+'</span><span>'+label+'</span></button>';
  const sync=()=>{
    dock?.querySelectorAll('[data-dock-tab]').forEach(b=>b.classList.toggle('active',!!document.querySelector('.nav-btn.active[data-tab="'+b.dataset.dockTab+'"]')));
    sheet?.querySelectorAll('[data-more-tab]').forEach(b=>b.classList.toggle('active',!!document.querySelector('.nav-btn.active[data-tab="'+b.dataset.moreTab+'"]')));
  };
  const openMore=()=>{ if(sheet){sheet.classList.add('open');document.body.style.overflow='hidden';sync();} };
  const closeMore=()=>{ if(sheet){sheet.classList.remove('open');document.body.style.overflow='';} };
  const install=()=>{
    if(dock||!document.querySelector('.gc-shell')) return false;
    dock=document.createElement('nav');
    dock.className='gc-mobile-staff-dock';
    dock.setAttribute('aria-label','Staff quick navigation');
    dock.innerHTML=primary.map(x=>buttonHtml(x)).join('')+'<button type="button" data-more-open="1"><span class="dock-icon">＋</span><span>زیاتر</span></button>';
    document.body.appendChild(dock);

    sheet=document.createElement('div');
    sheet.className='gc-staff-more-sheet';
    sheet.innerHTML='<div class="gc-staff-more-panel" role="dialog" aria-modal="true" aria-label="Staff modules"><div class="gc-staff-more-head"><strong>هەموو بەشەکانی ستاف</strong><button type="button" class="btn" data-more-close>داخستن</button></div><div class="gc-staff-more-grid">'+all.map(x=>buttonHtml(x,'data-more-tab')).join('')+'</div></div>';
    document.body.appendChild(sheet);

    dock.addEventListener('click',e=>{
      const b=e.target.closest('[data-dock-tab]');
      if(b){const target=document.querySelector('.nav-btn[data-tab="'+b.dataset.dockTab+'"]');if(target)target.click();setTimeout(sync,60);return;}
      if(e.target.closest('[data-more-open]'))openMore();
    });
    sheet.addEventListener('click',e=>{
      if(e.target===sheet||e.target.closest('[data-more-close]')){closeMore();return;}
      const b=e.target.closest('[data-more-tab]');
      if(!b)return;
      const target=document.querySelector('.nav-btn[data-tab="'+b.dataset.moreTab+'"]');
      if(target)target.click();
      closeMore();
      setTimeout(sync,60);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMore();});
    sync();
    return true;
  };
  const observer=new MutationObserver(()=>{if(install())sync();else sync();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  const boot=()=>{install();sync();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();