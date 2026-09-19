(() => {
  'use strict';
  if (window.__gcMobileCommandDock) return;
  window.__gcMobileCommandDock = true;

  const tabs = [
    ['overview','01','داشبۆرد'],
    ['shipments','02','بارەکان'],
    ['customers','04','کڕیاران'],
    ['warehouses','06','کۆگا'],
    ['alerts','03','Alerts'],
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
