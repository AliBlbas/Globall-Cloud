(() => {
  'use strict';
  const load = async () => {
    const root = document.querySelector('#productUrl')?.closest('.card') || document.querySelector('main');
    if (!root || document.querySelector('[data-gc-shein-identity]')) return;
    const box = document.createElement('section');
    box.setAttribute('data-gc-shein-identity', '1');
    box.className = 'page-note';
    box.style.marginBottom = '16px';
    box.innerHTML = `
      <strong>ناسنامەی کڕین</strong>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px">
        <label>First Name / GC code<input id="gcFirstName" readonly autocomplete="off"></label>
        <label>Last Name / Customer<input id="gcLastName" readonly autocomplete="off"></label>
        <label>WhatsApp<input id="gcWhatsapp" readonly autocomplete="off"></label>
        <label>WhatsApp Group<input id="gcWhatsappGroup" readonly autocomplete="off"></label>
      </div>
      <small id="gcIdentityState" aria-live="polite">ناسنامەی کڕیار دەهێنرێت...</small>`;
    const anchor = root.querySelector('#productUrl')?.parentElement;
    anchor?.parentElement?.insertBefore(box, anchor) || root.prepend(box);

    try {
      const client = window.gcEnsureSupabase ? await window.gcEnsureSupabase() : window.gcSupabase || window.sb;
      if (!client?.functions?.invoke) throw new Error('Supabase client unavailable');
      const { data, error } = await client.functions.invoke('customer-self', { method: 'GET' });
      if (error) throw error;
      const p = data?.profile || {};
      const first = p.purchase_first_name || p.code || '';
      const last = p.purchase_last_name || p.name || '';
      const phone = p.whatsapp_phone || p.phone || '';
      const group = p.whatsapp_group_name || (p.code ? String(p.code).replace(/^GC-/, 'Gc-') : '');
      document.getElementById('gcFirstName').value = first;
      document.getElementById('gcLastName').value = last;
      document.getElementById('gcWhatsapp').value = phone;
      document.getElementById('gcWhatsappGroup').value = group;
      document.getElementById('gcIdentityState').textContent = 'ناسنامەکە بۆ order ـی کۆگاکان بەستراوەتەوە.';
      return;
    } catch (error) {
      const state = document.getElementById('gcIdentityState');
      if (state) state.textContent = 'تکایە بچۆ ژوورەوە بۆ ئەوەی کۆدی GC ـت پڕ بکرێت.';
      console.warn('[Globall Cloud] SHEIN identity:', error);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void load(), { once: true });
  else void load();
})();
