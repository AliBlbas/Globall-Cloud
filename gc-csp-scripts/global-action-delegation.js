// Global delegation for legacy data-gc-onclick attributes.
// Purpose: avoid inline JS evaluation while preserving existing markup.
// Rules:
// - Supports simple calls like `route('home')`, `toggleTheme()`, `setLang('en')`, `runQuickQuote()`
// - Does NOT eval arbitrary JS. Complex expressions are ignored and logged.
(function(){
  'use strict';
  const ALLOWED = new Set([
    'route','toggleTheme','setLang','toggleMobileMenu','runQuickQuote','exportShipmentsExcel','toggleNewShipmentForm','setAdminMainTab',
    'editCustomer','editStaff','archiveCustomerAccount','archiveStaffAccount','clearBulkSelect','bulkMarkDelivered','exportSelectedExcel','enableNotifications'
  ]);

  function safeInvoke(name, args){
    if (!ALLOWED.has(name)) { console.warn('[gc-action] blocked unknown action:', name); return; }
    const fn = window[name];
    if (typeof fn !== 'function') { console.warn('[gc-action] function not available:', name); return; }
    try { return fn.apply(null, args); } catch (err) { console.error('[gc-action] invocation failed', name, err); }
  }

  function parseAndCall(spec){
    if (!spec || typeof spec !== 'string') return;
    // trim and remove surrounding whitespace
    const s = spec.trim();
    // match fn('string') or fn("string")
    let m = s.match(/^([a-zA-Z0-9_\-]+)\(['\"]([^'\"]*)['\"]\)$/);
    if (m) return safeInvoke(m[1], [m[2]]);
    // match fn(number)
    m = s.match(/^([a-zA-Z0-9_\-]+)\((\d+)\)$/);
    if (m) return safeInvoke(m[1], [Number(m[2])]);
    // match fn() or fn
    m = s.match(/^([a-zA-Z0-9_\-]+)\(\)$|^([a-zA-Z0-9_\-]+)$/);
    if (m) { const name = m[1]||m[2]; return safeInvoke(name, []); }
    console.warn('[gc-action] unsupported data-gc-onclick payload (ignored):', spec);
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], [data-gc-onclick], [data-route]');
    if (!el) return;
    // Prefer modern attributes if present
    if (el.dataset.action) {
      // data-action handled by newer delegation in scripts; do nothing here
      return;
    }
    if (el.dataset.route) {
      e.preventDefault(); parseAndCall(`route('${el.dataset.route}')`); return;
    }
    const spec = el.getAttribute('data-gc-onclick');
    if (!spec) return;
    e.preventDefault();
    // If the element has a data-row or data-id prefer those structured values
    // Examples: data-gc-onclick="archiveCustomerAccount('id')" -> parseAndCall will handle
    // For inline JSON like editCustomer({...}) this will be ignored; those should be migrated to data-row.
    parseAndCall(spec);
  }, { capture: false });
})();
