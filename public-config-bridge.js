/* Globall Cloud — public configuration bridge
 * Step 4 hardening: expose only explicitly public configuration through the
 * dedicated public-config Edge Function. This is additive and keeps legacy
 * callers untouched until their exact read path is verified.
 */
(function () {
  const ENDPOINT = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/public-config';
  let cached = null;
  let inflight = null;

  async function load() {
    if (cached) return cached;
    if (inflight) return inflight;
    inflight = fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    })
      .then(async (response) => {
        let body = null;
        try { body = await response.json(); } catch (_) {}
        if (!response.ok || !body?.config) {
          throw new Error(body?.error || `Public configuration request failed (${response.status})`);
        }
        cached = Object.freeze(body.config);
        return cached;
      })
      .finally(() => { inflight = null; });
    return inflight;
  }

  window.gcPublicConfig = Object.freeze({
    load,
    async getUsdIqdRate() {
      const config = await load();
      const value = Number(config.usd_iqd_rate);
      if (!Number.isFinite(value) || value <= 0) throw new Error('Invalid USD/IQD rate');
      return value;
    },
    clearCache() { cached = null; },
  });
})();
