(() => {
  'use strict';
  let dock=null;
  const go=(key)=>{
    if(key==='home'){location.href='/';return;}
    if(key==='shipments'){document.getElementById('shipments')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(key==='calculator'){document.getElementById('quoteForm')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(key==='chat'){document.getElementById('gcAssistButton')?.click();return;}
    if(key==='account'){const s=document.getElementById('gcAccountSettings');if(s){s.scrollIntoView({behavior:'smooth',block:'start'});return;}document.getElementById('loginBtn')?.click();return;}
  };
  const sync=()=>dock?.querySelectorAll('[data-dock]').forEach(b=>{
    b.classList.toggle('active',b.dataset.dock==='shipments' && !!document.querySelector('#shipments'));
  });
  const install=()=>{
    if(dock)return;
    dock=document.createElement('nav');dock.className='gc-customer-mobile-dock';dock.setAttribute('aria-label','Customer quick navigation');
    const svg=(d)=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"></path></svg>';
    const icons={
      home:'<img src="/logo-icon.png" alt="" loading="eager">',
      shipments:svg('M3 7h18v13H3zM7 7V4h10v3'),
      calculator:svg('M5 3h14v18H5zM8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m2 0h0M8 18h8'),
      account:svg('M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8')
    };
    dock.innerHTML=[
      ['home',icons.home,'سەرەکی'],['shipments',icons.shipments,'بارەکان'],['calculator',icons.calculator,'حاسیبە'],['account',icons.account,'هەژمار']
    ].map(([k,i,l])=>'<button type="button" data-dock="'+k+'"><span class="dock-icon">'+i+'</span><span>'+l+'</span></button>').join('');
    document.body.appendChild(dock);
    dock.addEventListener('click',e=>{const b=e.target.closest('[data-dock]');if(b)go(b.dataset.dock);});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();