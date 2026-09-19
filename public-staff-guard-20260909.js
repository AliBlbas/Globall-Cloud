/* Globall Cloud — keep Staff OS off the public customer surface. */
(() => {
  'use strict';

  const PUBLIC_ROOT = /^(?:\/|\/index\.html)\/?$/i;

  function guardHash() {
    if (PUBLIC_ROOT.test(location.pathname) && location.hash.replace(/^#/, '').toLowerCase() === 'admin') {
      location.replace('/staff');
      return true;
    }
    return false;
  }

  function hideEmbeddedStaff() {
    const admin = document.getElementById('page-admin');
    if (admin) {
      admin.hidden = true;
      admin.setAttribute('aria-hidden', 'true');
      admin.style.setProperty('display', 'none', 'important');
    }
  }

  function wrapRoute() {
    if (typeof window.route !== 'function' || window.__gcPublicStaffRouteGuard) return;
    const nativeRoute = window.route;
    window.route = function(id) {
      if (String(id).toLowerCase() === 'admin') {
        location.assign('/staff');
        return;
      }
      return nativeRoute.apply(this, arguments);
    };
    window.__gcPublicStaffRouteGuard = true;
  }

  function install() {
    if (!PUBLIC_ROOT.test(location.pathname)) return;
    guardHash();
    hideEmbeddedStaff();
    wrapRoute();

    const observer = new MutationObserver(() => {
      hideEmbeddedStaff();
      wrapRoute();
      guardHash();
    });
    observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true});
    window.setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, {once:true});
  } else {
    install();
  }
})();
