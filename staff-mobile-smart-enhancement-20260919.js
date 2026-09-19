(() => {
  'use strict';
  if (window.__gcStaffSmartMobile) return;
  window.__gcStaffSmartMobile = true;

  const mobile = () => window.matchMedia('(max-width: 760px)').matches;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  // Keep the existing production navigation. This enhancement adds only behavior
  // that the original mobile-fix supplied, mapped to the current Staff OS shell.
  function syncNavigation() {
    const active = document.querySelector('.gc-side .nav-btn.active')?.dataset.tab || 'overview';
    document.querySelectorAll('.gc-mobile-dock [data-mobile-tab], .gc-mobile-drawer [data-mobile-tab]')
      .forEach((el) => {
        const on = el.dataset.mobileTab === active;
        el.classList.toggle('active', on);
        el.setAttribute('aria-current', on ? 'page' : 'false');
      });
  }

  function enhanceTables() {
    if (!mobile()) return;
    document.querySelectorAll('.table-wrap table').forEach((table) => {
      if (table.dataset.gcSmartMobile === '1') return;
      const head = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      const rows = [...table.querySelectorAll('tbody tr')].filter((row) => row.querySelectorAll('td').length);
      if (!rows.length || !head.length) return;

      const list = document.createElement('div');
      list.className = 'gc-smart-mobile-list';
      list.setAttribute('role', 'list');

      rows.forEach((row) => {
        const cells = [...row.querySelectorAll('td')];
        const card = document.createElement('article');
        card.className = 'gc-smart-mobile-card';
        card.setAttribute('role', 'listitem');

        const primary = cells[0]?.textContent.trim() || 'Record';
        const secondary = cells[1]?.textContent.trim() || '';
        const details = cells.slice(2, 7).map((cell, index) => ({
          label: head[index + 2] || `Field ${index + 3}`,
          value: cell.textContent.trim()
        })).filter((item) => item.value && item.value !== '—');

        card.innerHTML = `
          <div class="gc-smart-mobile-card-head">
            <div class="gc-smart-mobile-primary">${esc(primary)}</div>
            ${secondary ? `<div class="gc-smart-mobile-secondary">${esc(secondary)}</div>` : ''}
          </div>
          ${details.length ? `<div class="gc-smart-mobile-details">${details.map((item) => `
            <div class="gc-smart-mobile-detail"><small>${esc(item.label)}</small><strong>${esc(item.value)}</strong></div>
          `).join('')}</div>` : ''}
          <div class="gc-smart-mobile-actions"></div>
        `;

        const actionHost = card.querySelector('.gc-smart-mobile-actions');
        [...row.querySelectorAll('button,a')].slice(-3).forEach((source) => {
          const action = source.cloneNode(true);
          action.removeAttribute('id');
          action.classList.add('gc-smart-mobile-action');
          actionHost.appendChild(action);
          action.addEventListener('click', (event) => {
            event.stopPropagation();
            source.click();
          });
        });

        if (!actionHost.children.length) {
          actionHost.remove();
          card.addEventListener('click', () => row.click());
        }
        list.appendChild(card);
      });

      table.parentElement.appendChild(list);
      table.dataset.gcSmartMobile = '1';
    });
  }

  function closeMobileDrawer() {
    const drawer = document.getElementById('gcMobileDrawer');
    const backdrop = document.getElementById('gcMobileBackdrop');
    const menu = document.getElementById('gcMobileMenuBtn');
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }

  function installGestures() {
    if (document.body.dataset.gcSmartGestures === '1') return;
    document.body.dataset.gcSmartGestures = '1';
    let startX = 0;
    let startY = 0;
    let active = false;

    document.addEventListener('touchstart', (event) => {
      if (!mobile() || !event.touches[0]) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      active = true;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (!active || !mobile() || !event.changedTouches[0]) return;
      active = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.35) return;

      const drawer = document.getElementById('gcMobileDrawer');
      const open = drawer?.classList.contains('open');
      if (open && dx > 80) closeMobileDrawer();
      if (!open && dx < -80 && startX < 55) document.getElementById('gcMobileMenuBtn')?.click();
    }, { passive: true });
  }

  function improveInputs() {
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      if (el.dataset.gcSmartInput === '1') return;
      el.dataset.gcSmartInput = '1';
      if (['text','search','tel','email','number'].includes(el.type)) el.style.fontSize = '16px';
      el.style.maxWidth = '100%';
    });
  }

  function boot() {
    if (!document.querySelector('.gc-shell')) return;
    enhanceTables();
    improveInputs();
    installGestures();
    syncNavigation();
  }

  const observer = new MutationObserver(() => {
    if (mobile()) boot();
    syncNavigation();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => mobile() ? boot() : document.querySelectorAll('.gc-smart-mobile-list').forEach((x) => x.remove()));
})();
