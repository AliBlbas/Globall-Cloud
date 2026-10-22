(() => {
  'use strict';
  if (window.__gcStaffMobileDock20261016) return;
  window.__gcStaffMobileDock20261016 = true;

  const primary = [
    ['overview', 'داشبۆرد', 'home'],
    ['shipments', 'بارەکان', 'package'],
    ['land-manifests', 'مانيفێست', 'package'],
    ['warehouses', 'کۆگا', 'warehouse'],
    ['alerts', 'ئاگاداری', 'bell']
  ];
  const iconMarkup = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.3 7.6 7.7 4.3 7.7-4.3M12 12v9M8 5.2l8 4.5"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.6 2.5-5.5 6-5.5s5.5 1.9 6 5.5M16 5.3a3.1 3.1 0 0 1 0 5.9M17 14.8c2.3.6 3.6 2.3 4 5.2"/></svg>',
    warehouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-6h10v6M7 10h.01M12 10h.01M17 10h.01"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>'
  };

  const navButtons = () => [...document.querySelectorAll('.gc-side .nav-btn[data-tab]')];
  const findNav = (tab) => navButtons().find((button) => button.dataset.tab === tab);
  const navigate = (tab) => {
    // The land-manifest module has state of its own, so keep its delegated route.
    if (tab === 'land-manifests') return findNav(tab)?.click();
    if (typeof window.gcStaffLoadTab === 'function') return window.gcStaffLoadTab(tab);
    return findNav(tab)?.click();
  };
  const labelOf = (button) => {
    const clone = button.cloneNode(true);
    clone.querySelectorAll('.nav-icon,.nav-badge').forEach((node) => node.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  };

  function boot() {
    const side = document.querySelector('.gc-side');
    const topActions = document.querySelector('.top-actions');
    if (!side || !topActions || document.getElementById('gcStaffMobileDock')) return false;
    if (!primary.every(([tab]) => findNav(tab))) return false;

    const backdrop = document.createElement('div');
    backdrop.className = 'gc-staff-mobile-backdrop';
    backdrop.id = 'gcStaffMobileBackdrop';

    const drawer = document.createElement('section');
    drawer.className = 'gc-staff-mobile-drawer';
    drawer.id = 'gcStaffMobileDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'gcStaffMobileDrawerTitle');
    drawer.hidden = true;

    const head = document.createElement('div');
    head.className = 'gc-staff-mobile-drawer-head';
    const headTitle = document.createElement('strong');
    headTitle.id = 'gcStaffMobileDrawerTitle';
    headTitle.textContent = 'هەموو بەشەکان';
    const headMeta = document.createElement('span');
    headMeta.textContent = 'GLOBALL CLOUD · STAFF OS';
    head.append(headTitle, headMeta);

    const moduleGrid = document.createElement('div');
    moduleGrid.className = 'gc-staff-mobile-module-grid';
    drawer.append(head, moduleGrid);

    const user = document.createElement('div');
    user.className = 'gc-staff-mobile-user';
    const userLabel = document.createElement('span');
    const userName = document.createElement('b');
    userName.textContent = document.getElementById('sideName')?.textContent?.trim() || 'Staff';
    const userMeta = document.createElement('small');
    userMeta.textContent = 'Staff Operating System';
    userLabel.append(userName, userMeta);
    user.appendChild(userLabel);
    const logoutOriginal = document.getElementById('logoutBtn');
    if (logoutOriginal) {
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.textContent = 'چوونەدەرەوە';
      logout.addEventListener('click', () => logoutOriginal.click());
      user.appendChild(logout);
    }
    drawer.appendChild(user);

    const dock = document.createElement('nav');
    dock.className = 'gc-staff-mobile-dock';
    dock.id = 'gcStaffMobileDock';
    dock.setAttribute('aria-label', 'ناوبەری خێرای ستاف');

    primary.forEach(([tab, label, icon]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mobileTab = tab;
      button.setAttribute('aria-label', label);
      const graphic = document.createElement('span');
      graphic.className = 'gc-staff-mobile-icon';
      graphic.innerHTML = iconMarkup[icon];
      const caption = document.createElement('span');
      caption.className = 'gc-staff-mobile-label';
      caption.textContent = label;
      button.append(graphic, caption);
      button.addEventListener('click', () => {
        void navigate(tab);
        setTimeout(sync, 60);
      });
      dock.appendChild(button);
    });

    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'gc-staff-mobile-menu-button';
    menu.id = 'gcStaffMobileMenuButton';
    menu.setAttribute('aria-controls', drawer.id);
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'کردنەوەی هەموو بەشەکان');
    menu.textContent = '☰';
    menu.addEventListener('click', () => drawer.hidden ? open() : close());
    topActions.prepend(menu);
    document.body.append(backdrop, drawer, dock);
    document.body.classList.add('gc-staff-mobile-dock-active');

    let drawerSignature = '';

    function drawerGroups() {
      const nav = document.querySelector('.gc-side .nav');
      const sections = [...(nav?.querySelectorAll(':scope > .nav-group') || [])];
      const groups = sections.map((section) => ({
        title: (section.querySelector(':scope > .nav-group-title')?.textContent
          || section.getAttribute('aria-label') || 'بەشەکان').trim(),
        buttons: [...section.querySelectorAll(':scope > .nav-btn[data-tab]')],
      })).filter((group) => group.buttons.length);
      return groups.length ? groups : [{ title: 'هەموو بەشەکان', buttons: navButtons() }];
    }

    function renderDrawer() {
      const groups = drawerGroups();
      const all = groups.flatMap((group) => group.buttons);
      const signature = groups.map((group) => (
        group.title + ':' + group.buttons.map((button) => button.dataset.tab + ':' + labelOf(button)).join('|')
      )).join('||');
      if (signature !== drawerSignature) {
        drawerSignature = signature;
        moduleGrid.replaceChildren();
        groups.forEach((group) => {
          const section = document.createElement('section');
          section.className = 'gc-staff-mobile-module-group';

          const title = document.createElement('div');
          title.className = 'gc-staff-mobile-module-group-title';
          title.textContent = group.title;
          section.appendChild(title);

          const items = document.createElement('div');
          items.className = 'gc-staff-mobile-module-group-items';
          group.buttons.forEach((original, index) => {
            const tab = original.dataset.tab;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.mobileTab = tab;
            const graphic = document.createElement('span');
            graphic.className = 'gc-staff-mobile-module-icon';
            graphic.setAttribute('aria-hidden', 'true');
            const sourceIcon = original.querySelector('.nav-icon svg');
            if (sourceIcon) {
              graphic.appendChild(sourceIcon.cloneNode(true));
            } else {
              graphic.textContent = String(index + 1).padStart(2, '0');
            }
            const caption = document.createElement('span');
            caption.className = 'gc-staff-mobile-module-label';
            caption.textContent = labelOf(original);
            button.append(graphic, caption);
            button.addEventListener('click', () => {
              void navigate(tab);
              close(false);
              setTimeout(sync, 60);
            });
            items.appendChild(button);
          });
          section.appendChild(items);
          moduleGrid.appendChild(section);
        });
      }
      sync();
    }

    function sync() {
      const active = document.querySelector('.gc-side .nav-btn.active')?.dataset.tab || 'overview';
      [...dock.querySelectorAll('[data-mobile-tab]'), ...moduleGrid.querySelectorAll('[data-mobile-tab]')].forEach((button) => {
        const isActive = button.dataset.mobileTab === active;
        button.classList.toggle('active', isActive);
        if (isActive) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
    }

    function open() {
      drawer.hidden = false;
      drawer.classList.add('open');
      backdrop.classList.add('open');
      menu.setAttribute('aria-expanded', 'true');
      renderDrawer();
      drawer.querySelector('button')?.focus();
    }
    function close(restoreFocus = true) {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
      if (restoreFocus) menu.focus();
    }

    backdrop.addEventListener('click', () => close());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !drawer.hidden) close();
      if (event.key === 'Tab' && !drawer.hidden) {
        const focusables = [...drawer.querySelectorAll('button:not(:disabled)')];
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    });

    let observedNav = null;
    const navObserver = new MutationObserver(() => renderDrawer());
    const syncShell = () => {
      const shellExists = Boolean(document.querySelector('.gc-shell'));
      document.body.classList.toggle('gc-staff-mobile-dock-active', shellExists);
      dock.hidden = !shellExists;
      menu.hidden = !shellExists;
      if (!shellExists) {
        close(false);
        navObserver.disconnect();
        observedNav = null;
        return;
      }

      const currentActions = document.querySelector('.gc-main .top-actions');
      if (currentActions && menu.parentNode !== currentActions) currentActions.prepend(menu);

      const currentNav = document.querySelector('.gc-side .nav');
      if (currentNav !== observedNav) {
        navObserver.disconnect();
        observedNav = currentNav;
        if (currentNav) navObserver.observe(currentNav, {childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      }
      renderDrawer();
      sync();
    };

    // Login/logout replaces the whole app shell; rebind the dock to the new nav
    // instead of keeping stale references to detached sidebar nodes.
    const appRoot = document.getElementById('app') || document.body;
    const shellObserver = new MutationObserver(() => syncShell());
    shellObserver.observe(appRoot, {childList:true,subtree:true});
    syncShell();
    window.addEventListener('beforeunload', () => {
      shellObserver.disconnect();
      navObserver.disconnect();
    }, {once:true});
    return true;
  }

  if (!boot()) {
    // The shell and the manifest navigation may be inserted only after login.
    // Keep observing until all primary destinations exist; never time out silently.
    const observer = new MutationObserver(() => {
      if (boot()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList:true,subtree:true});
    window.addEventListener('beforeunload', () => observer.disconnect(), {once:true});
  }
})();