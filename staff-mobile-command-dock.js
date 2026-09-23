(() => {
  'use strict';
  if (window.__gcMobileCommandDock) return;
  window.__gcMobileCommandDock = true;

  const tabs = [
    ['overview','⌂','داشبۆرد'],
    ['shipments','▣','بارەکان'],
    ['customers','◎','کڕیاران'],
    ['warehouses','▤','کۆگا'],
    ['alerts','!','ئاگاداری'],
  ];
  const allTabs = [
    ...tabs,
    ['pricing','05','نرخەکان'],
    ['finance','07','دارایی'],
    ['staff-chat','08','چاتی ستاف'],
    ['customer-chat','09','چاتی کڕیار'],
    ['requests','10','داواکاری'],
    ['activity','11','Audit Log'],
    ['settings','12','ڕێکخستن'],
  ];

  const clickOriginal = (tab) => {
    const button = document.querySelector(`.gc-side [data-tab="${CSS.escape(tab)}"]`);
    if (button) button.click();
  };

  const sync = (container) => {
    const active = document.querySelector('.gc-side .nav-btn.active')?.dataset.tab || 'overview';
    container.querySelectorAll('[data-mobile-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.mobileTab === active);
      el.setAttribute('aria-current', el.dataset.mobileTab === active ? 'page' : 'false');
    });
  };

  function boot() {
    if (!document.querySelector('.gc-side') || document.getElementById('gcMobileCommandDock')) return;

    document.getElementById('gcMobileDock')?.remove();
    document.querySelector('.gc-mobile-menu-toggle')?.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'gc-mobile-backdrop';
    backdrop.id = 'gcMobileBackdrop';

    const drawer = document.createElement('div');
    drawer.className = 'gc-mobile-drawer';
    drawer.id = 'gcMobileDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'بەشەکانی Staff OS');

    allTabs.forEach(([tab,no,label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.mobileTab = tab;
      btn.innerHTML = `<strong>${no}</strong><span>${label}</span>`;
      btn.addEventListener('click', () => {
        clickOriginal(tab);
        close();
      });
      drawer.appendChild(btn);
    });

    const user = document.createElement('div');
    user.className = 'gc-mobile-user';
    const name = document.getElementById('sideName')?.textContent || 'Staff';
    user.innerHTML = `<span><b></b><br>Staff Operating System</span>`;
    user.querySelector('b').textContent = name;
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'چوونەدەرەوە';
    logout.addEventListener('click', () => document.getElementById('logoutBtn')?.click());
    user.appendChild(logout);
    drawer.appendChild(user);

    const dock = document.createElement('nav');
    dock.className = 'gc-mobile-dock';
    dock.id = 'gcMobileCommandDock';
    dock.setAttribute('aria-label', 'ناوبەری خێرای Staff OS');
    tabs.forEach(([tab,no,label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.mobileTab = tab;
      btn.innerHTML = `<strong>${no}</strong><span>${label}</span>`;
      btn.addEventListener('click', () => clickOriginal(tab));
      dock.appendChild(btn);
    });

    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'gc-mobile-menu-btn';
    menu.id = 'gcMobileMenuBtn';
    menu.setAttribute('aria-controls', 'gcMobileDrawer');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'کردنەوەی هەموو بەشەکان');
    menu.textContent = '☰';
    menu.addEventListener('click', () => drawer.classList.contains('open') ? close() : open());
    document.querySelector('.top-actions')?.prepend(menu);

    document.body.append(backdrop, drawer, dock);

    function open(){
      drawer.classList.add('open');
      backdrop.classList.add('open');
      menu.setAttribute('aria-expanded', 'true');
      sync(drawer); sync(dock);
    }
    function close(){
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }

    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });

    const observer = new MutationObserver(() => { sync(drawer); sync(dock); });
    observer.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
    sync(drawer); sync(dock);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

/* Globall Cloud — Staff command palette / quick operations 2026-09-23 */
(() => {
  'use strict';
  if (window.__gcStaffCommandLayer20260923) return;
  window.__gcStaffCommandLayer20260923 = true;
  const tabs=[
    ['overview','01','داشبۆرد','کۆنترۆڵی گشتی'],['shipments','02','بارەکان','shipment و tracking'],['customers','03','کڕیاران','هەژمار و کڕیار'],['warehouses','04','کۆگاکان','وەرگرتن و جوڵەی کۆگا'],['pricing','05','نرخەکان','quote و pricing'],['finance','06','دارایی','invoice و balance'],['staff-chat','07','چاتی ستاف','پەیوەندی تیم'],['customer-chat','08','چاتی کڕیار','پشتیوانی'],['requests','09','داواکاری','quote و contact requests'],['activity','10','Audit Log','تۆمار و audit'],['settings','11','ڕێکخستن','هەژمار و system settings']
  ];
  const actionHints={shipments:['زیادکردنی بار','دروستکردنی بار','New shipment','Create shipment','Shipment'],customers:['زیادکردنی کڕیار','زیادکردنی موشتەری','Create customer','Add customer'],warehouses:['وەرگرتنی بار','وەرگرتن','Warehouse receipt','Receive'],pricing:['quote','نرخ','دروستکردنی quote','New quote'],finance:['پارەدان','invoice','Payment','Finance'],staff:['زیادکردنی ستاف','Create staff','Add staff']};
  const waitFor=(fn,ms=10000)=>new Promise(resolve=>{const start=Date.now();const tick=()=>{const v=fn();if(v||Date.now()-start>ms)resolve(v);else setTimeout(tick,120)};tick()});
  const clickTab=tab=>document.querySelector(`.gc-side .nav-btn[data-tab="${CSS.escape(tab)}"]`)?.click();
  const findAction=hints=>{const buttons=[...document.querySelectorAll('.view button,.view a,.view [role="button"]')];const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();return buttons.find(el=>{const text=norm(el.textContent);return hints.some(h=>text.includes(norm(h)))})};
  const go=async(tab,hints=[])=>{clickTab(tab);if(!hints.length)return;await waitFor(()=>document.querySelector('.view'));setTimeout(()=>findAction(hints)?.click(),180)};
  function build(){
    if(!document.querySelector('.gc-shell')||document.getElementById('gcCommandPanel'))return false;
    const top=document.querySelector('.top-actions');if(!top)return false;
    const quick=document.createElement('button');quick.type='button';quick.className='gc-premium-action';quick.id='gcQuickOps';quick.textContent='⚡ کردارە خێراکان';top.prepend(quick);
    const panel=document.createElement('div');panel.className='gc-command-panel';panel.id='gcCommandPanel';panel.hidden=true;panel.innerHTML='<div class="gc-command-box" role="dialog" aria-modal="true" aria-label="کۆماندی Staff OS"><input class="gc-command-input" id="gcCommandInput" autocomplete="off" placeholder="گەڕان لە بەشەکان و کردارەکان…  (Ctrl/⌘ K)"><div class="gc-command-list" id="gcCommandList"></div></div>';document.body.appendChild(panel);
    const list=panel.querySelector('#gcCommandList'),input=panel.querySelector('#gcCommandInput');
    const render=filter=>{const q=String(filter||'').trim().toLowerCase();list.innerHTML='';tabs.filter(([id,,label,desc])=>!q||`${label} ${desc} ${id}`.toLowerCase().includes(q)).forEach(([id,no,label,desc])=>{const item=document.createElement('button');item.type='button';item.className='gc-command-item';item.innerHTML=`<strong>${no}</strong><span><b>${label}</b><small>${desc}</small></span><span>→</span>`;item.onclick=()=>{panel.hidden=true;input.value='';go(id)};list.appendChild(item)});if(q){Object.entries(actionHints).forEach(([tab,hints])=>{const label=({shipments:'دروستکردنی بار',customers:'زیادکردنی کڕیار',warehouses:'وەرگرتنی بار',pricing:'دروستکردنی quote',finance:'دارایی',staff:'بەڕێوەبردنی ستاف'})[tab]||tab;if(`${label} ${hints.join(' ')}`.toLowerCase().includes(q)){const item=document.createElement('button');item.type='button';item.className='gc-command-item';item.innerHTML=`<strong>＋</strong><span><b>${label}</b><small>کردنەوەی کردار لە ${tab}</small></span><span>→</span>`;item.onclick=()=>{panel.hidden=true;input.value='';go(tab,hints)};list.prepend(item)}})}};
    const open=()=>{panel.hidden=false;render('');setTimeout(()=>input.focus(),30)};const close=()=>{panel.hidden=true;input.value=''};quick.onclick=open;panel.addEventListener('click',e=>{if(e.target===panel)close()});input.addEventListener('input',()=>render(input.value));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape')close()});
    return true;
  }
  const boot=async()=>{await waitFor(()=>document.querySelector('.gc-shell'));build()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
