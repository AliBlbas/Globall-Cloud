/* Globall Cloud — clear, consistent inline SVG icon layer */
(() => {
  'use strict';
  const icons = {
    '🚚': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M14 10v7"/></svg>',
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
  const navIcons = {
    overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
    customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"/></svg>',
    warehouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l9-5 9 5v11H3Z"/><path d="M7 20v-6h4v6M14 20v-6h3v6M3 10h18"/></svg>',
    staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c.7-4 2.5-6 6-6s5.3 2 6 6"/><circle cx="17" cy="10" r="2.5"/><path d="M15 15c2.6.2 4.3 1.8 5 5"/></svg>',
    finance: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1"/></svg>',
    audit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2M16 3h5v5"/></svg>'
  };
  const controlIcons = {
    openNav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    closeNav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    themeBtn: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    notifBtn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    openCommand: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5M8 17h3"/></svg>',
    openAdmin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14 5.5l3-.2.9 2.9 2.6 1.5-1.2 2.8 1.2 2.8-2.6 1.5-.9 2.9-3-.2L12 21l-2-2.5-3 .2-.9-2.9-2.6-1.5 1.2-2.8-1.2-2.8 2.6-1.5.9-2.9 3 .2L12 3Z"/><circle cx="12" cy="12" r="3"/></svg>',
    refreshBtn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.8-4L3 10"/><path d="M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14"/><path d="M21 19v-5h-5"/></svg>'
  };
  const selectors = '.gc-vnext-icon,.gc-icon,.icon,.nav-icon,.menu-icon,.feature-icon,.service-icon,.card-icon,.action-icon,.stat-icon,.kpi-icon';
  const setSvg = (el, svg, marker) => {
    if (!el || el.dataset.gcIconPolished === marker) return;
    el.dataset.gcIconPolished = marker;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = svg;
  };
  const polishNav = (root) => {
    root.querySelectorAll?.('.nav-item[data-view]').forEach((el) => {
      const key = el.dataset.view;
      const svg = navIcons[key];
      if (!svg || el.dataset.gcNavIconPolished === '1') return;
      el.dataset.gcNavIconPolished = '1';
      const label = el.querySelector('span');
      const icon = document.createElement('span');
      icon.className = 'gc-command-nav-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = svg;
      [...el.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
      });
      el.insertBefore(icon, el.firstChild);
      if (label) label.textContent = label.textContent.trim();
    });
  };
  const polishControls = (root) => {
    Object.entries(controlIcons).forEach(([id, svg]) => {
      const el = root.getElementById?.(id) || document.getElementById(id);
      if (!el || el.dataset.gcControlIconPolished === '1') return;
      el.dataset.gcControlIconPolished = '1';
      el.dataset.gcOriginalText = el.textContent.trim();
      el.setAttribute('aria-label', el.getAttribute('aria-label') || el.title || id);
      el.innerHTML = `<span class="gc-control-svg" aria-hidden="true">${svg}</span>`;
    });
  };
  const apply = (root = document) => {
    root.querySelectorAll?.(selectors).forEach((el) => {
      if (el.dataset.gcIconPolished === '1') return;
      const key = Object.keys(icons).find((emoji) => el.textContent.trim().startsWith(emoji));
      if (!key) return;
      setSvg(el, icons[key], '1');
    });
    root.querySelectorAll?.('.gc-sidebar a,.sidebar a').forEach((el) => {
      if (el.dataset.gcNavIconPolished === '1') return;
      const key = Object.keys(icons).find((emoji) => el.textContent.trim().startsWith(emoji));
      if (!key) return;
      el.dataset.gcNavIconPolished = '1';
      el.classList.add('gc-nav-iconized');
      const text = el.textContent.trim().slice(key.length).trim();
      el.innerHTML = `<span class="gc-nav-svg" aria-hidden="true">${icons[key]}</span><span>${text}</span>`;
    });
    polishNav(root);
    polishControls(root);
  };
  const injectStyles = () => {
    if (document.getElementById('gc-icon-polish-2026-style')) return;
    const style = document.createElement('style');
    style.id = 'gc-icon-polish-2026-style';
    style.textContent = `
      .gc-command-nav-icon,.gc-control-svg{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;line-height:0}
      .gc-command-nav-icon{width:20px;height:20px;margin-inline-end:10px}
      .gc-command-nav-icon svg,.gc-control-svg svg,.gc-nav-svg svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .gc-control-svg{width:19px;height:19px}
      .gc-nav-svg{display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;margin-inline-end:8px}
      .nav-item:focus-visible,.icon-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}
      @media (max-width:640px){.gc-command-nav-icon{width:19px;height:19px;margin-inline-end:9px}.gc-control-svg{width:18px;height:18px}}
      @media (prefers-reduced-motion:reduce){.gc-command-nav-icon,.gc-control-svg{transition:none!important}}
    `;
    document.head.appendChild(style);
  };
  const boot = () => { injectStyles(); apply(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  new MutationObserver(() => apply(document)).observe(document.documentElement, {childList:true, subtree:true});
})();
