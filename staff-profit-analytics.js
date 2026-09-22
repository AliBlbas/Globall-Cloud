/* Globall Cloud legacy compatibility stub.
 * Staff OS V5 owns the active analytics surface; this old overlay is intentionally inert.
 */
(() => {
  'use strict';
  if (!window.__gcStaffProfitAnalytics) window.__gcStaffProfitAnalytics = { legacy: true };
})();
