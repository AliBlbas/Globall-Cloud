(() => {
  'use strict';
  const primary=[['overview','⌂','داشبۆرد'],['shipments','▣','بارەکان'],['alerts','!','Alerts'],['finance','₮','دارایی']];
  const all=[
    ['overview','⌂','داشبۆرد'],['shipments','▣','بارەکان'],['alerts','!','Alerts'],['customers','◉','کڕیاران'],
    ['pricing','¤','نرخەکان'],['warehouses','▤','کۆگاکان'],['finance','₮','دارایی'],['staff-chat','◌','چاتی ستاف'],
    ['customer-chat','◍','چاتی کڕیار'],['requests','!','داواکاری'],['activity','≡','Audit Log'],['settings','⚙','ڕێکخستن']
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