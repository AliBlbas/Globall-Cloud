/* Globall Cloud Staff OS — mobile command dock */
(() => {
  'use strict';
  if (window.__gcStaffPremiumMobile) return;
  window.__gcStaffPremiumMobile = true;
  const actions=[
    ['home','⌂','سەرەکی'],
    ['shipments','▣','بارەکان'],
    ['warehouse','▤','کۆگا'],
    ['analytics','◒','ڕاپۆرت'],
    ['more','⋮','زیاتر']
  ];
  const selectors={home:['[data-view="home"]','[data-page="home"]','.nav-btn[data-view="home"]'],shipments:['[data-view="shipments"]','[data-page="shipments"]'],warehouse:['[data-view="warehouse"]','[data-page="warehouse"]'],analytics:['[data-view="analytics"]','[data-page="analytics"]']};
  function clickTarget(id){
    if(id==='more'){
      const side=document.querySelector('.gc-side');
      if(side){side.style.display=side.style.display==='none'?'flex':'none';side.style.position='fixed';side.style.inset='6px';side.style.zIndex='200';side.style.width='calc(100% - 12px)';side.style.height='calc(100svh - 12px)';}
      return;
    }
    for(const s of (selectors[id]||[])){const el=document.querySelector(s);if(el){el.click();return;}}
    const candidates=[...document.querySelectorAll('.nav-btn')];
    const found=candidates.find(x=>String(x.textContent||'').includes(actions.find(a=>a[0]===id)?.[2]||''));
    found?.click();
  }
  function build(){
    if(innerWidth>760||document.querySelector('.gc-staff-mobile-dock')) return;
    const dock=document.createElement('nav');dock.className='gc-staff-mobile-dock';dock.setAttribute('aria-label','کۆنترۆڵی خێرای ستاف');
    actions.forEach(([id,icon,label])=>{const b=document.createElement('button');b.type='button';b.dataset.staffDock=id;b.innerHTML=`<span aria-hidden="true">${icon}</span><span>${label}</span>`;b.addEventListener('click',()=>{clickTarget(id);sync(id)});dock.appendChild(b)});
    document.body.appendChild(dock);sync();
  }
  function sync(forced){
    const active=forced||document.querySelector('.nav-btn.active')?.textContent||'';
    document.querySelectorAll('.gc-staff-mobile-dock button').forEach(b=>b.classList.toggle('active',String(active).includes(b.textContent.trim().split('\n').pop())));
  }
  function init(){build();const obs=new MutationObserver(()=>sync());obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});window.addEventListener('resize',()=>{if(innerWidth>760)document.querySelector('.gc-staff-mobile-dock')?.remove();else build()},{passive:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
