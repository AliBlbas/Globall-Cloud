/* Globall Cloud — shared customer/staff account bridge.
 * Uses the existing account-admin Edge Function; it never writes directly to tables.
 */
(() => {
  'use strict';
  if (window.__gcStaffCustomerBridge20261019) return;
  window.__gcStaffCustomerBridge20261019 = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const ACCOUNT_API = SUPABASE_URL + '/functions/v1/account-admin';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const normalizeGC = (value) => String(value || '').normalize('NFKC').toUpperCase()
    .replace(/[–—−]/g, '-').replace(/\s+/g, '');
  const toast = (message, kind) => {
    const existing = document.getElementById('gcToast');
    if (existing) {
      existing.textContent = message;
      existing.dataset.kind = kind || 'ok';
      existing.classList.add('is-visible');
      if (existing._timer) clearTimeout(existing._timer);
      existing._timer = setTimeout(() => existing.remove(), 3600);
      return;
    }
    const item = document.createElement('div');
    item.id = 'gcToast';
    item.className = 'toast';
    item.dataset.kind = kind || 'ok';
    item.textContent = message;
    document.body.appendChild(item);
    item._timer = setTimeout(() => item.remove(), 3600);
  };

  function removeModal() {
    const modal = document.getElementById('gcModal');
    if (modal) modal.remove();
  }

  function showModal(title, bodyHTML, footerHTML) {
    removeModal();
    const shell = document.createElement('div');
    shell.id = 'gcModal';
    shell.className = 'modal-backdrop gc-customer-bind-backdrop';
    shell.setAttribute('role', 'presentation');
    shell.innerHTML =
      '<section class="modal gc-customer-bind-modal" role="dialog" aria-modal="true" aria-labelledby="gcCustomerBindTitle" dir="rtl">' +
        '<header class="modal-head"><div><div class="eyebrow">CUSTOMER WORKSPACE · SHARED ACCOUNT</div><h2 id="gcCustomerBindTitle">' + esc(title) + '</h2></div>' +
        '<button type="button" class="btn gc-bind-close" data-gc-bind-close aria-label="داخستن">×</button></header>' +
        '<div class="modal-body gc-customer-bind-body">' + bodyHTML + '</div>' +
        '<footer class="modal-foot gc-customer-bind-footer">' + (footerHTML || '') + '</footer>' +
      '</section>';
    shell.addEventListener('click', (event) => {
      if (event.target === shell || event.target.closest('[data-gc-bind-close]')) removeModal();
    });
    document.body.appendChild(shell);
    const first = $('input:not([type="checkbox"]),button', shell);
    if (first) setTimeout(() => first.focus(), 20);
    return shell;
  }

  function getCustomerFromRow(button) {
    const row = button.closest('tr');
    if (!row) return null;
    const codeCell = $('[data-label="GC"]', row);
    const name = $('.customer-name b', row);
    const email = $('.customer-name small', row);
    const phoneCell = $('[data-label="پەیوەندی"]', row);
    return {
      id: button.getAttribute('data-customer-bind') || '',
      code: (codeCell && codeCell.textContent || '').trim(),
      name: (name && name.textContent || '').trim(),
      email: (email && email.textContent || '').trim(),
      phone: (phoneCell && phoneCell.textContent || '').trim()
    };
  }

  async function getSession() {
    const client = window.gcSupabase || window.sb;
    if (!client || !client.auth) throw new Error('پەیوەندیی Supabaseی ستاف ئامادە نییە؛ دووبارە چوونەژوورەوە بکە.');
    const result = await client.auth.getSession();
    if (result.error) throw result.error;
    const session = result.data && result.data.session;
    if (!session || !session.access_token) throw new Error('Session ـی ستاف بەسەرچووە؛ دووبارە login بکە.');
    return session;
  }

  async function accountRequest(session, data) {
    const response = await fetch(ACCOUNT_API, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + session.access_token,
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ kind: 'customer', action: 'bind', data }),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || ('هەڵەی پەیوەستکردنی هەژمار · HTTP ' + response.status));
    return payload;
  }

  function renderSuccess(customer, result) {
    const code = result.gc_code || customer.code;
    const password = result.temporary_password || '';
    const modal = showModal('کونسۆڵی کڕیار پەیوەست کرا',
      '<div class="gc-customer-link-success">' +
        '<div class="gc-customer-link-success-mark" aria-hidden="true">✓</div>' +
        '<p class="gc-customer-link-success-lead">هەژماری کڕیار ئێستا بە داتای Globall Cloud پەیوەستە. بارەکان و ئاگادارکردنەوەکان بە پێی GC Code و پەیوەندییە پارێزراوەکان دەرکەون.</p>' +
        '<div class="gc-customer-link-credential"><span>GC Code · ناسنامەی چوونەژوورەوە</span><code id="gcCustomerLinkCode" dir="ltr">' + esc(code) + '</code><button class="btn" type="button" id="gcCopyLinkCode">کۆپی کۆد</button></div>' +
        '<div class="gc-customer-link-credential"><span>وشەی نهێنیی کاتی/نوێ</span><code id="gcCustomerLinkPassword" dir="ltr">' + esc(password) + '</code><button class="btn" type="button" id="gcCopyLinkPassword">کۆپی وشەی نهێنی</button></div>' +
        '<div class="gc-customer-link-metrics"><div><span>پەیوەندیی بارە پێشووەکان</span><strong>' + Number(result.shipment_links_updated || 0) + '</strong></div><div><span>ئاگادارکردنەوەی وەرگرتنی کۆگا</span><strong>' + Number(result.receipt_notifications_queued || 0) + '</strong></div></div>' +
        (result.warning ? '<p class="gc-customer-link-warning" role="alert">پەیوەندیی هەندێک بار پێویستی بە پشکنینی زیاتر هەیە؛ هەموو بارەکان بە تەواوی پشکنە.</p>' : '') +
        (result.receipt_notification_warning ? '<p class="gc-customer-link-warning" role="alert">ئاگادارکردنەوەی وەرگرتنی پێشوو: ' + esc(result.receipt_notification_warning) + '</p>' : '') +
        '<p class="gc-customer-link-security">زانیاری چوونەژوورەوە بە شێوەی پارێزراو بگەیەنە بە خاوەنی ئەکاونت. تکایە لە چات یان گروپی گشتی بڵاوی مەکەرەوە.</p>' +
        '<a class="btn primary gc-customer-workspace-link" href="/#auth" target="_blank" rel="noopener noreferrer">کردنەوەی کونسۆڵی کڕیار ↗</a>' +
      '</div>',
      '<button class="btn primary" id="gcRefreshCustomers">تەواو · نوێکردنەوەی لیستی کڕیار</button><button type="button" class="btn" data-gc-bind-close>داخستن</button>');
    const copyText = async (value) => {
      if (!value) throw new Error('هیچ زانیارییەک بۆ کۆپی نییە.');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.readOnly = true;
        field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand('copy');
        field.remove();
        if (!ok) throw new Error('کۆپی خۆکار بەردەست نییە.');
      }
    };
    $('#gcCopyLinkCode', modal).addEventListener('click', async () => {
      try { await copyText(code); toast('GC Code کۆپی کرا.'); }
      catch (error) { toast(error.message || 'کۆپی سەرکەوتوو نەبوو.', 'bad'); }
    });
    $('#gcCopyLinkPassword', modal).addEventListener('click', async () => {
      try { await copyText(password); toast('وشەی نهێنی کۆپی کرا.'); }
      catch (error) { toast(error.message || 'کۆپی سەرکەوتوو نەبوو.', 'bad'); }
    });
    $('#gcRefreshCustomers', modal).addEventListener('click', () => window.location.reload());
  }

  function openBindForm(customer) {
    if (!customer.id || !/^GC-[A-Z0-9-]{2,30}$/.test(normalizeGC(customer.code))) {
      toast('ناسنامەی GCی ئەم تۆمارە دروست نییە؛ تکایە پێش بەستنی هەژمار چاکی بکە.', 'bad');
      return;
    }
    const safeCode = normalizeGC(customer.code);
    const modal = showModal('یەکخستنی هەژماری کڕیار',
      '<div class="gc-customer-bind-intro">ئەم کردارە هەژماری چوونەژوورەوەی GC بە کونسۆڵی کڕیارەوە دەبەستێتەوە؛ کونسۆڵی ستاف و کڕیار داتای هاوبەش بەکاردەهێنن.</div>' +
      '<section class="gc-customer-bind-identity">' +
        '<div><span>GC Code</span><strong dir="ltr">' + esc(safeCode) + '</strong></div>' +
        '<div><span>ناوی کڕیار</span><strong>' + esc(customer.name || '—') + '</strong></div>' +
        '<div><span>ئیمەیل</span><strong>' + esc(customer.email || 'تۆمار نەکراوە') + '</strong></div>' +
        '<div><span>مۆبایل</span><strong dir="ltr">' + esc(customer.phone || 'تۆمار نەکراوە') + '</strong></div>' +
      '</section>' +
      '<form class="gc-customer-bind-form" id="gcCustomerBindForm">' +
        '<label class="gc-customer-bind-field">پشتڕاستکردنەوەی کۆدی GC' +
          '<input class="field" name="confirmed_gc_code" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" required placeholder="هەمان کۆدی سەرەوە بنووسە">' +
        '</label>' +
        '<label class="gc-customer-bind-field">وشەی نهێنیی کڕیار (ئارەزوومەندانە)' +
          '<input class="field" name="password" type="password" minlength="12" autocomplete="new-password" placeholder="بەتاڵ بهێڵەوە بۆ دروستکردنی کاتی">' +
          '<small>ئەگەر وشەی نهێنی دیاری نەکەیت، سیستەم وشەی نهێنیی کاتیی بەهێز دروست دەکات.</small>' +
        '</label>' +
        '<label class="gc-customer-bind-verification"><input type="checkbox" name="identity_verified" required><span>پشتڕاستم کردووەتەوە ئەم تۆمارە بە خاوەنی ئەم GC Code ـەوە دەگونجێت؛ هەژمارەکە بە هەڵە بە کەسێکی ترەوە نابەستم.</span></label>' +
        '<p class="gc-customer-bind-warning">گرنگ: وشەی نهێنی بۆ خاوەنە ڕاستەقینەکە بگەیەنە. بە تەنها زانینی GC Code بەڵگەی خاوەندارێتی نییە.</p>' +
        '<div class="gc-customer-bind-error" id="gcCustomerBindError" role="alert" hidden></div>' +
      '</form>',
      '<button type="button" class="btn" data-gc-bind-close>هەڵوەشاندنەوە</button><button type="submit" form="gcCustomerBindForm" class="btn primary" id="gcCustomerBindSubmit">پەیوەستکردنی هەژمار</button>');
    const form = $('#gcCustomerBindForm', modal);
    const submit = $('#gcCustomerBindSubmit', modal);
    const errorBox = $('#gcCustomerBindError', modal);
    const codeField = $('input[name="confirmed_gc_code"]', form);
    codeField.addEventListener('input', () => {
      codeField.value = codeField.value.toUpperCase().replace(/[–—−]/g, '-');
      codeField.setCustomValidity(normalizeGC(codeField.value) === safeCode ? '' : 'کۆدی GC دەبێت وەک کۆدی سەرەوە بێت.');
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      errorBox.textContent = '';
      const data = new FormData(form);
      const confirmedCode = normalizeGC(data.get('confirmed_gc_code'));
      const password = String(data.get('password') || '').trim();
      if (confirmedCode !== safeCode) {
        errorBox.textContent = 'کۆدی GC یەکسان نییە؛ هیچ هەژمارێک نەبەسترا.';
        errorBox.hidden = false;
        codeField.focus();
        return;
      }
      if (!data.get('identity_verified')) {
        errorBox.textContent = 'پێویستە پشتڕاستکردنەوەی ناسنامە بکەیت.';
        errorBox.hidden = false;
        return;
      }
      if (password && password.length < 12) {
        errorBox.textContent = 'وشەی نهێنی دەبێت لانیکەم ١٢ پیت بێت.';
        errorBox.hidden = false;
        return;
      }
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'پەیوەستکردن و پشکنین…';
      try {
        const session = await getSession();
        const result = await accountRequest(session, {
          id: customer.id,
          identity_verified: true,
          confirmed_gc_code: confirmedCode,
          ...(password ? { password } : {})
        });
        if (!result || result.ok !== true || !result.temporary_password || !result.gc_code) {
          throw new Error(result && result.error || 'دروستکردنی هەژمار پشتڕاست نەکرایەوە.');
        }
        renderSuccess(customer, result);
      } catch (error) {
        errorBox.textContent = error && error.message || 'پەیوەستکردنی هەژمار سەرکەوتوو نەبوو.';
        errorBox.hidden = false;
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = 'پەیوەستکردنی هەژمار';
      }
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('[data-customer-bind]') : null;
    if (!button || !document.body.classList.contains('gc-staff-os-shell')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const customer = getCustomerFromRow(button);
    if (!customer) {
      toast('تۆماری کڕیار نەدۆزرایەوە؛ دووبارە هەوڵ بدە.', 'bad');
      return;
    }
    openBindForm(customer);
  }, true);
})();