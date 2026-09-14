/* Globall Cloud — clear, consistent inline SVG icon layer */
(() => {
  'use strict';
  const icons = {
    '🚚': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
    '📦': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></svg>',
    '✈️': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 14 7-2 5-8 2 1-2 8 6 2v2l-7-1-2 5-2-1 .5-4.5L3 16v-2Z"/></svg>',
    '🚢': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16l-2 3H6l-2-3Z"/><path d="M6 17V7h12v10M9 7V4h6v3M3 14l9 2 9-2"/></svg>',
    '🏭': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l6 3V8l6 3V6h6v14H3Z"/><path d="M7 16h2M12 16h2M17 16h2"/></svg>',
    '🛃': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5h16v15M4 9h16M8 5V3h8v2M8 13h8M8 17h5"/></svg>',
    '💰': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1"/></svg>',
    '👤': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"/></svg>',
    '🔎': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    '📍': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    '🔐': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    '💬': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v10H9l-4 4V6Z"/><path d="M8 10h8M8 13h5"/></svg>'
  };
  const selectors = '.gc-vnext-icon,.gc-icon,.icon,.nav-icon,.menu-icon,.feature-icon,.service-icon,.card-icon,.action-icon,.stat-icon,.kpi-icon';
  const apply = (root = document) => {
    root.querySelectorAll?.(selectors).forEach((el) => {
      if (el.dataset.gcIconPolished === '1') return;
      const key = Object.keys(icons).find((emoji) => el.textContent.trim().startsWith(emoji));
      if (!key) return;
      el.dataset.gcIconPolished = '1';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = icons[key];
    });
    root.querySelectorAll?.('.gc-sidebar a,.sidebar a').forEach((el) => {
      if (el.dataset.gcNavIconPolished === '1') return;
      const key = Object.keys(icons).find((emoji) => el.textContent.trim().startsWith(emoji));
      if (!key) return;
      el.dataset.gcNavIconPolished = '1';
      el.classList.add('gc-nav-iconized');
      el.innerHTML = `<span class="gc-nav-svg" aria-hidden="true">${icons[key]}</span><span>${el.textContent.trim().slice(key.length).trim()}</span>`;
    });
  };
  const boot = () => apply(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  new MutationObserver(() => apply(document)).observe(document.documentElement, {childList:true, subtree:true});
})();
