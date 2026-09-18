/* Globall Cloud — production branding repair + platform boot + device UX */
(() => {
  'use strict';
  const FALLBACKS = ['/logo-icon.svg', '/logo-icon-original.png'];
  const repaired = new WeakSet();
  const isOperational = () => /^\/(staff(?:-os)?|warehouse(?:-os)?|superadmin|super-admin-command-center|operations(?:-[a-z0-9-]+)?|accounts-console|management)(?:\.html)?\/?$/i.test(location.pathname);
  const isLogo = (img) => {
    const src = String(img.getAttribute('src') || '').toLowerCase();
    const alt = String(img.getAttribute('alt') || '').toLowerCase();
    const cls = String(img.className || '').toLowerCase();
    return src.includes('logo') || alt.includes('globall cloud') || cls.includes('brand-logo') || cls === 'logo' || cls.includes(' logo');
  };
  const repair = (img) => {
    if (!img || repaired.has(img) || !isLogo(img)) return;
    repaired.add(img);
    let index = 0;
    const next = () => {
      if (index >= FALLBACKS.length) return;
      const candidate = FALLBACKS[index++];
      if (img.src.endsWith(candidate)) return;
      img.onerror = next;
      img.removeAttribute('srcset');
      img.src = candidate;
    };
    if (img.complete && img.naturalWidth === 0) next();
    else img.addEventListener('error', next, { once: true });
  };
  const loadAsset = (item) => {
    if (document.querySelector(`[${item.attr}]`)) return;
    const node = document.createElement(item.tag);
    if (item.rel) node.rel = item.rel;
    if (item.href) node.href = item.href;
    if (item.src) { node.src = item.src; node.defer = true; }
    node.setAttribute(item.attr, '1');
    document.head.appendChild(node);
  };

  const installGloballAssist = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (path !== '' && path !== '/index.html' && path !== '/') return;
    if (document.getElementById('gcAssistRoot')) return;

    const style = document.createElement('style');
    style.dataset.gcAssistantStyle = '1';
    style.textContent = `
      #gcAssistRoot{font-family:Inter,"Noto Sans Arabic",Vazirmatn,system-ui,sans-serif}
      #gcAssistButton{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));z-index:10150;width:58px;height:58px;border:1px solid rgba(142,232,244,.28);border-radius:18px;background:linear-gradient(145deg,#0b2947,#07111f);color:#9ff6ff;box-shadow:0 18px 45px rgba(1,7,18,.4),0 0 0 1px rgba(34,211,238,.04) inset;display:grid;place-items:center;cursor:pointer;font-size:23px;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
      #gcAssistButton:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.5);box-shadow:0 22px 54px rgba(1,7,18,.48),0 0 26px rgba(34,211,238,.12)}
      #gcAssistButton:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}
      #gcAssistButton span{font-size:24px;line-height:1}
      #gcAssistPanel{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(88px + env(safe-area-inset-bottom));z-index:10149;width:min(390px,calc(100vw - 32px));max-height:min(72dvh,640px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(142,232,244,.18);border-radius:24px;background:linear-gradient(150deg,rgba(11,31,53,.98),rgba(4,14,27,.985));box-shadow:0 34px 120px rgba(1,7,18,.55),inset 0 1px 0 rgba(255,255,255,.04);opacity:1;transform:translateY(0) scale(1);transition:opacity .18s ease,transform .18s ease}
      #gcAssistPanel[hidden]{display:none}
      .gc-assist-head{display:flex;align-items:center;gap:11px;padding:14px 15px;border-bottom:1px solid rgba(142,232,244,.09)}
      .gc-assist-logo{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#13395e,#092138);color:#86f4ff;border:1px solid rgba(34,211,238,.15);font-weight:900}
      .gc-assist-title{min-width:0;flex:1}
      .gc-assist-title b{display:block;color:#f2fbff;font-size:13px}
      .gc-assist-title span{display:block;margin-top:2px;color:#6f8da8;font-size:10px}
      .gc-assist-close{width:34px;height:34px;border-radius:10px;border:1px solid rgba(142,232,244,.08);background:rgba(255,255,255,.03);color:#9bb1c4;cursor:pointer}
      .gc-assist-body{padding:14px;overflow:auto}
      .gc-assist-welcome{padding:12px 13px;border:1px solid rgba(142,232,244,.08);border-radius:15px;background:rgba(255,255,255,.025);color:#d6e8f6;font-size:12px;line-height:1.8}
      .gc-assist-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
      .gc-assist-quick button{min-height:54px;text-align:start;padding:10px 11px;border:1px solid rgba(142,232,244,.08);border-radius:13px;background:rgba(255,255,255,.025);color:#d9edf9;cursor:pointer}
      .gc-assist-quick button:hover{border-color:rgba(34,211,238,.26);background:rgba(34,211,238,.055)}
      .gc-assist-quick strong{display:block;font-size:11px}.gc-assist-quick span{display:block;margin-top:3px;color:#718ba4;font-size:9px;line-height:1.45}
      .gc-assist-msgs{display:grid;gap:8px;margin-top:12px}
      .gc-assist-msg{padding:10px 11px;border-radius:13px;font-size:11px;line-height:1.7;white-space:pre-wrap}
      .gc-assist-msg.user{background:rgba(37,99,235,.13);border:1px solid rgba(37,99,235,.2);color:#deebff;margin-inline-start:22px}
      .gc-assist-msg.bot{background:rgba(34,211,238,.055);border:1px solid rgba(34,211,238,.11);color:#d8f4fb;margin-inline-end:22px}
      .gc-assist-links{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px}
      .gc-assist-links a{display:inline-flex;align-items:center;min-height:34px;padding:7px 10px;border-radius:10px;text-decoration:none;font-size:10px;font-weight:800;border:1px solid rgba(34,211,238,.14);background:rgba(34,211,238,.06);color:#91eff7}
      .gc-assist-form{display:flex;gap:7px;margin-top:12px;position:sticky;bottom:0;padding-top:8px;background:linear-gradient(180deg,transparent,#07111f 35%)}
      .gc-assist-form input{min-width:0;flex:1;height:44px;padding:0 12px;border:1px solid rgba(142,232,244,.11);border-radius:12px;background:rgba(255,255,255,.035);color:#f4fbff;outline:none;font-size:12px}
      .gc-assist-form input::placeholder{color:#607a92}
      .gc-assist-form input:focus{border-color:rgba(34,211,238,.35);box-shadow:0 0 0 3px rgba(34,211,238,.06)}
      .gc-assist-form button{width:46px;height:44px;border:0;border-radius:12px;background:linear-gradient(135deg,#2563eb,#22d3ee);color:#fff;font-weight:900;cursor:pointer}
      .gc-assist-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-top:1px solid rgba(142,232,244,.08);color:#607b95;font-size:9px}
      .gc-assist-footer a{color:#89eaf2;text-decoration:none;font-weight:800}
      @media(max-width:520px){#gcAssistButton{width:52px;height:52px;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));border-radius:16px}#gcAssistPanel{right:10px;bottom:calc(84px + env(safe-area-inset-bottom));width:calc(100vw - 20px);max-height:74dvh;border-radius:20px}.gc-assist-quick{grid-template-columns:1fr}.gc-assist-msg.user{margin-inline-start:10px}.gc-assist-msg.bot{margin-inline-end:10px}}
      @media(prefers-reduced-motion:reduce){#gcAssistButton,#gcAssistPanel{transition:none}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'gcAssistRoot';
    root.innerHTML = `
      <button id="gcAssistButton" type="button" aria-expanded="false" aria-controls="gcAssistPanel" aria-label="Globall Cloud Assist"><span>✦</span></button>
      <section id="gcAssistPanel" role="dialog" aria-modal="false" aria-labelledby="gcAssistTitle" hidden>
        <header class="gc-assist-head">
          <div class="gc-assist-logo">GC</div>
          <div class="gc-assist-title"><b id="gcAssistTitle">Globall Cloud Assist</b><span>یاریدەدەری لۆجستیکی</span></div>
          <button class="gc-assist-close" type="button" data-assist-close aria-label="داخستن">×</button>
        </header>
        <div class="gc-assist-body">
          <div class="gc-assist-welcome">سڵاو 👋<br>چۆن بتوانم ڕێنماییت بکەم؟ دەتوانیت لە Tracking، نرخ، ڕێگای Air/Sea/Land، گومرگ و خزمەتگوزارییەکان دەست پێبکەیت.</div>
          <div class="gc-assist-quick">
            <button type="button" data-assist="track"><strong>📦 شوێنکەوتنی بار</strong><span>بزانە بارەکەت لە کوێیە</span></button>
            <button type="button" data-assist="quote"><strong>⚡ داوای نرخ</strong><span>بڕۆ بۆ هەژمارکردنی نرخ</span></button>
            <button type="button" data-assist="route"><strong>✈️ Air · 🚢 Sea · 🚚 Land</strong><span>باشترین شێوازی گواستنەوە</span></button>
            <button type="button" data-assist="customs"><strong>🛃 گومرگ و کۆگا</strong><span>ڕوونکردنەوەی قۆناغەکانی کار</span></button>
          </div>
          <div id="gcAssistMessages" class="gc-assist-msgs" aria-live="polite"></div>
          <form class="gc-assist-form" id="gcAssistForm">
            <input id="gcAssistInput" type="text" autocomplete="off" placeholder="پرسیارەکەت بنووسە…" aria-label="پرسیارەکەت">
            <button type="submit" aria-label="ناردن">↑</button>
          </form>
        </div>
        <footer class="gc-assist-footer"><span>ڕێنمایییەکانی site · بەبێ گۆڕینی داتای هەژمار</span><a href="https://wa.me/9647507577137" target="_blank" rel="noopener noreferrer">پەیوەندی بە تیم</a></footer>
      </section>`;
    document.body.appendChild(root);

    const button = root.querySelector('#gcAssistButton');
    const panel = root.querySelector('#gcAssistPanel');
    const close = root.querySelector('[data-assist-close]');
    const input = root.querySelector('#gcAssistInput');
    const messages = root.querySelector('#gcAssistMessages');

    const linksFor = (kind) => {
      if (kind === 'track') return [{ label: 'کردنەوەی Tracking', href: '/track' }];
      if (kind === 'quote') return [{ label: 'داواکردنی نرخ', href: '/request' }];
      if (kind === 'route') return [{ label: 'خزمەتگوزارییەکان', href: '/services' }, { label: 'داواکردنی نرخ', href: '/request' }];
      if (kind === 'customs') return [{ label: 'خزمەتگوزارییەکان', href: '/services' }, { label: 'پەیوەندی', href: '/contact' }];
      return [];
    };

    const addMessage = (text, role = 'bot', links = []) => {
      const box = document.createElement('div');
      box.className = `gc-assist-msg ${role}`;
      box.textContent = text;
      messages.appendChild(box);
      if (links.length) {
        const wrap = document.createElement('div');
        wrap.className = 'gc-assist-links';
        links.forEach(({ label, href }) => {
          const a = document.createElement('a');
          a.href = href;
          a.textContent = label;
          wrap.appendChild(a);
        });
        messages.appendChild(wrap);
      }
      messages.scrollTop = messages.scrollHeight;
    };

    const answer = (raw) => {
      const text = String(raw || '').trim();
      if (!text) return;
      addMessage(text, 'user');
      const q = text.toLowerCase();
      if (/track|شوێن|بارەکەم|بارەکەت|ژمارەی/.test(q)) {
        addMessage('بۆ شوێنکەوتنی بار، ژمارەی Tracking ـەکەت بەکاربهێنە. پەڕەی Tracking دۆخی بار و نوێکارییەکانی نیشان دەدات.', 'bot', linksFor('track'));
        return;
      }
      if (/quote|نرخ|هەژمار|داواکاری|کۆست|بەها/.test(q)) {
        addMessage('بۆ نرخ، زانیارییەکانی سەرچاوە، شوێن، شێوازی گواستنەوە و کێشی بار پڕبکەوە؛ پاشان داواکاریی نرخ بنێرە بۆ pricing flow ـی Globall Cloud.', 'bot', linksFor('quote'));
        return;
      }
      if (/air|sea|land|ئاسمان|دەریا|وشکان|گواستنەوە/.test(q)) {
        addMessage('Air زۆرجار بۆ بارە پەلەکانە، Sea بۆ بارە قورس/کۆکراوەکان، و Land بۆ گواستنەوەی ناوخۆی عێراق. بۆ هەڵبژاردنی ڕێگای گونجاو، نرخ داوا بکە.', 'bot', linksFor('route'));
        return;
      }
      if (/customs|گومرگ|کۆگا|warehouse|بەڵگە/.test(q)) {
        addMessage('قۆناغی گومرگ و کۆگا دەتوانێت وەرگرتن، پشکنین، بەڵگە، clearance و ئامادەکردنی بار بۆ گەیاندنی کۆتایی لەخۆبگرێت.', 'bot', linksFor('customs'));
        return;
      }
      addMessage('لە ئێستادا دەتوانم لە Tracking، داوای نرخ، Air/Sea/Land، گومرگ و خزمەتگوزارییەکان ڕێنماییت بکەم. بۆ پرسیاری تایبەت، پەیوەندی بە تیم بکە.', 'bot', linksFor('customs'));
    };

    const setOpen = (open) => {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) setTimeout(() => input.focus(), 30);
    };

    button.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    root.querySelectorAll('[data-assist]').forEach((el) => el.addEventListener('click', () => answer(el.dataset.assist === 'track' ? 'دەمەوێت بارەکەم شوێنکەوتن بکەم' : el.dataset.assist === 'quote' ? 'دەمەوێت نرخ بزانم' : el.dataset.assist === 'route' ? 'کام ڕێگای Air Sea Land گونجاوە؟' : 'گومرگ و کۆگا چۆن کاردەکات؟')));
    root.querySelector('#gcAssistForm').addEventListener('submit', (event) => { event.preventDefault(); answer(input.value); input.value = ''; });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
  };

  const boot = () => {
    if (location.pathname.startsWith('/api/')) return;
    loadAsset({tag:'link', rel:'stylesheet', href:'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap', attr:'data-gc-font-system'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-platform-vnext.css?v=20260908-1', attr:'data-gc-vnext-css'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-platform-vnext-plus.css?v=20260908-1', attr:'data-gc-vnext-plus-css'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-premium-design-2026.css?v=20260915-3', attr:'data-gc-premium-design-2026'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-live-visual-refresh-2026.css?v=20260915-2', attr:'data-gc-live-visual-refresh'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-mobile-visual-rebuild-2026.css?v=20260918-1', attr:'data-gc-mobile-visual-rebuild'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/mobile-premium-responsive-v2026.css?v=20260908-1', attr:'data-gc-mobile-premium'});
    if (!isOperational()) {
      loadAsset({tag:'link', rel:'stylesheet', href:'/gc-public-mobile-system-v2026.css?v=20260908-1', attr:'data-gc-public-mobile-system'});
      loadAsset({tag:'script', src:'/gc-public-mobile-system-v2026.js?v=20260908-1', attr:'data-gc-public-mobile-system-js'});
    }
    loadAsset({tag:'script', src:'/gc-platform-vnext.js?v=20260908-1', attr:'data-gc-vnext-loader'});
    loadAsset({tag:'script', src:'/gc-platform-vnext-plus.js?v=20260908-1', attr:'data-gc-vnext-plus-loader'});
    loadAsset({tag:'script', src:'/gc-icon-polish-2026.js?v=20260915-2', attr:'data-gc-icon-polish-2026'});
    loadAsset({tag:'link', rel:'stylesheet', href:'/gc-command-nav-polish-2026.css?v=20260915-2', attr:'data-gc-command-nav-polish'});
    loadAsset({tag:'script', src:'/gc-runtime-safety-v2026.js?v=20260908-1', attr:'data-gc-runtime-safety-loader'});
    loadAsset({tag:'script', src:'/public-production-safety.js?v=20260908-1', attr:'data-gc-public-production-safety'});
    if (/^\/staff(?:-os)?(?:\.html)?\/?$/i.test(location.pathname)) {
      loadAsset({tag:'link', rel:'stylesheet', href:'/staff-mobile-command-dock.css?v=20260908-1', attr:'data-gc-staff-mobile-css'});
      loadAsset({tag:'script', src:'/staff-mobile-command-dock.js?v=20260908-1', attr:'data-gc-staff-mobile-js'});
      loadAsset({tag:'link', rel:'stylesheet', href:'/staff-premium-mobile-20260909.css?v=20260911-1', attr:'data-gc-staff-premium-mobile'});
    }
    installGloballAssist();
  };
  const scan = () => { document.querySelectorAll('img').forEach(repair); boot(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once:true}); else scan();
  new MutationObserver((mutations) => {
    let changed = false;
    for (const mutation of mutations) for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('img')) repair(node);
      node.querySelectorAll?.('img').forEach(repair);
      changed = true;
    }
    if (changed) boot();
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
