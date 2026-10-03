/* Staff Console admin UX layer: UI-only enhancements over existing authenticated views. */
(() => {
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const csv = (rows) => rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const download = (name, content) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type:'text/csv;charset=utf-8'})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1200); };
  const button = (label, action, primary = false) => { const b = document.createElement('button'); b.type = 'button'; b.className = `btn${primary ? ' primary' : ''}`; b.textContent = label; b.addEventListener('click', action); return b; };

  function addAdminShortcuts(view) {
    if ($('.gc-admin-shortcuts', view) || !/dashboard|داشبۆرد|overview/i.test($('.section-head h1', view)?.textContent || '')) return;
    const box = document.createElement('section'); box.className = 'gc-admin-shortcuts';
    box.innerHTML = `<div><span class="eyebrow">ADMIN CONTROL SURFACE</span><strong>بەڕێوەبەرایەتی بە یەک کلیک</strong><small>کارە گرنگەکان لە یەک شوێنەوە بەڕێوە ببە.</small></div><div class="gc-admin-shortcut-actions"></div>`;
    const actions = $('.gc-admin-shortcut-actions', box);
    [['warehouse','کۆگا','وەرگرتن و بەڵگە'],['finance','دارایی','ledger و balance'],['staff','ستاف','role و دەستگەیشتن']].forEach(([tab, label, note]) => { const b = button(label, () => { const n = $(`[data-tab="${tab}"]`); n?.click(); }); b.title = note; actions.appendChild(b); });
    const head = $('.section-head', view); head?.after(box);
  }

  function addWarehouseTools(view) {
    if ($('.gc-ops-tools', view)) return;
    const search = $('#warehouseSearch', view); const table = $('.table', view); if (!search || !table) return;
    const toolbar = $('.toolbar', view); if (!toolbar) return;
    const tools = document.createElement('div'); tools.className = 'gc-ops-tools';
    tools.innerHTML = `<label>شوێن<select id="gcWarehouseLocation"><option value="">هەموو کۆگاکان</option><option>China</option><option>Dubai</option><option>Erbil</option><option>USA</option></select></label><span class="gc-tool-count" id="gcWarehouseCount"></span>`;
    const exportBtn = button('↓ Export CSV', () => { const rows = $$('tbody tr', table).filter(r => r.style.display !== 'none').map(r => $$('td', r).map(c => c.textContent.trim())); download('globall-warehouse-receipts.csv', csv([$$('th', table).map(x => x.textContent.trim()), ...rows])); });
    tools.appendChild(exportBtn); toolbar.after(tools);
    const location = $('#gcWarehouseLocation');
    const apply = () => { const q = String(search.value || '').toLowerCase(); const loc = String(location.value || '').toLowerCase(); const rows = $$('tbody tr', table); let visible = 0; rows.forEach(row => { const text = row.textContent.toLowerCase(); const show = (!q || text.includes(q)) && (!loc || text.includes(loc)); row.style.display = show ? '' : 'none'; if (show) visible++; }); const count = $('#gcWarehouseCount'); if (count) count.textContent = `${visible} receipt · filtered view`; };
    search.addEventListener('input', apply); location.addEventListener('change', apply); apply();
  }

  function addFinanceTools(view) {
    if ($('.gc-ledger-tools', view)) return;
    const search = $('#financeSearch', view); const table = $('.table', view); if (!search || !table) return;
    const toolbar = $('.toolbar', view); if (!toolbar) return;
    const tools = document.createElement('div'); tools.className = 'gc-ledger-tools';
    tools.innerHTML = `<label>جۆر<select id="gcLedgerType"><option value="">هەموو مامەڵەکان</option><option value="income">Income</option><option value="payment">Payment</option><option value="charge">Charge</option><option value="expense">Expense</option><option value="refund">Refund</option></select></label><label>بینین<select id="gcLedgerLimit"><option value="100">100 دانە</option><option value="300" selected>300 دانە</option><option value="all">هەموو</option></select></label><span class="gc-tool-count" id="gcLedgerCount"></span>`;
    const exportBtn = button('↓ Export ledger', () => { const rows = $$('tbody tr', table).filter(r => r.style.display !== 'none').map(r => $$('td', r).map(c => c.textContent.trim())); download('globall-finance-ledger.csv', csv([$$('th', table).map(x => x.textContent.trim()), ...rows])); });
    tools.appendChild(exportBtn); toolbar.after(tools);
    const type = $('#gcLedgerType'); const limit = $('#gcLedgerLimit');
    const apply = () => { const q = String(search.value || '').toLowerCase(); const kind = String(type.value || '').toLowerCase(); const max = limit.value === 'all' ? Infinity : Number(limit.value); let seen = 0, visible = 0; $$('tbody tr', table).forEach(row => { const text = row.textContent.toLowerCase(); const match = (!q || text.includes(q)) && (!kind || text.includes(kind)); const show = match && seen < max; if (match) seen++; row.style.display = show ? '' : 'none'; if (show) visible++; }); const count = $('#gcLedgerCount'); if (count) count.textContent = `${visible} transaction · filtered view`; };
    search.addEventListener('input', apply); type.addEventListener('change', apply); limit.addEventListener('change', apply); apply();
  }

  function enhance() {
    const view = $('#view'); if (!view) return;
    addAdminShortcuts(view);
    const heading = $('.section-head h1', view)?.textContent || '';
    if (/کۆگا|Warehouse/i.test(heading)) addWarehouseTools(view);
    if (/دارایی|Finance/i.test(heading)) addFinanceTools(view);
  }
  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  const boot = () => { const view = $('#view'); if (view) observer.observe(view, {childList:true,subtree:true}); enhance(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
