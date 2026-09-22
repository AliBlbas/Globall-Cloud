(() => {
  'use strict';
  const tabs=[['overview','⌂','داشبۆرد'],['shipments','▣','بارەکان'],['alerts','!','Alerts'],['finance','₮','دارایی'],['settings','⚙','ڕێکخستن']];
  let dock=null;
  const install=()=>{
    if(dock||!document.querySelector('.gc-shell')) return false;
    dock=document.createElement('nav'); dock.className='gc-mobile-staff-dock'; dock.setAttribute('aria-label','Staff quick navigation');
    dock.innerHTML=tabs.map(([id,icon,label])=>'<button type="button" data-dock-tab="'+id+'"><span class="dock-icon">'+icon+'</span><span>'+label+'</span></button>').join('');
    document.body.appendChild(dock); sync();
    dock.addEventListener('click',e=>{const b=e.target.closest('[data-dock-tab]');if(!b)return;const target=document.querySelector('.nav-btn[data-tab="'+b.dataset.dockTab+'"]');if(target)target.click();setTimeout(sync,60);});
    return true;
  };
  const sync=()=>{dock?.querySelectorAll('[data-dock-tab]').forEach(b=>b.classList.toggle('active',!!document.querySelector('.nav-btn.active[data-tab="'+b.dataset.dockTab+'"]')));};
  const observer=new MutationObserver(()=>{if(install())sync();else sync();}); observer.observe(document.documentElement,{subtree:true,childList:true});
  const boot=()=>{install();sync();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();