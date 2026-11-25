(() => {
  'use strict';
  if (window.__gcDataHealthPanelV2) return;
  window.__gcDataHealthPanelV2 = true;

  const ENDPOINT = 'https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/staff-data-health';
  const KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const number = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  let loading = false;
  let lastDashboard = null;

  const addStyles = () => {
    if (document.getElementById('gc-action-center-inline-style')) return;
    const style = document.createElement('style');
    style.id = 'gc-action-center-inline-style';
    style.textContent = [
      '.gc-action-center{margin-top:12px;border:1px solid rgba(31,143,164,.2);background:linear-gradient(145deg,rgba(9,36,55,.035),rgba(7,130,145,.045));border-radius:18px;padding:16px;min-width:0}',
      '.gc-action-center-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}',
      '.gc-action-center-kicker{font:800 10px/1.5 "JetBrains Mono",monospace;letter-spacing:1.3px;color:var(--cyan,#07899a)}',
      '.gc-action-center-title{font-size:19px;font-weight:900;margin:3px 0 2px;color:var(--text,#102a3a)}',
      '.gc-action-center-sub{font-size:12px;color:var(--muted,#697d8b);line-height:1.7}',
      '.gc-action-center-live{white-space:nowrap;border:1px solid rgba(13,148,136,.25);background:rgba(13,148,136,.08);color:#0b827a;border-radius:99px;padding:5px 9px;font:800 10px "JetBrains Mono",monospace}',
      '.gc-action-center-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}',
      '.gc-action-metric{min-width:0;padding:12px;border-radius:13px;border:1px solid var(--line,rgba(40,70,90,.12));background:var(--surface,#fff)}',
      '.gc-action-metric span{display:block;color:var(--muted,#697d8b);font-size:11px;line-height:1.5}',
      '.gc-action-metric strong{display:block;font-size:24px;line-height:1.3;margin:5px 0 2px;font-variant-numeric:tabular-nums;color:var(--text,#102a3a)}',
      '.gc-action-metric small{display:block;color:var(--muted,#697d8b);font-size:10px;line-height:1.5}',
      '.gc-action-metric[data-tone="warning"] strong{color:#b7791f}',
      '.gc-action-metric[data-tone="danger"] strong{color:#c2414c}',
      '.gc-action-center-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:13px;padding-top:11px;border-top:1px solid var(--line,rgba(40,70,90,.12))}',
      '.gc-action-center-note{font-size:11px;line-height:1.7;color:var(--muted,#697d8b);max-width:620px}',
      '.gc-action-center-actions{display:flex;gap:7px;flex-wrap:wrap}',
      '.gc-action-center-actions button,.gc-action-center-refresh{min-height:36px;border-radius:10px;border:1px solid var(--line,rgba(40,70,90,.16));background:var(--surface,#fff);color:var(--text,#102a3a);padding:7px 11px;font:800 11px Vazirmatn,system-ui,sans-serif;cursor:pointer}',
      '.gc-action-center-actions button:hover,.gc-action-center-refresh:hover{border-color:var(--cyan,#07899a)}',
      '.gc-action-center-refresh{flex:0 0 auto}',
      '@media(max-width:760px){.gc-action-center{padding:13px}.gc-action-center-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gc-action-center-title{font-size:17px}.gc-action-center-metric strong{font-size:21px}}',
      '@media(max-width:390px){.gc-action-center-grid{gap:7px}.gc-action-metric{padding:10px}.gc-action-metric strong{font-size:21px}.gc-action-center-head{align-items:center}}'
    ].join('');
    document.head.appendChild(style);
  };

  const gotoTab = (tab) => {
    const button = document.querySelector(
      'body.gc-staff-os-shell #app .gc-side .nav-btn[data-tab="' + tab + '"]'
    );
    if (button) button.click();
  };

  const metric = (label, value, detail, tone) =>
    '<div class="gc-action-metric" data-tone="' + esc(tone || 'normal') + '">' +
      '<span>' + esc(label) + '</span><strong>' + number(value) + '</strong>' +
      '<small>' + esc(detail || '') + '</small></div>';

  async function render(force) {
    const view = document.getElementById('view');
    const title = document.getElementById('pageTitle');
    if (!view || !title || !/داشبۆرد/.test(title.textContent || '')) return;
    if (loading || (!force && view.querySelector('[data-gc-action-center]'))) return;

    const session = (await window.gcSupabase?.auth?.getSession?.())?.data?.session;
    if (!session?.access_token) return;
    loading = true;

    try {
      const response = await fetch(ENDPOINT, {
        headers: { Authorization: 'Bearer ' + session.access_token, apikey: KEY },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.quality || !data.workflow) {
        throw new Error(data.error || 'نەتوانرا دۆخی سیستەم بخوێندرێتەوە.');
      }

      const q = data.quality;
      const w = data.workflow;
      const failedByChannel = w.notifications_failed_by_channel || {};
      const pending = Number(w.excel_review_pending || 0);
      const failed = Number(w.notifications_failed || 0);
      const held = Number(w.shipments_on_hold || 0);
      const qualityIssues = Number(q.missing_gc || 0) +
        Number(q.missing_mode || 0) +
        Number(q.missing_operational_status || 0) +
        Number(q.missing_timeline || 0) +
        Number(q.stale_72h || 0);
      const needsAttention = pending + failed + held + qualityIssues;
      const card = document.createElement('section');
      card.className = 'gc-action-center';
      card.setAttribute('data-gc-action-center', '1');
      card.innerHTML =
        '<div class="gc-action-center-head">' +
          '<div><div class="gc-action-center-kicker">GLOBALL CLOUD · OPERATIONS INTELLIGENCE</div>' +
          '<h3 class="gc-action-center-title">ناوەندی کردارە پێویستەکان</h3>' +
          '<div class="gc-action-center-sub">کورتەی دۆخی بار، پشکنینی Excel و ئاگادارکردنەوەکان لە live backend</div></div>' +
          '<span class="gc-action-center-live">' + (needsAttention ? 'REVIEW NEEDED' : 'LIVE · READY') + '</span>' +
          '<button type="button" class="gc-action-center-refresh" data-gc-action-refresh>نوێکردنەوە ↻</button>' +
        '</div>' +
        '<div class="gc-action-center-grid">' +
          metric('ڕیزی Excel بۆ پشکنین', pending, 'Unreviewed + mapping', pending ? 'warning' : 'normal') +
          metric('ئاگادارکردنەوەی سەرنەکەوتوو', failed, 'Email ' + number(failedByChannel.email) + ' · WhatsApp ' + number(failedByChannel.whatsapp) + ' · SMS ' + number(failedByChannel.sms), failed ? 'danger' : 'normal') +
          metric('بار لەسەر ڕاگرتن', held, 'On hold · بە پێداچوونەوەی ستاف', held ? 'warning' : 'normal') +
          metric('بارە کۆنەکان', q.stale_72h, 'بێ نوێکردنەوە زیاتر لە ٧٢ کاتژمێر', q.stale_72h ? 'warning' : 'normal') +
          metric('بێ GC Code', q.missing_gc, 'بارە پێویستەکان بەستربدرێن', q.missing_gc ? 'warning' : 'normal') +
          metric('بێ شێوازی گواستنەوە', q.missing_mode, 'Air · Sea · Land', q.missing_mode ? 'warning' : 'normal') +
          metric('بێ Timeline', q.missing_timeline, 'پێویستی بە تۆماری ڕووداو هەیە', q.missing_timeline ? 'warning' : 'normal') +
          metric('ئەرکی کراوە', q.tasks_open, 'کارە تەواونەکراوەکان', q.tasks_open ? 'normal' : 'normal') +
        '</div>' +
        '<div class="gc-action-center-foot">' +
          '<div class="gc-action-center-note">داتاکان تەنها بۆ پشاندانی دۆخە. هیچ batch ـێک پەسەند ناکرێت و هیچ Email/WhatsApp/SMS ـێک لەم پانێڵەوە نانێردرێت. پێش هەر کردارێک پشکنینی دەستی پێویستە.</div>' +
          '<div class="gc-action-center-actions">' +
            (pending ? '<button type="button" data-gc-action-tab="excel-review">پشکنینی Excel (' + number(pending) + ')</button>' : '') +
            (held || q.stale_72h || q.missing_timeline ? '<button type="button" data-gc-action-tab="shipments">پشکنینی بارەکان</button>' : '') +
            (q.tasks_open ? '<button type="button" data-gc-action-tab="alerts">ئاگاداری و ئەرک</button>' : '') +
          '</div>' +
        '</div>';
      view.querySelector('[data-gc-action-center]')?.remove();
      view.appendChild(card);
      lastDashboard = data.generated_at || null;
      card.querySelector('[data-gc-action-refresh]')?.addEventListener('click', () => {
        card.remove();
        void render(true);
      });
      card.querySelectorAll('[data-gc-action-tab]').forEach((button) => {
        button.addEventListener('click', () => gotoTab(button.getAttribute('data-gc-action-tab')));
      });
    } catch (error) {
      console.warn('[Globall Cloud] action center unavailable:', error?.message || error);
    } finally {
      loading = false;
    }
  }

  addStyles();
  const observer = new MutationObserver(() => {
    const view = document.getElementById('view');
    if (!view || !document.getElementById('pageTitle')) return;
    if (/داشبۆرد/.test(document.getElementById('pageTitle').textContent || '') &&
        !view.querySelector('[data-gc-action-center]')) void render(false);
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void render(false);
  });
  setTimeout(() => void render(false), 1600);
  setInterval(() => void render(false), 30000);
})();