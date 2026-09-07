/* Globall Cloud — runtime safety layer v2026
 * Fixes initialization races and hardens the shared Smart Quote form.
 * No secrets; uses only the public Supabase publishable key already used by the app.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const QUOTE_URL = `${SUPABASE_URL}/functions/v1/public-pricing`;
  const CUSTOMER_URL = `${SUPABASE_URL}/functions/v1/customer-self`;
  const CONTROL_URL = `${SUPABASE_URL}/functions/v1/logistics-control-tower`;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const getClient = () => window.gcSupabase || window.sb || null;
  const getSessionToken = async () => {
    const client = getClient();
    if (!client?.auth) return null;
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data?.session?.access_token || null;
  };

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  function bindSafeQuote() {
    const form = document.getElementById('gcQuoteForm');
    if (!form || form.dataset.gcSafeQuoteBound === '1') return;
    form.dataset.gcSafeQuoteBound = '1';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const button = form.querySelector('button[type="submit"]');
      const result = document.getElementById('gcQuoteResult');
      if (!button || !result) return;

      const field = (name) => form.elements.namedItem(name);
      const value = (name) => String(field(name)?.value ?? '').trim();
      const checked = (name) => Boolean(field(name)?.checked);

      const payload = {
        origin_key: value('origin_key'),
        destination_key: value('destination_key'),
        transport_mode: value('transport_mode'),
        product_type: value('product_type'),
        weight_kg: Number(value('weight_kg') || 0),
        volume_cbm: Number(value('volume_cbm') || 0),
        has_battery: checked('has_battery'),
        has_liquid: checked('has_liquid'),
        msds_provided: checked('msds_provided'),
      };

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'لە هەژمارکردندایە…';
      result.classList.remove('show');

      void (async () => {
        try {
          const data = await fetchJson(QUOTE_URL, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (data.allowed === false) {
            result.innerHTML = `<b>کاڵاکە وەرناگیرێت</b><span>${esc(data.message_ku || 'پشکنینی compliance سەرکەوتوو نەبوو.')}</span>`;
          } else {
            const quote = data.quote || {};
            const amount = quote.total_amount ?? quote.amount ?? quote.total ?? quote.price ?? null;
            const currency = quote.currency || 'USD';
            result.innerHTML = amount == null
              ? '<b>Quote ئامادەیە</b><span>داواکارییەکە سەرکەوتوو بوو و بۆ نرخە کۆتایییەکە پشکنینی تیم پێویستە.</span>'
              : `<b>${esc(Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 }))} ${esc(currency)}</b><span>نرخەکە لە pricing engine ـی production ـەوە هاتووە.</span>`;
          }
          result.classList.add('show');
        } catch (error) {
          result.innerHTML = `<b>هەژمارکردن سەرکەوتوو نەبوو</b><span>${esc(error?.message || error)}</span>`;
          result.classList.add('show');
        } finally {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          button.textContent = 'هەژمارکردنی نرخی ڕاستەوخۆ';
        }
      })();
    }, true);
  }

  async function refreshStaffPulse() {
    const host = document.getElementById('gcVnextStaff');
    if (!host) return;
    const token = await getSessionToken();
    if (!token) return;

    try {
      const data = await fetchJson(CONTROL_URL, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });
      const k = data.kpis || {};
      const set = (id, value, tone) => {
        const node = document.getElementById(id);
        if (!node) return;
        const target = node.querySelector('b');
        if (target) target.textContent = String(value ?? 0);
        if (tone) node.dataset.tone = tone;
      };
      set('vxActive', k.active || 0, 'good');
      set('vxRisk', (k.overdue || 0) + (k.payment_risk || 0) + (k.customs_risk || 0) + (k.stale_tracking || 0),
        (k.overdue || 0) ? 'danger' : 'warn');
      set('vxExceptions', k.open_exceptions || 0, (k.open_exceptions || 0) ? 'warn' : 'good');
      set('vxQueue', k.notification_queue || 0, (k.notification_queue || 0) ? 'warn' : 'good');
    } catch {
      // Keep the existing UI intact on transient auth/network failures.
    }
  }

  async function refreshCustomerPulse() {
    const holder = document.getElementById('gcVnextCustomer');
    if (!holder) return;
    const token = await getSessionToken();
    if (!token) return;

    try {
      const data = await fetchJson(CUSTOMER_URL, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });
      let bar = holder.querySelector('[data-gc-runtime-customer-pulse]');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'gc-vx-account';
        bar.dataset.gcRuntimeCustomerPulse = '1';
        holder.querySelector('.gc-vnext-heading')?.appendChild(bar);
      }
      const active = (data.shipments || []).filter((shipment) =>
        Number(shipment.current_step_index ?? 0) < 5 &&
        !['delivered', 'cancelled'].includes(String(shipment.operational_status || ''))
      ).length;
      const due = (data.invoices || []).reduce((sum, invoice) =>
        sum + Math.max(Number(invoice.total || 0) - Number(invoice.paid_total || 0), 0), 0
      );
      bar.innerHTML = `<div style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#0d2942;color:#63eaf4">◉</div><div><strong>${esc(data.profile?.name || 'کڕیار')}</strong><span>${esc(data.profile?.code || 'GC')} · ${active} بارێکی چالاک · ${due.toLocaleString('en-US', { maximumFractionDigits: 2 })} ماوەی invoice</span></div>`;
    } catch {
      // Customer portal continues using its existing data layer.
    }
  }

  function scheduleRefresh() {
    bindSafeQuote();
    void refreshStaffPulse();
    void refreshCustomerPulse();
  }

  function boot() {
    scheduleRefresh();
    window.addEventListener('gc:supabase-ready', scheduleRefresh, { passive: true });
    const observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
    setInterval(() => {
      void refreshStaffPulse();
      void refreshCustomerPulse();
    }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
