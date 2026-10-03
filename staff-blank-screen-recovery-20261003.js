/* Globall Cloud Staff OS — blank-screen recovery bridge, 2026-10-03 */
(() => {
  'use strict';
  if (!/\/staff(?:-os(?:-v5)?|)(?:\.html)?\/?$/i.test(location.pathname)) return;
  let recovering = false;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loginHtml = () => `<main class="login gc-recovered-login" dir="rtl"><section class="login-card"><div class="login-title"><div class="brand-logo">GC</div><div><b>Globall Cloud</b><div class="eyebrow">SECURE STAFF ACCESS</div></div></div><h1>Staff Command Center</h1><p>چوونەژوورەوە بۆ سیستەمی کارگێڕی و عملیات.</p><form id="loginForm" style="margin-top:16px"><div class="form-field"><label>ئیمەیل</label><input class="field" id="loginEmail" name="email" type="email" autocomplete="username" required placeholder="staff@example.com"></div><div class="form-field" style="margin-top:9px"><label>وشەی نهێنی</label><input class="field" id="loginPassword" name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div><div class="login-msg" id="loginMsg"></div><button class="btn primary" id="loginBtn" type="submit">چوونەژوورەوە</button></form><div class="recovery-note">Staff OS recovery shell · هیچ داتایەک لەدەست نەدراوە.</div></section></main>`;
  const ensureStyles = () => {
    if (document.getElementById('gc-blank-recovery-style')) return;
    const style = document.createElement('style'); style.id = 'gc-blank-recovery-style';
    style.textContent = '.gc-recovered-login{min-height:100dvh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 0%,rgba(59,130,246,.18),transparent 45%),#030b16;color:#f8fafc;font-family:Vazirmatn,Noto Sans Arabic,system-ui,sans-serif}.gc-recovered-login .login-card{width:min(460px,100%);padding:28px;border:1px solid rgba(96,165,250,.32);border-radius:22px;background:rgba(8,24,44,.96);box-shadow:0 24px 80px rgba(0,0,0,.45)}.gc-recovered-login .field{width:100%;min-height:46px}.recovery-note{margin-top:14px;color:#8aa3bd;font-size:11px;text-align:center}';
    (document.head || document.documentElement).appendChild(style);
  };
  const installLoginFallback = () => {
    const form = document.getElementById('loginForm'); if (!form || form.dataset.gcRecoveryBound === '1') return;
    form.dataset.gcRecoveryBound = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = document.getElementById('loginBtn'), msg = document.getElementById('loginMsg');
      if (!button || !msg) return;
      button.disabled = true; msg.textContent = '';
      try {
        const supa = window.gcSupabase || (window.supabase?.createClient && window.supabase.createClient('https://ahslifnthiwfkmaswjno.supabase.co','sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
        if (!supa) throw new Error('پەیوەندیی Supabase ئامادە نییە.');
        window.gcSupabase = supa;
        const {error} = await supa.auth.signInWithPassword({email:document.getElementById('loginEmail').value.trim(),password:document.getElementById('loginPassword').value});
        if (error) throw error;
        location.reload();
      } catch (error) { msg.textContent = esc(error?.message || 'Login سەرکەوتوو نەبوو'); button.disabled = false; }
    }, {capture:true});
  };
  const recover = () => {
    if (recovering || document.body) return;
    recovering = true;
    const root = document.documentElement;
    while (root.firstChild) root.removeChild(root.firstChild);
    const head = document.createElement('head'); const body = document.createElement('body');
    root.append(head, body); root.lang = 'ckb'; root.dir = 'rtl'; root.dataset.gcBlankRecovery = 'active';
    const meta = document.createElement('meta'); meta.name='viewport'; meta.content='width=device-width,initial-scale=1,viewport-fit=cover'; head.appendChild(meta);
    body.innerHTML = `<div id="app">${loginHtml()}</div>`;
    ensureStyles(); installLoginFallback();
    const script = document.createElement('script'); script.src = `/staff-os-v5.js?recovery=${Date.now()}`; script.defer = false; body.appendChild(script);
  };
  const check = () => { if (!document.body) recover(); else { ensureStyles(); installLoginFallback(); } };
  new MutationObserver(check).observe(document.documentElement, {childList:true,subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check, {once:true}); else check();
})();
