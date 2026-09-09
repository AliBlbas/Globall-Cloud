/* Globall Cloud public site — premium mobile navigation 2026-09-09 */
(() => {
  'use strict';
  if (window.__gcPremiumMobile20260909) return;
  window.__gcPremiumMobile20260909 = true;

  const items = [
    ['home','⌂','سەرەکی','/'],
    ['track','⌁','شوێنکەوتن','/#track'],
    ['request','₿','نرخ','/quote'],
    ['portal','♙','داشبۆرد','/dashboard'],
    ['staff','◈','ستاف','/staff']
  ];

  function build(){
    if (window.innerWidth > 760 || document.querySelector('.gc-mobile-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className='gc-mobile-bottom-nav';
    nav.setAttribute('aria-label','ناڤیگەیشنی خێرا');
    items.forEach(([id,icon,label,href])=>{
      const a=document.createElement('a');
      a.dataset.gcRoute=id;
      a.href=href;
      if(id==='staff') a.classList.add('staff');
      if(id==='request'||id==='portal') a.classList.add('primary');
      a.innerHTML=`<span aria-hidden="true">${icon}</span><span>${label}</span>`;
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    sync();
  }
  function sync(){
    const p=location.pathname.replace(/\/$/,'')||'/';
    const h=(location.hash||'').replace('#','');
    const current=h||({ '/about':'about','/services':'services','/contact':'contact','/quote':'request','/request':'request','/dashboard':'portal','/portal':'portal' }[p]||'home');
    document.querySelectorAll('.gc-mobile-bottom-nav [data-gc-route]').forEach(a=>a.classList.toggle('active',a.dataset.gcRoute===current));
  }
  function init(){build();sync();window.addEventListener('hashchange',sync,{passive:true});window.addEventListener('resize',()=>{if(window.innerWidth>760){document.querySelector('.gc-mobile-bottom-nav')?.remove()}else build();},{passive:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
