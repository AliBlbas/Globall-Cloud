(() => {
  'use strict';
  let dock=null;
  const go=(key)=>{
    if(key==='home'){location.href='/';return;}
    if(key==='shipments'){document.getElementById('shipments')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(key==='tracking'){document.getElementById('trackBtn')?.click();return;}
    if(key==='finance'){document.getElementById('billedKpi')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
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
      home:svg('M4 10.5 12 4l8 6.5V20H4z'),
      shipments:svg('M3 7h18v13H3zM7 7V4h10v3'),
      tracking:svg('M11 4a7 7 0 1 0 7 7M11 7v4l3 2'),
      finance:svg('M4 19V9M10 19V5M16 19v-7M22 19H2'),
      account:svg('M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8')
    };
    dock.innerHTML=[
      ['home',icons.home,'سەرەکی'],['shipments',icons.shipments,'بارەکان'],['tracking',icons.tracking,'Tracking'],['finance',icons.finance,'دارایی'],['account',icons.account,'هەژمار']
    ].map(([k,i,l])=>'<button type="button" data-dock="'+k+'"><span class="dock-icon">'+i+'</span><span>'+l+'</span></button>').join('');
    document.body.appendChild(dock);
    dock.addEventListener('click',e=>{const b=e.target.closest('[data-dock]');if(b)go(b.dataset.dock);});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();