(() => {
  'use strict';

  const LEGACY = 'Supabase هێشتا پەیوەست نەکراوە';
  const ROOT_PATH = /^(?:\/|\/index\.html)\/?$/i;

  function hideNode(node) {
    if (!node) return;
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
    node.style.setProperty('display', 'none', 'important');
  }

  function scrub(root = document) {
    hideNode(document.getElementById('adminNotConfigured'));

    root.querySelectorAll?.('body *').forEach((node) => {
      if (node.children.length) return;
      const text = String(node.textContent || '').trim();
      if (text.includes(LEGACY)) hideNode(node);
    });
  }

  function install() {
    scrub();

    const observer = new MutationObserver(() => scrub());
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    window.addEventListener('gc:supabase-ready', scrub, { passive: true });
    window.setTimeout(() => observer.disconnect(), 12000);

    if (ROOT_PATH.test(window.location.pathname)) {
      document.documentElement.dataset.gcPublicReady = 'true';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
