(() => {
  'use strict';
  let dock=null;
  const go=(key)=>{
    if(key==='home'){location.href='/';return;}
    if(key==='shipments'){document.getElementById('shipments')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(key==='tracking'){document.getElementById('trackBtn')?.click();return;}
    if(key==='finance'){document.getElementById('billedKpi')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(key==='account'){document.getElementById('loginBtn')?.click();return;}
  };
  const sync=()=>dock?.querySelectorAll('[data-dock]').forEach(b=>{
    b.classList.toggle('active',b.dataset.dock==='shipments' && !!document.querySelector('#shipments'));
  });
  const install=()=>{
    if(dock)return;
    dock=document.createElement('nav');dock.className='gc-customer-mobile-dock';dock.setAttribute('aria-label','Customer quick navigation');
    dock.innerHTML=[
      ['home','⌂','سەرەکی'],['shipments','▣','بارەکان'],['tracking','⌁','Tracking'],['finance','₮','دارایی'],['account','◉','هەژمار']
    ].map(([k,i,l])=>'<button type="button" data-dock="'+k+'"><span class="dock-icon">'+i+'</span><span>'+l+'</span></button>').join('');
    document.body.appendChild(dock);
    dock.addEventListener('click',e=>{const b=e.target.closest('[data-dock]');if(b)go(b.dataset.dock);});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();