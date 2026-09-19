(() => {
  'use strict';
  if (window.__gcStaffPremium20260918) return;
  window.__gcStaffPremium20260918 = true;
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const OPS = `${SUPABASE_URL}/functions/v1/operations-v4`;
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const sessionHeaders = async () => {
    const sb = window.gcSupabase || window.sb;
    const { data } = await sb?.auth?.getSession?.() || { data: {} };
    if (!data?.session?.access_token) throw new Error('Session نەدۆزرایەوە');
    return { Authorization: `Bearer ${data.session.access_token}`, apikey: SUPABASE_KEY };
  };
  const getOps = async (kind) => {
    const response = await fetch(`${OPS}/?kind=${encodeURIComponent(kind)}`, { headers: await sessionHeaders(), cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  };
  async function addFinanceCustomerBalances() {
    if (!document.getElementById('financeRows') || document.getElementById('gcFinanceBalances')) return;
    try {
      const [customers, finance] = await Promise.all([getOps('customers'), getOps('finance')]);
      const rows = (customers.items || []).map((c) => ({ code: c.gc_code || c.code || '—', name: c.name || '—', outstanding: Number(c.outstanding_amount ?? c.outstanding ?? 0), shipments: Number(c.shipment_count || 0) })).filter((x) => x.outstanding > 0).sort((a,b) => b.outstanding - a.outstanding);
      const card = document.createElement('section');
      card.id = 'gcFinanceBalances';
      card.className = 'card';
      card.style.marginTop = '10px';
      card.innerHTML = `<div class="card-head"><h3>قەرزی کڕیاران</h3><span class="pill warn">${rows.length} کڕیار</span></div>${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>GC</th><th>کڕیار</th><th>بار</th><th>قەرز</th></tr></thead><tbody>${rows.slice(0,100).map((x) => `<tr><td class="mono"><b>${escapeHtml(x.code)}</b></td><td>${escapeHtml(x.name)}</td><td>${x.shipments}</td><td class="mono"><b>${x.outstanding.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} USD</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">هیچ قەرزی کراوەیەک نەدۆزرایەوە.</div>'}<div class="muted" style="margin-top:8px;font-size:9px">Ledger: ${(finance.transactions || []).length} transaction · balance لە shipment totals/paid ـەوە دێت.</div>`;
      document.getElementById('view')?.appendChild(card);
    } catch (error) {
      console.warn('[GC premium finance]', error);
    }
  }
  function addArabicLocale() {
    const select = document.querySelector('#profileForm select[name="locale"]');
    if (!select || select.querySelector('option[value="ar"]')) return;
    const option = document.createElement('option');
    option.value = 'ar';
    option.textContent = 'العربية';
    select.appendChild(option);
  }
  function reflectLocale() {
    const select = document.querySelector('#profileForm select[name="locale"]');
    if (!select) return;
    const locale = select.value;
    document.documentElement.lang = locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'ckb';
    document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
    select.dataset.gcLocaleApplied = locale;
  }
  function enhance() {
    addArabicLocale();
    reflectLocale();
    if (document.getElementById('financeRows')) addFinanceCustomerBalances();
  }
  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('change', (event) => { if (event.target?.matches?.('#profileForm select[name="locale"]')) reflectLocale(); });
  window.addEventListener('gc:staff-tab', enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true }); else enhance();
})();
