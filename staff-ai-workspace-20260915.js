(() => {
  'use strict';
  const boot = () => {
    if (document.getElementById('gcStaffAiButton')) return;
    if (!document.querySelector('.gc-shell')) return;

    const button = document.createElement('button');
    button.id = 'gcStaffAiButton';
    button.type = 'button';
    button.setAttribute('aria-label', 'Globall Cloud Staff Intelligence');
    button.innerHTML = 'GC<span>AI</span>';

    const panel = document.createElement('section');
    panel.id = 'gcStaffAiPanel';
    panel.setAttribute('dir', 'rtl');
    panel.innerHTML = `
      <header class="gc-ai-head">
        <div class="gc-ai-brand">
          <div class="gc-ai-mark">GC</div>
          <div><b>Globall Cloud Intelligence</b><span>یاریدەدەری ناوخۆیی بۆ تیمی Staff</span></div>
        </div>
        <button class="gc-ai-close" type="button" aria-label="داخستن">×</button>
      </header>
      <div class="gc-ai-status"><strong>Operational Workspace</strong> · دەتوانێت ڕێنمایی خێرا بدات بۆ بار، کۆگا، گومرک، Tasks و شوێنکەوتن.</div>
      <div class="gc-ai-chips">
        <button class="gc-ai-chip" type="button" data-prompt="بارەکانم پیشان بدە">📦 بارەکان</button>
        <button class="gc-ai-chip" type="button" data-prompt="کۆگای Erbil بپشکنە">🏭 کۆگا</button>
        <button class="gc-ai-chip" type="button" data-prompt="ئەو بارانەی کێشەیان هەیە">⚠️ Exceptions</button>
        <button class="gc-ai-chip" type="button" data-prompt="Tasks ی ئەمڕۆ پیشان بدە">✓ Tasks</button>
        <button class="gc-ai-chip" type="button" data-prompt="گومرکی بارەکان بپشکنە">🛃 گومرک</button>
      </div>
      <div class="gc-ai-messages" aria-live="polite"></div>
      <form class="gc-ai-compose">
        <input autocomplete="off" placeholder="لە Staff چی دەتەوێت بزانیت؟" aria-label="پرسیار" />
        <button class="gc-ai-send" type="submit">ناردن</button>
      </form>
    `;

    document.body.append(button, panel);
    const messages = panel.querySelector('.gc-ai-messages');
    const input = panel.querySelector('input');

    const route = (label, selector, prompt) => `<button class="gc-ai-route" type="button" data-route="${selector}">${label}</button><div>${prompt}</div>`;
    const answer = (q) => {
      const t = String(q || '').trim().toLowerCase();
      if (t.includes('بار') || t.includes('shipment') || t.includes('track')) {
        return route('کردنەوەی بارەکان', '[data-tab="shipments"], .nav-btn[data-tab="shipments"]', 'بۆ پشکنینی بارەکان، لە بەشی بارەکان دەتوانیت status، شێوازی گواستنەوە و وردەکارییەکانی هەر shipment ببینیت.');
      }
      if (t.includes('کۆگا') || t.includes('warehouse')) {
        return route('کردنەوەی کۆگا', '[data-tab="warehouse"], .nav-btn[data-tab="warehouse"]', 'کۆگا بۆ وەرگرتن، scan، movement و پشکنینی stock ـەکان بەکاربهێنە.');
      }
      if (t.includes('گومرک') || t.includes('customs')) return 'گومرک: shipment ـەکانی لە status ی customs ـدا پشکنە و document / hold / release ـیان دابنێ.';
      if (t.includes('task')) return 'Tasks: کارە چالاکەکانت بە priority و deadline ـەکانیان پشکنە، پاشان ئەوەی گرنگترە یەکەم ئەنجام بدە.';
      if (t.includes('کێشە') || t.includes('exception') || t.includes('alert')) return 'Exceptions: ئەو shipment ـانەی on_hold، delay یان کێشەیان هەیە لە alerts و exception workflow ـەکەدا پشکنە.';
      if (t.includes('قیمت') || t.includes('نرخ') || t.includes('quote')) return 'نرخ: quote ـە نوێکان لە workflow ـی Operations بپشکنە و پێش پەسەندکردن mode، weight و destination پشتڕاست بکەوە.';
      if (t.includes('یاریدە') || t.includes('help') || t.includes('چی')) return 'من لە ناو Staff ـدا یارمەتیدەرم بۆ بارەکان، کۆگا، گومرک، Tasks، Exceptions و ڕێڕەوی Operations. پرسیارێک بنووسە یان یەکێک لە دوگمە خێراکان هەڵبژێرە.';
      return 'ئەم پرسیارە پێویستی بە زانیارییەکی وردتر هەیە. ناوی shipment، کۆگا، task یان جۆری workflow ـەکە بنووسە تا ڕێنمایی دروستتر بدەم.';
    };

    const add = (text, own = false) => {
      const el = document.createElement('div');
      el.className = `gc-ai-msg${own ? ' user' : ''}`;
      const small = document.createElement('small');
      small.textContent = own ? 'تۆ' : 'GC INTELLIGENCE';
      el.appendChild(small);
      const body = document.createElement('div');
      body.innerHTML = text;
      el.appendChild(body);
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    };

    const ask = (q) => {
      if (!q) return;
      add(q.replace(/[<>&]/g, ''), true);
      add(answer(q));
    };

    add('بەخێربێیت. من یاریدەدەری ناوخۆیی Globall Cloud ـم. لە Staff دەتوانم ڕێڕەوی کارەکانت خێراتر بکەم.');
    button.addEventListener('click', () => {
      panel.classList.toggle('is-open');
      if (panel.classList.contains('is-open')) setTimeout(() => input.focus(), 80);
    });
    panel.querySelector('.gc-ai-close').addEventListener('click', () => panel.classList.remove('is-open'));
    panel.querySelectorAll('[data-prompt]').forEach((el) => el.addEventListener('click', () => ask(el.dataset.prompt)));
    panel.querySelector('.gc-ai-compose').addEventListener('submit', (e) => { e.preventDefault(); const q = input.value.trim(); input.value = ''; ask(q); });
    panel.addEventListener('click', (e) => {
      const routeButton = e.target.closest('[data-route]');
      if (!routeButton) return;
      const target = document.querySelector(routeButton.dataset.route);
      if (target) target.click(); else window.location.hash = 'shipments';
      panel.classList.remove('is-open');
    });
  };
  const start = () => {
    if (document.querySelector('.gc-shell')) boot();
    if (!document.querySelector('.gc-shell')) setTimeout(start, 350);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();